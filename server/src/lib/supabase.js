import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import { env } from '../config/env.js';

export const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: ws },
});
