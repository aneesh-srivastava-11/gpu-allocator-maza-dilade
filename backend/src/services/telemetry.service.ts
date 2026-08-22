import { TelemetryRepository } from '../repositories/telemetry.repository';
import { SessionRepository } from '../repositories/session.repository';
import { MachineRepository } from '../repositories/machine.repository';
import { MisuseDetectorService } from './misuse-detector.service';
import { SessionStatus, MachineStatus, RequestStatus } from '@prisma/client';
import { wsManager } from '../ws/manager';
import { prisma } from '../db';
import { RequestService } from './request.service';

export class TelemetryService {
  public static async recordTelemetry(hardwareId: string, payload: any) {
    const machine = await MachineRepository.findByHardwareId(hardwareId);
    if (!machine) throw { statusCode: 404, message: 'Machine not found' };

    const now = new Date();

    // Dynamically update machine GPU model specs and lastSeenAt if reported by agent
    const gpuModel = payload.gpu_model || payload.model;
    await prisma.machine.update({
      where: { id: machine.id },
      data: {
        lastSeenAt: now,
        ...(gpuModel && gpuModel !== machine.model ? { model: gpuModel } : {}),
      },
    });

    const activeSession = await SessionRepository.findActiveByMachineId(machine.id);
    if (!activeSession) {
      return { status: 'received', monitored: false };
    }

    // Passive Session Expiry Check on Telemetry Ping
    if (activeSession.request && new Date(activeSession.request.endTime) <= now) {
      await prisma.session.update({
        where: { id: activeSession.id },
        data: { status: SessionStatus.completed, endedAt: now },
      });
      await prisma.request.update({
        where: { id: activeSession.requestId },
        data: { status: RequestStatus.completed },
      });
      await prisma.machine.update({
        where: { id: machine.id },
        data: { status: MachineStatus.idle },
      });

      await RequestService.promoteNextQueued(machine.id);

      return {
        status: 'expired',
        action: 'reset_baseline',
        message: 'Session allocated time expired. Resetting workstation baseline.',
      };
    }

    const report = await TelemetryRepository.create({
      sessionId: activeSession.id,
      gpuUtilPct: payload.gpu_util_pct || 0,
      processSignature: payload.process_signature || [],
      networkConnections: payload.network_connections || [],
    });

    const check = MisuseDetectorService.evaluate(payload);
    if (check.isFlagged && check.flagType) {
      await SessionRepository.updateStatus(activeSession.id, SessionStatus.flagged, { flaggedAt: now });
      await MachineRepository.updateStatus(machine.id, MachineStatus.blocked);

      await SessionRepository.createFlag(
        activeSession.id,
        check.flagType,
        check.evidence,
        report.id
      );

      wsManager.broadcast('SESSION_FLAGGED', {
        session_id: activeSession.id,
        machine_id: machine.id,
        flag_type: check.flagType,
        evidence: check.evidence,
      });

      return {
        status: 'flagged',
        action: 'block_network',
        reason: check.flagType,
        session_id: activeSession.id,
      };
    }

    return { status: 'ok', monitored: true };
  }
}
