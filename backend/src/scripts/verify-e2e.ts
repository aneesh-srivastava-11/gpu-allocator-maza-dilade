import { prisma } from '../db';
import { AuthService } from '../services/auth.service';
import { AccountService } from '../services/account.service';
import { RequestService } from '../services/request.service';
import { SessionService } from '../services/session.service';
import { TelemetryService } from '../services/telemetry.service';
import { seedDatabase } from '../seed';
import { SessionStatus, MachineStatus, RequestStatus } from '@prisma/client';

// Minimal 1x1 pixel JPEG buffer for OCR processing test
const VALID_JPEG_BUFFER = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP////////////////////////////////////////////////////////////////////////////////──────',
  'base64'
);

async function runEndToEndVerification() {
  console.log('=================================================================');
  console.log('🚀 STARTING COMPREHENSIVE END-TO-END VERIFICATION PASS (PRD v2.0)');
  console.log('=================================================================\n');

  try {
    // Seed DB
    await seedDatabase();

    // -------------------------------------------------------------------------
    // STEP 1: Student Signup & Incharge Identity Approval
    // -------------------------------------------------------------------------
    console.log('📌 STEP 1: Testing Student Signup with ID Capture & Incharge Approval');
    const signupEmail = `e2e.student.${Date.now()}@dept.edu`;
    const signupResult = await AccountService.createStudentSignup({
      name: 'Alex Rivera',
      email: signupEmail,
      rollNumber: 'E2E-2026-99',
      department: 'Computer Science',
      password: 'password123',
      idCardBuffer: VALID_JPEG_BUFFER,
      idCardFilename: 'test_id.jpg',
    });

    console.log('  ✓ Student Signup Result:', signupResult);

    const pendingAccounts = await AccountService.getPendingAccounts();
    const createdAccount = pendingAccounts.find(a => a.id === signupResult.id);
    if (!createdAccount) throw new Error('Signup failed: Account not found in pending queue');
    console.log(`  ✓ Account #${createdAccount.id} sits in pending_review queue.`);

    const inchargeAuth = await AuthService.login('incharge@dept.edu', 'password123');
    const approveAccountResult = await AccountService.approveAccount(createdAccount.id, inchargeAuth.user.id);
    console.log('  ✓ Incharge Account Approval Result:', approveAccountResult);

    // -------------------------------------------------------------------------
    // STEP 2: GPU Request & Queue Allocation
    // -------------------------------------------------------------------------
    console.log('\n📌 STEP 2: Testing GPU Allocation Request & Incharge Approval');
    const studentAuth = await AuthService.login(signupEmail, 'password123');
    const machine = await prisma.machine.findFirst({ where: { status: MachineStatus.idle } });
    if (!machine) throw new Error('No idle machine available for testing');

    const startTime = new Date();
    const endTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    const requestResult = await RequestService.createRequest(
      studentAuth.user.id,
      machine.id,
      'Deep Learning Model Training - E2E Verification',
      startTime,
      endTime
    );
    console.log(`  ✓ Request #${requestResult.id} Created (Status: ${requestResult.status})`);

    const approveRequestResult = await RequestService.approveRequest(requestResult.id, inchargeAuth.user.id);
    console.log('  ✓ Incharge Request Approval Result:', approveRequestResult);

    const oneTimeCode = approveRequestResult.one_time_code;
    const sessionId = approveRequestResult.session_id;
    console.log(`  ✓ Session #${sessionId} created. One-Time Passcode Generated: [ ${oneTimeCode} ]`);

    // -------------------------------------------------------------------------
    // STEP 3: Workspace Launch & Passcode Entry
    // -------------------------------------------------------------------------
    console.log('\n📌 STEP 3: Testing Passcode Entry & Workspace Launch');
    const launchResult = await SessionService.verifyLaunchCode(sessionId, oneTimeCode);
    console.log('  ✓ Launch Passcode Verification Result:', launchResult);

    const activeSession = await SessionService.getSessionDetail(sessionId);
    if (activeSession.status !== SessionStatus.active) {
      throw new Error(`Session verification failed: Expected status active, got ${activeSession.status}`);
    }
    console.log(`  ✓ Session #${sessionId} is ACTIVE. JupyterLab workspace URL: ${launchResult.jupyter_url}`);

    // -------------------------------------------------------------------------
    // STEP 4: Simulated Crypto Mining Telemetry & Misuse Enforcement
    // -------------------------------------------------------------------------
    console.log('\n📌 STEP 4: Testing Misuse Telemetry Detection & Machine Block');
    const misuseTelemetry = {
      gpu_util_pct: 99.5,
      process_signature: [{ pid: 1402, name: 'xmrig_miner', cmd: 'xmrig --stratum=stratum+tcp://pool.supportxmr.com:3333' }],
      network_connections: [{ dest: 'pool.supportxmr.com', port: 3333, status: 'ESTABLISHED' }],
    };

    const telemetryResult = await TelemetryService.recordTelemetry(machine.hardwareId, misuseTelemetry);
    console.log('  ✓ Misuse Telemetry Record Result:', telemetryResult);

    const flaggedSession = await SessionService.getSessionDetail(sessionId);
    if (flaggedSession.status !== SessionStatus.flagged) {
      throw new Error(`Misuse detection failed: Expected status flagged, got ${flaggedSession.status}`);
    }
    console.log(`  ✓ Session #${sessionId} successfully FLAGGED & machine BLOCKED due to fast-path mining detection!`);

    // -------------------------------------------------------------------------
    // STEP 5: Incharge Restore & Termination Governance
    // -------------------------------------------------------------------------
    console.log('\n📌 STEP 5: Testing Incharge Session Restoration & Final Termination');
    const restoreResult = await SessionService.restoreSession(sessionId, inchargeAuth.user.id);
    console.log('  ✓ Session Restore Result:', restoreResult);

    const terminateResult = await SessionService.terminateSession(sessionId, inchargeAuth.user.id);
    console.log('  ✓ Session Terminate Result:', terminateResult);

    const freedMachine = await prisma.machine.findUnique({ where: { id: machine.id } });
    if (freedMachine?.status !== MachineStatus.idle) {
      throw new Error(`Termination failed: Expected machine idle, got ${freedMachine?.status}`);
    }
    console.log(`  ✓ Machine ${machine.name} returned to IDLE status.`);

    console.log('\n=================================================================');
    console.log('🎉 ALL END-TO-END VERIFICATION PASSES COMPLETED WITH 100% SUCCESS!');
    console.log('=================================================================');

  } catch (err) {
    console.error('\n❌ E2E VERIFICATION FAILED:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runEndToEndVerification();
