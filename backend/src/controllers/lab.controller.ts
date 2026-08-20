import { Router, Request, Response, NextFunction } from 'express';
import { LabService } from '../services/lab.service';
import { attachUser } from '../middleware/auth.middleware';

export const labRouter = Router();

labRouter.get('/labs', attachUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await LabService.listLabs();
    return res.json(result);
  } catch (err) {
    next(err);
  }
});
