import { Router, Response, NextFunction } from 'express';
import { TelemetryService } from '../services/telemetry.service';
import { verifyAgentToken, AgentRequest } from '../middleware/agent-auth.middleware';
import { runGovernanceTasks } from '../tasks/scheduler';

export const telemetryRouter = Router();

telemetryRouter.post('/machines/:hardwareId/telemetry', verifyAgentToken, async (req: AgentRequest, res: Response, next: NextFunction) => {
  try {
    const result = await TelemetryService.recordTelemetry(req.params.hardwareId, req.body);
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

// Serverless Cron Tick Endpoint (Triggerable by Vercel Cron / external scheduled pings)
telemetryRouter.all('/cron/tick', async (req, res, next) => {
  try {
    const summary = await runGovernanceTasks();
    return res.json({ status: 'ok', serverless: true, summary });
  } catch (err) {
    next(err);
  }
});
