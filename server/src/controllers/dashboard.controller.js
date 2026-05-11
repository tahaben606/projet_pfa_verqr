import { supabaseAdmin } from '../lib/supabase.js';

export async function getStats(_req, res, next) {
  try {
    const [pending, approvedReq, rejected, onHold, activeAtt, revoked] = await Promise.all([
      supabaseAdmin.from('attestation_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabaseAdmin.from('attestation_requests').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
      supabaseAdmin.from('attestation_requests').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
      supabaseAdmin.from('attestation_requests').select('id', { count: 'exact', head: true }).eq('status', 'on_hold'),
      supabaseAdmin.from('attestations').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabaseAdmin.from('attestations').select('id', { count: 'exact', head: true }).eq('status', 'revoked'),
    ]);

    const { data: recent } = await supabaseAdmin
      .from('audit_logs')
      .select('id,action,entity_type,entity_id,user_id,created_at')
      .order('created_at', { ascending: false })
      .limit(12);

    res.json({
      pendingRequests: pending.count ?? 0,
      approvedRequests: approvedReq.count ?? 0,
      rejectedRequests: rejected.count ?? 0,
      onHoldRequests: onHold.count ?? 0,
      activeAttestations: activeAtt.count ?? 0,
      revokedAttestations: revoked.count ?? 0,
      recentActivity: (recent || []).map((r) => ({
        id: r.id,
        action: r.action,
        entityType: r.entity_type,
        entityId: r.entity_id,
        userId: r.user_id,
        createdAt: r.created_at,
      })),
    });
  } catch (e) {
    next(e);
  }
}
