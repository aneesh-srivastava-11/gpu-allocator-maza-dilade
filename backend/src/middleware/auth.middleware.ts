import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { UserRepository } from '../repositories/user.repository';
import { Role, User, AccountStatus } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export async function attachUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ detail: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    const user = await UserRepository.findById(payload.id);
    if (!user) {
      return res.status(401).json({ detail: 'User account not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ detail: 'Invalid token or session expired' });
  }
}

export function requireRole(allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ detail: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        detail: `User role '${req.user.role}' is not authorized to access this resource`,
      });
    }
    next();
  };
}

export function requireActiveAccount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ detail: 'Authentication required' });
  }
  if (req.user.accountStatus !== AccountStatus.active && req.user.role === Role.student) {
    return res.status(403).json({
      detail: 'Account pending review or rejected. Access restricted.',
    });
  }
  next();
}
