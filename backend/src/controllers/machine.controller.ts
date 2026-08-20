import { Router, Request, Response, NextFunction } from 'express';
import { MachineService } from '../services/machine.service';
import { attachUser, requireRole, AuthenticatedRequest } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware';

const registerSchema = z.object({
  token: z.string().min(1),
  hardware_id: z.string().min(1),
  os: z.enum(['windows', 'linux']).default('windows'),
  model: z.string().optional(),
  gpu_model: z.string().optional(),
});

const generateScriptSchema = z.object({
  name: z.string().min(1),
  lab_id: z.number().int(),
  os: z.enum(['windows', 'linux']),
});

export const machineRouter = Router();

machineRouter.post('/machines/register', validate(registerSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, hardware_id, os } = req.body;
    const modelName = req.body.model || req.body.gpu_model;
    const result = await MachineService.registerAgent(token, hardware_id, os, modelName);
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

machineRouter.get('/gpus', attachUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const labId = req.query.lab_id ? parseInt(req.query.lab_id as string, 10) : undefined;
    const result = await MachineService.listMachines(labId);
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

machineRouter.get('/machines', attachUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const labId = req.query.lab_id ? parseInt(req.query.lab_id as string, 10) : undefined;
    const result = await MachineService.listMachines(labId);
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

machineRouter.post(
  '/machines/generate-script',
  attachUser,
  requireRole([Role.superuser]),
  validate(generateScriptSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const serverUrl = `${req.protocol}://${req.get('host')}`;
      const result = await MachineService.generateInstallerScript(
        req.body.name,
        req.body.lab_id,
        req.body.os,
        serverUrl
      );
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }
);
