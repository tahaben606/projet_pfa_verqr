import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { supabaseAdmin } from '../lib/supabase.js';

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'Missing bearer token' });
    }
    const decoded = jwt.verify(token, env.supabaseJwtSecret, { algorithms: ['HS256'] });
    const userId = decoded.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }
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
    if (e.name === 'JsonWebTokenError' || e.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
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

export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    const decoded = jwt.verify(token, env.supabaseJwtSecret, { algorithms: ['HS256'] });
    req.userId = decoded.sub;
  } catch {
    req.userId = null;
  }
  next();
}
