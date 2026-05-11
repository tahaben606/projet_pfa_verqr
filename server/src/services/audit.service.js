import { supabaseAdmin } from '../lib/supabase.js';

export async function logAudit({ userId, action, entityType, entityId, metadata, ip }) {
  await supabaseAdmin.from('audit_logs').insert({
    user_id: userId || null,
    action,
    entity_type: entityType || null,
    entity_id: entityId || null,
    metadata: metadata || null,
    ip_address: ip || null,
  });
}
