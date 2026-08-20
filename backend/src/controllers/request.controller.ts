import { Router, Response, NextFunction } from 'express';
import { RequestService } from '../services/request.service';
import { attachUser, requireRole, requireActiveAccount, AuthenticatedRequest } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware';

const createRequestSchema = z.object({
  gpu_id: z.number().int(),
  reason: z.string().min(1),
  start_time: z.string(),
  end_time: z.string(),
});

export const requestRouter = Router();

requestRouter.post(
  '/requests',
  attachUser,
  requireActiveAccount,
  validate(createRequestSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { gpu_id, reason, start_time, end_time } = req.body;
      const result = await RequestService.createRequest(
        req.user!.id,
        gpu_id,
        reason,
        new Date(start_time),
        new Date(end_time)
      );
      return res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

requestRouter.get('/requests/mine', attachUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await RequestService.getMyRequests(req.user!.id);
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

requestRouter.get(
  '/requests/pending',
  attachUser,
  requireRole([Role.incharge, Role.superuser]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await RequestService.getPendingRequests(req.user!);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

requestRouter.post(
  '/requests/:id/approve',
  attachUser,
  requireRole([Role.incharge, Role.superuser]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const requestId = parseInt(req.params.id, 10);
      const result = await RequestService.approveRequest(requestId, req.user!.id);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

requestRouter.post(
  '/requests/:id/reject',
  attachUser,
  requireRole([Role.incharge, Role.superuser]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const requestId = parseInt(req.params.id, 10);
      const result = await RequestService.rejectRequest(requestId, req.user!.id);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }
);
