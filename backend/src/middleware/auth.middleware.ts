import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { Role, User, AccountStatus } from '@prisma/client';
import { supabase } from '../utils/supabase';

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

    let userEmail: string | undefined;

    // 1. Verify via Supabase Auth if configured
    if (supabase) {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data.user) {
        userEmail = data.user.email;
      }
    }

    // 2. Local Fallback token decoding (demo_tok_<id>)
    if (!userEmail && token.startsWith('demo_tok_')) {
      const userId = parseInt(token.replace('demo_tok_', ''), 10);
      const u = await prisma.user.findUnique({ where: { id: userId } });
      if (u) {
        req.user = u;
        return next();
      }
    }

    if (!userEmail) {
      return res.status(401).json({ detail: 'Invalid token or session expired' });
    }

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
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
