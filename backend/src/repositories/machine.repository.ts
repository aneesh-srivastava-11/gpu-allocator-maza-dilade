import { prisma } from '../db';
import { Machine, MachineStatus, MachineOS } from '@prisma/client';

export class MachineRepository {
  public static async findAll(labId?: number): Promise<any[]> {
    const where = labId ? { labId } : {};
    return prisma.machine.findMany({
      where,
      include: {
        lab: true,
        requests: {
          where: {
            status: { in: ['approved', 'active', 'queued', 'pending_approval'] },
          },
          include: {
            student: true,
            session: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    });
  }

  public static async findById(id: number): Promise<any | null> {
    return prisma.machine.findUnique({
      where: { id },
      include: {
        lab: true,
        requests: {
          include: {
            student: true,
            session: true,
          },
          orderBy: { queuePosition: 'asc' },
        },
      },
    });
  }

  public static async findByHardwareId(hardwareId: string): Promise<Machine | null> {
    return prisma.machine.findUnique({
      where: { hardwareId },
      include: { lab: true },
    });
  }

  public static async create(data: {
    labId: number;
    name: string;
    os: MachineOS;
    hardwareId: string;
    agentTokenHash?: string;
  }): Promise<Machine> {
    return prisma.machine.create({
      data: {
        labId: data.labId,
        name: data.name,
        os: data.os,
        hardwareId: data.hardwareId,
        agentTokenHash: data.agentTokenHash,
        status: MachineStatus.idle,
      },
    });
  }

  public static async updateStatus(id: number, status: MachineStatus): Promise<Machine> {
    return prisma.machine.update({
      where: { id },
      data: { status },
    });
  }

  public static async updateLastSeen(id: number): Promise<Machine> {
    return prisma.machine.update({
      where: { id },
      data: { lastSeenAt: new Date() },
    });
  }
}
