import { SessionRepository } from '../repositories/session.repository';
import { RequestRepository } from '../repositories/request.repository';
import { MachineRepository } from '../repositories/machine.repository';
import { hashCode, verifyCode } from '../utils/hashing';
import { SessionStatus, MachineStatus, RequestStatus } from '@prisma/client';
import { AuditRepository } from '../repositories/audit.repository';
import { wsManager } from '../ws/manager';

export class SessionService {
  public static async createSessionOnApproval(requestId: number) {
    const rawCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await hashCode(rawCode);

    const session = await SessionRepository.create(requestId, codeHash);
    return {
      session_id: session.id,
      one_time_code: rawCode,
    };
  }

  public static async verifyLaunchCode(sessionId: number, code: string) {
    const session = await SessionRepository.findById(sessionId);
    if (!session) throw { statusCode: 404, message: 'Session not found' };

    if (session.status !== SessionStatus.awaiting_code && session.status !== SessionStatus.active) {
      throw { statusCode: 400, message: `Session is currently in ${session.status} state.` };
    }

    if (session.codeAttempts >= 5) {
      throw {
        statusCode: 400,
        message: 'Maximum code verification attempts exceeded (5/5). Please contact Lab Incharge.',
      };
    }

    const isValid = await verifyCode(code.trim(), session.oneTimeCodeHash || '');
    if (!isValid) {
      await SessionRepository.incrementAttempts(sessionId);
      const remaining = 5 - (session.codeAttempts + 1);
      throw {
        statusCode: 400,
        message: `Invalid launch code. (${remaining} attempts remaining)`,
      };
    }

    await SessionRepository.updateStatus(sessionId, SessionStatus.active);
    await MachineRepository.updateStatus(session.request.machineId, MachineStatus.allocated);

    wsManager.broadcast('SESSION_ACTIVE', {
      session_id: sessionId,
      machine_id: session.request.machineId,
      student_name: session.request.student.name,
    });

    return {
      message: 'One-time code verified! Workspace launch authorized.',
      session_id: sessionId,
      status: 'active',
      jupyter_url: `http://localhost:8888/?token=session_${sessionId}`,
    };
  }

  public static async getSessionDetail(sessionId: number) {
    const session = await SessionRepository.findById(sessionId);
    if (!session) throw { statusCode: 404, message: 'Session not found' };

    return {
      id: session.id,
      request_id: session.requestId,
      student_id: session.request.studentId,
      student_name: session.request.student.name,
      student_email: session.request.student.email,
      gpu_id: session.request.machineId,
      gpu_name: session.request.machine.name,
      lab_name: session.request.machine.lab.name,
      reason: session.request.reason,
      started_at: session.startedAt,
      flagged_at: session.flaggedAt,
      blocked_at: session.blockedAt,
      ended_at: session.endedAt,
      status: session.status,
      telemetry: session.telemetryReports.map((t: any) => ({
        id: t.id,
        reported_at: t.reportedAt,
        gpu_util_pct: t.gpuUtilPct,
        process_signature: t.processSignature,
        network_connections: t.networkConnections,
      })),
      flags: session.flags.map((f: any) => ({
        id: f.id,
        type: f.type,
        evidence: f.evidence,
        created_at: f.createdAt,
      })),
    };
  }

  public static async terminateSession(sessionId: number, actorId: number) {
    const session = await SessionRepository.findById(sessionId);
    if (!session) throw { statusCode: 404, message: 'Session not found' };

    await SessionRepository.updateStatus(sessionId, SessionStatus.completed, { endedAt: new Date() });
    await RequestRepository.updateStatus(session.requestId, RequestStatus.completed);
    await MachineRepository.updateStatus(session.request.machineId, MachineStatus.idle);

    await AuditRepository.log(
      actorId,
      'TERMINATE_SESSION',
      'SESSION',
      sessionId,
      { student_name: session.request.student.name }
    );

    wsManager.broadcast('SESSION_TERMINATED', {
      session_id: sessionId,
      machine_id: session.request.machineId,
    });

    const { RequestService } = require('./request.service');
    await RequestService.promoteNextQueued(session.request.machineId);

    return { message: 'Session terminated successfully. Machine freed for queue.' };
  }

  public static async restoreSession(sessionId: number, actorId: number) {
    const session = await SessionRepository.findById(sessionId);
    if (!session) throw { statusCode: 404, message: 'Session not found' };

    const rawCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await hashCode(rawCode);

    await SessionRepository.updateStatus(sessionId, SessionStatus.awaiting_code, {
      oneTimeCodeHash: codeHash,
      codeAttempts: 0,
    });
    await MachineRepository.updateStatus(session.request.machineId, MachineStatus.allocated);

    await AuditRepository.log(
      actorId,
      'RESTORE_SESSION',
      'SESSION',
      sessionId,
      { new_code_generated: true }
    );

    wsManager.broadcast('SESSION_RESTORED', {
      session_id: sessionId,
      machine_id: session.request.machineId,
      one_time_code: rawCode,
    });

    return {
      message: 'Session restored. New one-time launch code generated.',
      session_id: sessionId,
      one_time_code: rawCode,
    };
  }
}
