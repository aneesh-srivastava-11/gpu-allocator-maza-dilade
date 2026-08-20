import { prisma } from '../db';
import { Lab } from '@prisma/client';

export class LabRepository {
  public static async findAll(): Promise<Lab[]> {
    return prisma.lab.findMany({
      include: {
        machines: true,
      },
    });
  }

  public static async findById(id: number): Promise<Lab | null> {
    return prisma.lab.findUnique({
      where: { id },
      include: { machines: true },
    });
  }
}
