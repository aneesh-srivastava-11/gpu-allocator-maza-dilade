-- Enable pg_cron extension on Supabase Postgres
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1. Automated Session Expiry and Machine Allocation Reset (Runs every 1 minute)
SELECT cron.schedule(
  'auto-expire-gpu-sessions',
  '* * * * *',
  $$
    -- Complete expired active requests
    UPDATE requests 
    SET status = 'completed' 
    WHERE status = 'active' AND end_time <= NOW();

    -- Complete corresponding active sessions
    UPDATE sessions 
    SET status = 'completed', ended_at = NOW() 
    WHERE status = 'active' AND request_id IN (
      SELECT id FROM requests WHERE status = 'completed'
    );

    -- Reset machine status to idle when no active requests remain
    UPDATE machines 
    SET status = 'idle' 
    WHERE status = 'allocated' AND id NOT IN (
      SELECT machine_id FROM requests WHERE status = 'active'
    );
  $$
);

-- 2. Automated Privacy Telemetry Retention Pruning (Runs daily at midnight)
SELECT cron.schedule(
  'prune-old-telemetry',
  '0 0 * * *',
  $$
    DELETE FROM telemetry_reports 
    WHERE reported_at < NOW() - INTERVAL '7 days';
  $$
);
