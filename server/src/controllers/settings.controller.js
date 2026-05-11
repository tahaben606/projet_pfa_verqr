import { supabaseAdmin } from '../lib/supabase.js';
import { logAudit } from '../services/audit.service.js';

export async function getMe(req, res, next) {
  try {
    res.json(req.user);
  } catch (e) {
    next(e);
  }
}

export async function updateMe(req, res, next) {
  try {
    const { fullName } = req.body;
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ full_name: fullName ?? null })
      .eq('id', req.user.id)
      .select()
      .single();
    if (error) throw error;
    await logAudit({
      userId: req.user.id,
      action: 'profile_update',
      entityType: 'user',
      entityId: req.user.id,
      ip: req.ip,
    });
    res.json(data);
  } catch (e) {
    next(e);
  }
}

export async function adminSetRole(req, res, next) {
  try {
    const { userId, role } = req.body;
    const { data, error } = await supabaseAdmin.from('users').update({ role }).eq('id', userId).select().single();
    if (error) throw error;
    await logAudit({
      userId: req.user.id,
      action: 'admin_role_change',
      entityType: 'user',
      entityId: userId,
      metadata: { role },
      ip: req.ip,
    });
    res.json(data);
  } catch (e) {
    next(e);
  }
}
