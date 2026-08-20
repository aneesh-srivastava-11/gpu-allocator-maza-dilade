import { Router, Response, NextFunction } from 'express';
import { AuditRepository } from '../repositories/audit.repository';
import { MachineRepository } from '../repositories/machine.repository';
import { prisma } from '../db';
import { attachUser, requireRole, AuthenticatedRequest } from '../middleware/auth.middleware';
import { Role, MachineStatus, SessionStatus } from '@prisma/client';

export const auditRouter = Router();

auditRouter.get(
  '/audit/logs',
  attachUser,
  requireRole([Role.incharge, Role.superuser]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const logs = await AuditRepository.findAll(100);
      return res.json(
        logs.map(log => ({
          id: log.id,
          actor_id: log.actorId,
          actor_name: log.actor?.name || 'System',
          action_type: log.action,
          session_id: log.sessionId,
          justification_note: log.metadata ? JSON.stringify(log.metadata) : null,
          created_at: log.createdAt,
        }))
      );
    } catch (err) {
      next(err);
    }
  }
);

auditRouter.get(
  '/admin/overview-stats',
  attachUser,
  requireRole([Role.superuser]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const totalGpus = await prisma.machine.count();
      const allocatedGpus = await prisma.machine.count({ where: { status: MachineStatus.allocated } });
      const blockedGpus = await prisma.machine.count({ where: { status: MachineStatus.blocked } });
      const activeSessions = await prisma.session.count({ where: { status: SessionStatus.active } });
      const flaggedSessions = await prisma.session.count({ where: { status: SessionStatus.flagged } });
      const totalRequests = await prisma.request.count();

      return res.json({
        total_gpus: totalGpus,
        allocated_gpus: allocatedGpus,
        blocked_gpus: blockedGpus,
        active_sessions: activeSessions,
        flagged_sessions: flaggedSessions,
        total_requests: totalRequests,
        utilization_pct: totalGpus > 0 ? Math.round((allocatedGpus / totalGpus) * 1000) / 10 : 0,
      });
    } catch (err) {
      next(err);
    }
  }
);
