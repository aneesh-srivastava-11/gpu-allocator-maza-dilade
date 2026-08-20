import { Request, Response, NextFunction } from 'express';
import { MachineRepository } from '../repositories/machine.repository';
import { verifyPassword } from '../utils/hashing';
import { Machine } from '@prisma/client';

export interface AgentRequest extends Request {
  machine?: Machine;
}

export async function verifyAgentToken(req: AgentRequest, res: Response, next: NextFunction) {
  try {
    const hardwareId = req.params.hardwareId;
    const token = req.headers['x-agent-token'] as string;

    if (!hardwareId || !token) {
      return res.status(401).json({ detail: 'Missing hardwareId or X-Agent-Token header' });
    }

    const machine = await MachineRepository.findByHardwareId(hardwareId);
    if (!machine || !machine.agentTokenHash) {
      return res.status(401).json({ detail: 'Unrecognized machine or agent not registered' });
    }

    const isValid = await verifyPassword(token, machine.agentTokenHash);
    if (!isValid) {
      return res.status(401).json({ detail: 'Invalid agent token for machine' });
    }

    await MachineRepository.updateLastSeen(machine.id);
    req.machine = machine;
    next();
  } catch (err) {
    return res.status(401).json({ detail: 'Agent authentication failed' });
  }
}
