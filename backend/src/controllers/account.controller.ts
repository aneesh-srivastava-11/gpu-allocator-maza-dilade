import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { AccountService } from '../services/account.service';
import { attachUser, requireRole, AuthenticatedRequest } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

export const accountRouter = Router();

accountRouter.post('/accounts', upload.single('idCardImage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, rollNumber, department, password } = req.body;
    const file = req.file;

    const result = await AccountService.createStudentSignup({
      name,
      email,
      rollNumber,
      department,
      password,
      idCardBuffer: file?.buffer,
      idCardFilename: file?.originalname,
    });

    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

accountRouter.get(
  '/accounts/pending',
  attachUser,
  requireRole([Role.incharge, Role.superuser]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await AccountService.getPendingAccounts();
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

accountRouter.post(
  '/accounts/:id/approve',
  attachUser,
  requireRole([Role.incharge, Role.superuser]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const result = await AccountService.approveAccount(userId, req.user!.id);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

accountRouter.post(
  '/accounts/:id/reject',
  attachUser,
  requireRole([Role.incharge, Role.superuser]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const result = await AccountService.rejectAccount(userId, req.user!.id);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }
);
