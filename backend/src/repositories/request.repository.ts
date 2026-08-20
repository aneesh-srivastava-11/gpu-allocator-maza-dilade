import { prisma } from '../db';
import { Request, RequestStatus, Prisma } from '@prisma/client';

export class RequestRepository {
  public static async create(data: Prisma.RequestCreateInput): Promise<Request> {
    return prisma.request.create({ data });
  }

  public static async findById(id: number): Promise<any | null> {
    return prisma.request.findUnique({
      where: { id },
      include: {
        student: true,
        machine: { include: { lab: true } },
        session: true,
      },
    });
  }

  public static async findByStudentId(studentId: number): Promise<any[]> {
    return prisma.request.findMany({
      where: { studentId },
      include: {
        machine: { include: { lab: true } },
        session: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  public static async findPendingRequests(): Promise<any[]> {
    return prisma.request.findMany({
      where: { status: RequestStatus.pending_approval },
      include: {
        student: true,
        machine: { include: { lab: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  public static async updateStatus(id: number, status: RequestStatus, queuePosition = 0): Promise<Request> {
    return prisma.request.update({
      where: { id },
      data: { status, queuePosition },
    });
  }

  public static async countActiveForStudent(studentId: number): Promise<number> {
    return prisma.request.count({
      where: {
        studentId,
        status: { in: [RequestStatus.active, RequestStatus.approved] },
      },
    });
  }

  public static async countQueuedForStudent(studentId: number): Promise<number> {
    return prisma.request.count({
      where: {
        studentId,
        status: RequestStatus.queued,
      },
    });
  }

  public static async countQueuedForMachine(machineId: number): Promise<number> {
    return prisma.request.count({
      where: {
        machineId,
        status: RequestStatus.queued,
      },
    });
  }

  public static async findNextQueued(machineId: number): Promise<Request | null> {
    return prisma.request.findFirst({
      where: {
        machineId,
        status: RequestStatus.queued,
      },
      orderBy: { queuePosition: 'asc' },
    });
  }

  public static async reindexQueue(machineId: number): Promise<void> {
    const queued = await prisma.request.findMany({
      where: { machineId, status: RequestStatus.queued },
      orderBy: { queuePosition: 'asc' },
    });

    for (let i = 0; i < queued.length; i++) {
      await prisma.request.update({
        where: { id: queued[i].id },
        data: { queuePosition: i + 1 },
      });
    }
  }
}
