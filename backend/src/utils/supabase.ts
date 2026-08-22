import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

export const supabase = (config.supabaseUrl && config.supabaseKey)
  ? createClient(config.supabaseUrl, config.supabaseKey, {
      auth: { persistSession: false },
    })
  : null;
