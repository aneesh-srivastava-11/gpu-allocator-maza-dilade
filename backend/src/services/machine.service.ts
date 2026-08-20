import { MachineRepository } from '../repositories/machine.repository';
import { LabRepository } from '../repositories/lab.repository';
import { generatePowerShellScript, generateBashScript } from '../utils/installer-gen';
import { hashPassword } from '../utils/hashing';
import { MachineOS } from '@prisma/client';
import crypto from 'crypto';

export class MachineService {
  public static async registerAgent(token: string, hardwareId: string, os: string) {
    const existing = await MachineRepository.findByHardwareId(hardwareId);
    const machineOs = os === 'linux' ? MachineOS.linux : MachineOS.windows;
    const rawAgentToken = `agent_tok_${crypto.randomBytes(16).toString('hex')}`;
    const tokenHash = await hashPassword(rawAgentToken);

    if (existing) {
      // Re-baseline / re-register existing machine
      await MachineRepository.create({
        labId: existing.labId,
        name: existing.name,
        os: machineOs,
        hardwareId,
        agentTokenHash: tokenHash,
      });
    }

    return {
      hardware_id: hardwareId,
      agent_token: rawAgentToken,
      status: 'registered',
      message: 'Machine registered successfully with persistent hardware ID.',
    };
  }

  public static async listMachines(labId?: number) {
    const machines = await MachineRepository.findAll(labId);
    return machines.map(m => {
      const activeReq = m.requests.find(r => ['approved', 'active'].includes(r.status));
      const queuedCount = m.requests.filter(r => r.status === 'queued').length;

      let currentSession = null;
      if (activeReq && activeReq.session) {
        currentSession = {
          id: activeReq.session.id,
          student_name: activeReq.student.name,
          reason: activeReq.reason,
          started_at: activeReq.session.startedAt,
          status: activeReq.session.status,
        };
      }

      return {
        id: m.id,
        lab_id: m.labId,
        lab_name: m.lab?.name || 'Lab',
        name: m.name,
        model: m.model,
        os: m.os,
        hardware_id: m.hardwareId,
        status: m.status,
        last_seen_at: m.lastSeenAt,
        queued_requests_count: queuedCount,
        current_session: currentSession,
      };
    });
  }

  public static async generateInstallerScript(machineName: string, labId: number, osType: 'windows' | 'linux', serverUrl: string) {
    const registrationToken = `reg_tok_${crypto.randomBytes(12).toString('hex')}`;
    const hardwareId = `hw_${crypto.randomBytes(8).toString('hex')}`;
    const rawAgentToken = `agent_tok_${crypto.randomBytes(16).toString('hex')}`;
    const tokenHash = await hashPassword(rawAgentToken);

    const machineOs = osType === 'linux' ? MachineOS.linux : MachineOS.windows;

    await MachineRepository.create({
      labId,
      name: machineName,
      os: machineOs,
      hardwareId,
      agentTokenHash: tokenHash,
    });

    const script = osType === 'windows'
      ? generatePowerShellScript(registrationToken, serverUrl)
      : generateBashScript(registrationToken, serverUrl);

    return {
      registration_token: registrationToken,
      hardware_id: hardwareId,
      agent_token: rawAgentToken,
      script_content: script,
      filename: osType === 'windows' ? 'install_agent.ps1' : 'install_agent.sh',
    };
  }
}
