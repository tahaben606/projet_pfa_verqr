import { supabaseAdmin, supabaseAuth } from '../lib/supabase.js';
import { env } from '../config/env.js';

/**
 * Validates the browser access token via Supabase Auth.
 * Uses the **anon** client (not service_role) so `getUser(jwt)` matches how the JS client verifies tokens.
 */
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'Missing bearer token' });
    }

    const { data: authData, error: authErr } = await supabaseAuth.auth.getUser(token);
    if (authErr || !authData?.user) {
      const body = { error: 'Invalid or expired session' };
      if (env.nodeEnv === 'development' && authErr?.message) {
        body.detail = authErr.message;
      }
      return res.status(401).json(body);
    }

    const userId = authData.user.id;
    const { data: profile, error } = await supabaseAdmin
      .from('users')
      .select('id,email,full_name,role')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    if (!profile) {
      return res.status(403).json({ error: 'Profile not provisioned' });
    }
    req.user = profile;
    req.accessToken = token;
    next();
  } catch (e) {
    next(e);
  }
}

export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

export async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    req.user = null;
    req.userId = null;
    return next();
  }
  try {
    const { data: authData } = await supabaseAuth.auth.getUser(token);
    req.userId = authData?.user?.id ?? null;
  } catch {
    req.userId = null;
  }
  next();
}
