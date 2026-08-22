import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { wsManager } from './ws/manager';
import { errorHandler } from './middleware/error-handler.middleware';
import { runGovernanceTasks } from './tasks/scheduler';
import { seedDatabase } from './seed';

// Import routers
import { authRouter } from './controllers/auth.controller';
import { accountRouter } from './controllers/account.controller';
import { labRouter } from './controllers/lab.controller';
import { machineRouter } from './controllers/machine.controller';
import { requestRouter } from './controllers/request.controller';
import { sessionRouter } from './controllers/session.controller';
import { telemetryRouter } from './controllers/telemetry.controller';
import { auditRouter } from './controllers/audit.controller';
import { cronRouter } from './controllers/cron.controller';

const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow all origins for seamless serverless & cross-domain API access
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['*'],
  })
);

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serve local uploads (fallback for local development)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health Check
app.get('/', (req, res) => {
  return res.json({
    system: 'Department GPU Management System API',
    status: 'online',
    architecture: 'Serverless (Supabase + Vercel Ready)',
    version: '2.0.0 (TypeScript)',
  });
});

// Register Routers (Mounted under both /api and / for seamless compatibility)
const apiRouter = express.Router();
apiRouter.use(authRouter);
apiRouter.use(accountRouter);
apiRouter.use(labRouter);
apiRouter.use(machineRouter);
apiRouter.use(requestRouter);
apiRouter.use(sessionRouter);
apiRouter.use(telemetryRouter);
apiRouter.use(auditRouter);
apiRouter.use(cronRouter);

app.use('/api', apiRouter);
app.use('/', apiRouter);

// Global Error Handler
app.use(errorHandler);

// Initialize Stubbed WebSocket Manager (No-op in serverless, uses Supabase Realtime)
wsManager.init(server);

// Local Development Server Listener
if (process.env.NODE_ENV !== 'production' || process.env.LISTEN_LOCAL === 'true') {
  server.listen(config.port, async () => {
    console.log(`[SERVER] GPU Allocator TS API running on http://localhost:${config.port}`);
    try {
      await seedDatabase();
    } catch (err) {
      console.warn('[SERVER] Seed warning:', err);
    }
    // Perform initial governance check on boot
    runGovernanceTasks();
  });
}

// Export Express app for Vercel / Serverless Functions
export default app;
