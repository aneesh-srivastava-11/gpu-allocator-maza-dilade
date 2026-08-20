import { RequestRepository } from '../repositories/request.repository';
import { MachineRepository } from '../repositories/machine.repository';
import { SessionService } from './session.service';
import { RequestStatus, MachineStatus, Role } from '@prisma/client';
import { AuditRepository } from '../repositories/audit.repository';
import { wsManager } from '../ws/manager';

export class RequestService {
  public static async createRequest(studentId: number, machineId: number, reason: string, startTime: Date, endTime: Date) {
    const activeCount = await RequestRepository.countActiveForStudent(studentId);
    if (activeCount >= 1) {
      throw {
        statusCode: 400,
        message: 'Concurrency Limit Exceeded: You already have an active GPU session. Please complete it before requesting another.',
      };
    }

    const queuedCount = await RequestRepository.countQueuedForStudent(studentId);
    if (queuedCount >= 2) {
      throw {
        statusCode: 400,
        message: 'Queue Limit Exceeded: You cannot have more than 2 pending queued requests simultaneously.',
      };
    }

    const machine = await MachineRepository.findById(machineId);
    if (!machine) {
      throw { statusCode: 404, message: 'GPU Machine not found' };
    }

    const isMachineBusy = machine.requests.some((r: any) => ['pending_approval', 'approved', 'active'].includes(r.status));

    if (isMachineBusy) {
      const machineQueuedCount = await RequestRepository.countQueuedForMachine(machineId);
      const req = await RequestRepository.create({
        student: { connect: { id: studentId } },
        machine: { connect: { id: machineId } },
        reason,
        startTime,
        endTime,
        status: RequestStatus.queued,
        queuePosition: machineQueuedCount + 1,
      });

      wsManager.broadcast('QUEUE_UPDATE', {
        machine_id: machineId,
        request_id: req.id,
        queue_position: req.queuePosition,
      });

      return {
        id: req.id,
        status: 'queued',
        queue_position: req.queuePosition,
        message: `GPU is currently busy. You are at position #${req.queuePosition} in line.`,
      };
    } else {
      const req = await RequestRepository.create({
        student: { connect: { id: studentId } },
        machine: { connect: { id: machineId } },
        reason,
        startTime,
        endTime,
        status: RequestStatus.pending_approval,
        queuePosition: 0,
      });

      wsManager.broadcast('NEW_PENDING_REQUEST', {
        machine_id: machineId,
        request_id: req.id,
      });

      return {
        id: req.id,
        status: 'pending_approval',
        queue_position: 0,
        message: 'Request submitted successfully and is pending Lab Incharge approval.',
      };
    }
  }

  public static async getMyRequests(studentId: number) {
    const requests = await RequestRepository.findByStudentId(studentId);
    const now = new Date().getTime();

    return requests.map(r => {
      const startTime = new Date(r.startTime).getTime();
      const endTime = new Date(r.endTime).getTime();
      const totalDuration = endTime - startTime;
      const elapsed = Math.max(0, now - startTime);
      const elapsedPct = totalDuration > 0 ? Math.min(100, Math.round((elapsed / totalDuration) * 100)) : 0;
      const is80PctReached = elapsedPct >= 80;

      return {
        id: r.id,
        gpu_id: r.machineId,
        gpu_name: r.machine?.name,
        gpu_model: r.machine?.model,
        lab_name: r.machine?.lab?.name,
        reason: r.reason,
        start_time: r.startTime,
        end_time: r.endTime,
        status: r.status,
        elapsed_pct: elapsedPct,
        is_80_pct_reached: is80PctReached,
        queue_position: r.queuePosition,
        created_at: r.createdAt,
        session: r.session ? {
          id: r.session.id,
          status: r.session.status,
          started_at: r.session.startedAt,
          flagged_at: r.session.flaggedAt,
          blocked_at: r.session.blockedAt,
          can_request_extension: is80PctReached && ['awaiting_code', 'active'].includes(r.session.status),
        } : null,
      };
    });
  }

  public static async getPendingRequests(currentUser: any) {
    const pending = await RequestRepository.findPendingRequests();
    return pending
      .filter(r => {
        if (currentUser.role === Role.incharge && currentUser.managedLabIds?.length > 0) {
          return currentUser.managedLabIds.includes(r.machine.labId);
        }
        return true;
      })
      .map(r => ({
        id: r.id,
        student_id: r.studentId,
        student_name: r.student.name,
        student_roll: r.student.rollNumber,
        gpu_id: r.machineId,
        gpu_name: r.machine.name,
        lab_name: r.machine.lab.name,
        reason: r.reason,
        start_time: r.startTime,
        end_time: r.endTime,
        created_at: r.createdAt,
      }));
  }

  public static async approveRequest(requestId: number, actorId: number) {
    const req = await RequestRepository.findById(requestId);
    if (!req) throw { statusCode: 404, message: 'Request not found' };

    await RequestRepository.updateStatus(requestId, RequestStatus.active);
    await MachineRepository.updateStatus(req.machineId, MachineStatus.allocated);

    // Create Session with awaiting_code status and generated OTP per PRD §5.3
    const sessionResult = await SessionService.createSessionOnApproval(requestId);

    await AuditRepository.log(
      actorId,
      'APPROVE_REQUEST',
      'REQUEST',
      requestId,
      { student_name: req.student.name, machine_name: req.machine.name }
    );

    wsManager.broadcast('REQUEST_APPROVED', {
      request_id: req.id,
      machine_id: req.machineId,
      session_id: sessionResult.session_id,
      one_time_code: sessionResult.one_time_code,
    });

    return {
      message: 'Request approved and GPU session created. One-time launch code generated.',
      request_id: req.id,
      session_id: sessionResult.session_id,
      one_time_code: sessionResult.one_time_code,
    };
  }

  public static async rejectRequest(requestId: number, actorId: number) {
    const req = await RequestRepository.findById(requestId);
    if (!req) throw { statusCode: 404, message: 'Request not found' };

    await RequestRepository.updateStatus(requestId, RequestStatus.rejected);

    await AuditRepository.log(
      actorId,
      'REJECT_REQUEST',
      'REQUEST',
      requestId,
      { student_name: req.student.name }
    );

    await this.promoteNextQueued(req.machineId);

    return { message: 'Request rejected successfully.' };
  }

  public static async promoteNextQueued(machineId: number) {
    const nextReq = await RequestRepository.findNextQueued(machineId);
    if (nextReq) {
      await RequestRepository.updateStatus(nextReq.id, RequestStatus.pending_approval, 0);
      await RequestRepository.reindexQueue(machineId);

      wsManager.broadcast('QUEUE_PROMOTED', {
        machine_id: machineId,
        promoted_request_id: nextReq.id,
      });
    } else {
      await MachineRepository.updateStatus(machineId, MachineStatus.idle);
    }
  }
}
