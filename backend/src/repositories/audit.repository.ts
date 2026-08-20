import { prisma } from '../db';
import { AuditLog } from '@prisma/client';

export class AuditRepository {
  public static async log(
    actorId: number,
    action: string,
    targetType: string,
    targetId?: number,
    metadata?: any,
    sessionId?: number
  ): Promise<AuditLog> {
    return prisma.auditLog.create({
      data: {
        actorId,
        action,
        targetType,
        targetId,
        metadata,
        sessionId,
      },
    });
  }

  public static async findAll(limit = 100): Promise<any[]> {
    return prisma.auditLog.findMany({
      include: {
        actor: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
