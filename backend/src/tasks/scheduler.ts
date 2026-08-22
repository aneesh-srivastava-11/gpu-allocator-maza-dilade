import { prisma } from '../db';
import { SessionStatus, MachineStatus, RequestStatus } from '@prisma/client';
import { AuditRepository } from '../repositories/audit.repository';
import { TelemetryRepository } from '../repositories/telemetry.repository';
import { RequestService } from '../services/request.service';
import { config } from '../config';

/**
 * Executes passive session expiry, fail-closed disconnection checks, and queue reindexing.
 * Serverless-compatible: callable directly from telemetry pings or API routes without persistent node-cron loops.
 */
export async function runGovernanceTasks() {
  const now = new Date();
  let expiredCount = 0;
  let staleCount = 0;

  try {
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

      expiredCount++;
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

          staleCount++;
          await AuditRepository.log(
            1,
            'FAIL_CLOSED_DISCONNECT',
            'SESSION',
            req.session.id,
            { reason: 'Agent telemetry lost for >90s. Access locked by default.' }
          );
        }
      }
    }

    // 3. Escalation check
    const cutoff = new Date(Date.now() - config.escalationTimeoutMinutes * 60 * 1000);
    await prisma.session.updateMany({
      where: {
        status: { in: [SessionStatus.flagged, SessionStatus.blocked] },
        escalated: false,
        flaggedAt: { lte: cutoff },
      },
      data: { escalated: true },
    });

  } catch (err) {
    console.error('[GOVERNANCE TASK ERROR]', err);
  }

  return { expiredCount, staleCount };
}
