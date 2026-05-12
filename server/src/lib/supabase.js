import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false },
};

/** REST + auth only; avoids `ws` transport (breaks or is unnecessary on Vercel serverless). */
export const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, clientOptions);

/** Anon client — use for `auth.getUser(accessToken)` so user JWTs are validated like the browser client. */
export const supabaseAuth = createClient(env.supabaseUrl, env.supabaseAnonKey, clientOptions);
