import { Router, Response, NextFunction } from 'express';
import { SessionService } from '../services/session.service';
import { attachUser, requireRole, AuthenticatedRequest } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware';

const verifyCodeSchema = z.object({
  code: z.string().min(1),
});

const extendSchema = z.object({
  extensionMinutes: z.number().int().positive().default(60),
  reason: z.string().optional(),
});

export const sessionRouter = Router();

sessionRouter.post(
  '/sessions/:id/extend',
  attachUser,
  validate(extendSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const sessionId = parseInt(req.params.id, 10);
      const result = await SessionService.extendSession(
        sessionId,
        req.body.extensionMinutes,
        req.body.reason,
        req.user!.id
      );
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

sessionRouter.post(
  '/sessions/:id/verify-code',
  attachUser,
  validate(verifyCodeSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const sessionId = parseInt(req.params.id, 10);
      const result = await SessionService.verifyLaunchCode(sessionId, req.body.code);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

sessionRouter.get('/sessions/:id', attachUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const sessionId = parseInt(req.params.id, 10);
    const result = await SessionService.getSessionDetail(sessionId);
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

sessionRouter.post('/sessions/:id/terminate', attachUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const sessionId = parseInt(req.params.id, 10);
    const result = await SessionService.terminateSession(sessionId, req.user!.id);
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

sessionRouter.post(
  '/sessions/:id/restore',
  attachUser,
  requireRole([Role.incharge, Role.superuser]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const sessionId = parseInt(req.params.id, 10);
      const result = await SessionService.restoreSession(sessionId, req.user!.id);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }
);
