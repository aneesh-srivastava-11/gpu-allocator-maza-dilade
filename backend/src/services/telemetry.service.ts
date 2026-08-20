import { TelemetryRepository } from '../repositories/telemetry.repository';
import { SessionRepository } from '../repositories/session.repository';
import { MachineRepository } from '../repositories/machine.repository';
import { MisuseDetectorService } from './misuse-detector.service';
import { SessionStatus, MachineStatus } from '@prisma/client';
import { wsManager } from '../ws/manager';

export class TelemetryService {
  public static async recordTelemetry(hardwareId: string, payload: any) {
    const machine = await MachineRepository.findByHardwareId(hardwareId);
    if (!machine) throw { statusCode: 404, message: 'Machine not found' };

    const activeSession = await SessionRepository.findActiveByMachineId(machine.id);
    if (!activeSession) {
      return { status: 'received', monitored: false };
    }

    const report = await TelemetryRepository.create({
      sessionId: activeSession.id,
      gpuUtilPct: payload.gpu_util_pct || 0,
      processSignature: payload.process_signature || [],
      networkConnections: payload.network_connections || [],
    });

    const check = MisuseDetectorService.evaluate(payload);
    if (check.isFlagged && check.flagType) {
      await SessionRepository.updateStatus(activeSession.id, SessionStatus.flagged, { flaggedAt: new Date() });
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
        reason: check.flagType,
        session_id: activeSession.id,
      };
    }

    return { status: 'ok', monitored: true };
  }
}
