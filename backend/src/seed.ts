import { prisma } from './db';
import { hashPassword } from './utils/hashing';
import { Role, AccountStatus, MachineOS, MachineStatus } from '@prisma/client';

export async function seedDatabase() {
  console.log('[SEED] Seeding database initial state...');

  const passHash = await hashPassword('password123');

  // 1. Superuser
  const superuser = await prisma.user.upsert({
    where: { email: 'superuser@dept.edu' },
    update: {},
    create: {
      name: 'Dr. Sarah Connor (Head)',
      email: 'superuser@dept.edu',
      role: Role.superuser,
      passwordHash: passHash,
      accountStatus: AccountStatus.active,
      department: 'Computer Science & AI',
    },
  });

  // 2. Lab Incharge
  const incharge = await prisma.user.upsert({
    where: { email: 'incharge@dept.edu' },
    update: {},
    create: {
      name: 'Dr. Vance (Lab Manager)',
      email: 'incharge@dept.edu',
      role: Role.incharge,
      passwordHash: passHash,
      accountStatus: AccountStatus.active,
      department: 'Computer Science',
      managedLabIds: [1],
    },
  });

  // 3. Active Student
  const student = await prisma.user.upsert({
    where: { email: 'student@dept.edu' },
    update: {},
    create: {
      name: 'Alex Rivera',
      email: 'student@dept.edu',
      rollNumber: 'CS2026-88',
      department: 'Computer Science',
      role: Role.student,
      passwordHash: passHash,
      accountStatus: AccountStatus.active,
      idCardImageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400',
      idOcrExtractedName: 'ALEX RIVERA',
      idNameMatch: true,
    },
  });

  // 4. Pending Student for Demo Review Queue
  const pendingStudent = await prisma.user.upsert({
    where: { email: 'pending.student@dept.edu' },
    update: {},
    create: {
      name: 'Jordan Lee',
      email: 'pending.student@dept.edu',
      rollNumber: 'CS2026-92',
      department: 'Computer Science',
      role: Role.student,
      passwordHash: passHash,
      accountStatus: AccountStatus.pending_review,
      idCardImageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
      idOcrExtractedName: 'JORDAN LEE',
      idNameMatch: true,
    },
  });

  // 5. Create Labs
  let lab1 = await prisma.lab.findFirst({ where: { name: 'AI & Deep Learning Lab' } });
  if (!lab1) {
    lab1 = await prisma.lab.create({
      data: {
        name: 'AI & Deep Learning Lab',
        location: 'Building B - Room 302',
      },
    });
  }

  let lab2 = await prisma.lab.findFirst({ where: { name: 'High Performance Compute Lab' } });
  if (!lab2) {
    lab2 = await prisma.lab.create({
      data: {
        name: 'High Performance Compute Lab',
        location: 'Building A - Room 108',
      },
    });
  }

  // Update incharge managedLabIds
  await prisma.user.update({
    where: { id: incharge.id },
    data: { managedLabIds: [lab1.id, lab2.id] },
  });

  // 6. Create Machines
  const machinesData = [
    { name: 'GPU Workstation 01', model: 'NVIDIA RTX 4090 24GB', os: MachineOS.windows, hw: 'hw_win_ws01_uuid', labId: lab1.id },
    { name: 'GPU Workstation 02', model: 'NVIDIA RTX 4090 24GB', os: MachineOS.linux, hw: 'hw_lin_ws02_uuid', labId: lab1.id },
    { name: 'GPU Workstation 03', model: 'NVIDIA RTX 3090 24GB', os: MachineOS.windows, hw: 'hw_win_ws03_uuid', labId: lab1.id },
    { name: 'GPU Workstation 04', model: 'NVIDIA RTX 3090 24GB', os: MachineOS.linux, hw: 'hw_lin_ws04_uuid', labId: lab1.id },
    { name: 'HPC Node Alpha', model: 'NVIDIA A100 80GB', os: MachineOS.linux, hw: 'hw_lin_hpc_alpha', labId: lab2.id },
    { name: 'HPC Node Beta', model: 'NVIDIA A100 80GB', os: MachineOS.linux, hw: 'hw_lin_hpc_beta', labId: lab2.id },
  ];

  const defaultAgentTokenHash = await hashPassword('gpu_worker_daemon_secret_token_change_in_production');

  for (const m of machinesData) {
    await prisma.machine.upsert({
      where: { hardwareId: m.hw },
      update: {},
      create: {
        labId: m.labId,
        name: m.name,
        model: m.model,
        os: m.os,
        hardwareId: m.hw,
        agentTokenHash: defaultAgentTokenHash,
        status: MachineStatus.idle,
        lastSeenAt: new Date(),
      },
    });
  }

  console.log('[SEED] Database seeded successfully!');
}

if (require.main === module) {
  seedDatabase()
    .catch(e => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
