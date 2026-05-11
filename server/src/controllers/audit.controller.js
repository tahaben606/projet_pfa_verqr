import { supabaseAdmin } from '../lib/supabase.js';

export async function listAuditLogs(req, res, next) {
  try {
    const { action, from, to } = req.query;
    let q = supabaseAdmin.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(500);
    if (action) q = q.eq('action', action);
    if (from) q = q.gte('created_at', from);
    if (to) q = q.lte('created_at', to);
    const { data, error } = await q;
    if (error) throw error;
    res.json({ items: data });
  } catch (e) {
    next(e);
  }
}
