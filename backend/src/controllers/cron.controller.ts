import { Router, Request, Response } from 'express';
import { runGovernanceTasks } from '../tasks/scheduler';

export const cronRouter = Router();

/**
 * Endpoint triggered by Vercel Cron or external cron service every minute.
 * Securable via Authorization: Bearer <CRON_SECRET> or ?secret=<CRON_SECRET>
 */
cronRouter.all('/cron/governance', async (req: Request, res: Response) => {
  const secret = process.env.CRON_SECRET;
  
  if (secret) {
    const authHeader = req.headers.authorization;
    const querySecret = req.query.secret;
    const providedToken = authHeader?.replace('Bearer ', '') || querySecret;

    if (providedToken !== secret) {
      return res.status(401).json({ error: 'Unauthorized cron trigger' });
    }
  }

  try {
    const result = await runGovernanceTasks();
    return res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      governance: result,
    });
  } catch (err) {
    console.error('[CRON CONTROLLER ERROR]', err);
    return res.status(500).json({ error: 'Failed to execute governance tasks' });
  }
});
