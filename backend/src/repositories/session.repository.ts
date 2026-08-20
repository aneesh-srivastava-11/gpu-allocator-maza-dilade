import { prisma } from '../db';
import { Session, SessionStatus, FlagType } from '@prisma/client';

export class SessionRepository {
  public static async create(requestId: number, oneTimeCodeHash: string): Promise<Session> {
    return prisma.session.create({
      data: {
        requestId,
        oneTimeCodeHash,
        status: SessionStatus.awaiting_code,
        codeGeneratedAt: new Date(),
      },
    });
  }

  public static async findById(id: number): Promise<any | null> {
    return prisma.session.findUnique({
      where: { id },
      include: {
        request: {
          include: {
            student: true,
            machine: { include: { lab: true } },
          },
        },
        telemetryReports: {
          orderBy: { reportedAt: 'desc' },
          take: 20,
        },
        flags: true,
      },
    });
  }

  public static async findActiveByMachineId(machineId: number): Promise<any | null> {
    return prisma.session.findFirst({
      where: {
        status: { in: [SessionStatus.active, SessionStatus.awaiting_code] },
        request: { machineId },
      },
      include: {
        request: {
          include: {
            student: true,
            machine: true,
          },
        },
      },
    });
  }

  public static async updateStatus(id: number, status: SessionStatus, data: Partial<Session> = {}): Promise<Session> {
    return prisma.session.update({
      where: { id },
      data: {
        status,
        ...data,
      },
    });
  }

  public static async incrementAttempts(id: number): Promise<Session> {
    return prisma.session.update({
      where: { id },
      data: {
        codeAttempts: { increment: 1 },
      },
    });
  }

  public static async createFlag(sessionId: number, type: FlagType, evidence: any, telemetryReportId?: number) {
    return prisma.flag.create({
      data: {
        sessionId,
        type,
        evidence,
        telemetryReportId,
      },
    });
  }
}
