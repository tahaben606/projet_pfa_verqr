import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import { env } from '../config/env.js';

export const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: ws },
});

/** Anon client — use for `auth.getUser(accessToken)` so user JWTs are validated like the browser client. */
export const supabaseAuth = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  // Node.js 20: Realtime needs `ws` or createClient throws at import time
  realtime: { transport: ws },
});
