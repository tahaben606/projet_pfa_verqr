import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import { env } from '../config/env.js';

const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    fetch: (...args) => fetch(...args),
  },
  realtime: {
    transport: ws,
  },
};

/** REST + auth only; avoids native WebSocket issues on Node < 22. */
export const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, clientOptions);

/** Anon client — use for `auth.getUser(accessToken)` so user JWTs are validated like the browser client. */
export const supabaseAuth = createClient(env.supabaseUrl, env.supabaseAnonKey, clientOptions);

