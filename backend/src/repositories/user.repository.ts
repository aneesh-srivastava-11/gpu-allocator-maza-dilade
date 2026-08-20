import { prisma } from '../db';
import { User, Prisma, AccountStatus, Role } from '@prisma/client';

export class UserRepository {
  public static async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  public static async findById(id: number): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  public static async findPendingAccounts(): Promise<User[]> {
    return prisma.user.findMany({
      where: { accountStatus: AccountStatus.pending_review },
      orderBy: { createdAt: 'asc' },
    });
  }

  public static async create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({ data });
  }

  public static async updateAccountStatus(id: number, status: AccountStatus): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { accountStatus: status },
    });
  }

  public static async findIncharges(): Promise<User[]> {
    return prisma.user.findMany({
      where: { role: Role.incharge },
    });
  }

  public static async findSuperusers(): Promise<User[]> {
    return prisma.user.findMany({
      where: { role: Role.superuser },
    });
  }
}
