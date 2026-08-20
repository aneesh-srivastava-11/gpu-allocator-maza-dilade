import { Router, Response, NextFunction } from 'express';
import { TelemetryService } from '../services/telemetry.service';
import { verifyAgentToken, AgentRequest } from '../middleware/agent-auth.middleware';

export const telemetryRouter = Router();

telemetryRouter.post('/machines/:hardwareId/telemetry', verifyAgentToken, async (req: AgentRequest, res: Response, next: NextFunction) => {
  try {
    const result = await TelemetryService.recordTelemetry(req.params.hardwareId, req.body);
    return res.json(result);
  } catch (err) {
    next(err);
  }
});
