import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { attachUser, AuthenticatedRequest } from '../middleware/auth.middleware';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authRouter = Router();

authRouter.post('/auth/login', validate(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await AuthService.login(req.body.email, req.body.password);
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.get('/auth/me', attachUser, async (req: AuthenticatedRequest, res: Response) => {
  const u = req.user!;
  return res.json({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    roll_number: u.rollNumber,
    account_status: u.accountStatus,
    managed_lab_ids: u.managedLabIds || [],
  });
});
