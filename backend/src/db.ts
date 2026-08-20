import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';

dotenv.config();

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://gpu_user:gpu_password@localhost:5470/gpu_allocator';
}

export const prisma = new PrismaClient();
