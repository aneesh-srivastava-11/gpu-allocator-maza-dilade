import jwt from 'jsonwebtoken';
import { config } from '../config';
import { Role } from '@prisma/client';

export interface TokenPayload {
  sub: string;
  id: number;
  role: Role;
}

export function createAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '24h' });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwtSecret) as TokenPayload;
}
