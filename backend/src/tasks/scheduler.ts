import cron from 'node-cron';
import { prisma } from '../db';
import { SessionStatus, MachineStatus, RequestStatus } from '@prisma/client';
import { AuditRepository } from '../repositories/audit.repository';
import { TelemetryRepository } from '../repositories/telemetry.repository';
import { RequestService } from '../services/request.service';
import { wsManager } from '../ws/manager';
import { config } from '../config';

export function startBackgroundScheduler() {
  console.log('[SCHEDULER] Background governance tasks initialized.');

  // Every 30 seconds: check expired sessions & fail-closed connectivity loss
  cron.schedule('*/30 * * * * *', async () => {
    try {
      const now = new Date();

      // 1. Session Expiry Check
      const expiredRequests = await prisma.request.findMany({
        where: {
          status: RequestStatus.active,
          endTime: { lte: now },
        },
        include: { session: true, machine: true },
      });

      for (const req of expiredRequests) {
        if (req.session) {
          await prisma.session.update({
            where: { id: req.session.id },
            data: { status: SessionStatus.completed, endedAt: now },
          });
        }
        await prisma.request.update({
          where: { id: req.id },
          data: { status: RequestStatus.completed },
        });
        await prisma.machine.update({
          where: { id: req.machineId },
          data: { status: MachineStatus.idle },
        });

        console.log(`[SCHEDULER] Session #${req.session?.id} completed (expired). Machine ${req.machine.name} freed.`);
        await RequestService.promoteNextQueued(req.machineId);
      }

      // 2. Fail-Closed Connectivity Loss Check (lastSeenAt > 90 seconds during active session)
      const staleThreshold = new Date(Date.now() - 90 * 1000);
      const staleActiveMachines = await prisma.machine.findMany({
        where: {
          status: MachineStatus.allocated,
          lastSeenAt: { lte: staleThreshold },
        },
        include: {
          requests: {
            where: { status: RequestStatus.active },
            include: { session: true },
          },
        },
      });

      for (const m of staleActiveMachines) {
        for (const req of m.requests) {
          if (req.session && req.session.status === SessionStatus.active) {
            await prisma.session.update({
              where: { id: req.session.id },
              data: { status: SessionStatus.flagged, flaggedAt: now },
            });
            await prisma.machine.update({
              where: { id: m.id },
              data: { status: MachineStatus.blocked },
            });

            await AuditRepository.log(
              1,
              'FAIL_CLOSED_DISCONNECT',
              'SESSION',
              req.session.id,
              { reason: 'Agent telemetry lost for >90s. Access locked by default.' }
            );

            wsManager.broadcast('SESSION_FLAGGED', {
              session_id: req.session.id,
              machine_id: m.id,
              flag_type: 'other',
              evidence: { reason: 'Fail-closed: Telemetry connectivity lost' },
            });
          }
        }
      }
    } catch (err) {
      console.error('[SCHEDULER 30s ERROR]', err);
    }
  });

  // Every 60 seconds: Escalation & Telemetry Pruning
  cron.schedule('*/60 * * * * *', async () => {
    try {
      // 1. Escalation check
      const cutoff = new Date(Date.now() - config.escalationTimeoutMinutes * 60 * 1000);
      const unhandled = await prisma.session.findMany({
        where: {
          status: { in: [SessionStatus.flagged, SessionStatus.blocked] },
          escalated: false,
          flaggedAt: { lte: cutoff },
        },
      });

      for (const s of unhandled) {
        await prisma.session.update({
          where: { id: s.id },
          data: { escalated: true },
        });
        await AuditRepository.log(
          1,
          'ESCALATION_TO_SUPERUSER',
          'SESSION',
          s.id,
          { note: `Unhandled for >${config.escalationTimeoutMinutes}m. Escalated to Superuser queue.` }
        );
      }

      // 2. Prune old telemetry (> 7 days)
      const pruneCutoff = new Date(Date.now() - config.telemetryRetentionDays * 24 * 60 * 60 * 1000);
      const prunedCount = await TelemetryRepository.pruneRoutineTelemetry(pruneCutoff);
      if (prunedCount > 0) {
        console.log(`[PRIVACY PRUNER] Pruned ${prunedCount} telemetry records older than ${config.telemetryRetentionDays} days.`);
      }
    } catch (err) {
      console.error('[SCHEDULER 60s ERROR]', err);
    }
  });
}
