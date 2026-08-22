import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const jwtSecret = process.env.JWT_SECRET || 'gpu_allocator_secret_key_change_in_production';
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || jwtSecret.includes('change_in_production')) {
    throw new Error('❌ [CRITICAL SECURITY ERROR] Production environment detected without a secure custom JWT_SECRET set!');
  }
}

export const config = {
  port: parseInt(process.env.PORT || '8010', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://gpu_user:gpu_password@localhost:5470/gpu_allocator',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3010,http://127.0.0.1:3000,http://127.0.0.1:3010').split(','),
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  escalationTimeoutMinutes: parseInt(process.env.ESCALATION_TIMEOUT_MINUTES || '60', 10),
  telemetryRetentionDays: parseInt(process.env.TELEMETRY_RETENTION_DAYS || '7', 10),
  uploadDir: path.join(process.cwd(), 'uploads'),
};
