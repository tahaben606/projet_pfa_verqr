import { supabaseAdmin } from '../lib/supabase.js';

async function fetchStaffStats() {
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

  return {
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
  };
}

async function fetchBeneficiaryDashboard(userId) {
  const base = () =>
    supabaseAdmin.from('attestation_requests').select('id', { count: 'exact', head: true }).eq('submitted_by', userId);

  const [pending, approvedReq, rejected, onHold] = await Promise.all([
    base().eq('status', 'pending'),
    base().eq('status', 'approved'),
    base().eq('status', 'rejected'),
    base().eq('status', 'on_hold'),
  ]);

  const { data: rows } = await supabaseAdmin
    .from('attestation_requests')
    .select('id,status,created_at,attestation_types(name)')
    .eq('submitted_by', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  const recentRequests = (rows || []).map((r) => {
    const at = r.attestation_types;
    const typeName = Array.isArray(at) ? at[0]?.name : at?.name;
    return {
      id: r.id,
      status: r.status,
      createdAt: r.created_at,
      typeName: typeName || '—',
    };
  });

  return {
    pendingRequests: pending.count ?? 0,
    approvedRequests: approvedReq.count ?? 0,
    rejectedRequests: rejected.count ?? 0,
    onHoldRequests: onHold.count ?? 0,
    recentRequests,
  };
}

async function fetchVerifierDashboard() {
  const [activeAtt, revoked, expired] = await Promise.all([
    supabaseAdmin.from('attestations').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from('attestations').select('id', { count: 'exact', head: true }).eq('status', 'revoked'),
    supabaseAdmin.from('attestations').select('id', { count: 'exact', head: true }).eq('status', 'expired'),
  ]);

  const { data: rows } = await supabaseAdmin
    .from('attestations')
    .select(
      `
      id,
      unique_identifier,
      status,
      issued_at,
      attestation_requests(
        attestation_types(name)
      )
    `
    )
    .order('issued_at', { ascending: false })
    .limit(10);

  const recentAttestations = (rows || []).map((row) => {
    const req = Array.isArray(row.attestation_requests) ? row.attestation_requests[0] : row.attestation_requests;
    const at = req?.attestation_types;
    const typeName = Array.isArray(at) ? at[0]?.name : at?.name;
    return {
      id: row.id,
      uniqueIdentifier: row.unique_identifier,
      status: row.status,
      issuedAt: row.issued_at,
      typeName: typeName || '—',
    };
  });

  return {
    activeAttestations: activeAtt.count ?? 0,
    revokedAttestations: revoked.count ?? 0,
    expiredAttestations: expired.count ?? 0,
    recentAttestations,
  };
}

/** Unified dashboard for all authenticated roles */
export async function getDashboard(req, res, next) {
  try {
    const role = req.user.role;

    if (role === 'administrator' || role === 'administrative_agent') {
      const stats = await fetchStaffStats();
      return res.json({
        variant: 'staff',
        role,
        staffTitle: role === 'administrator' ? 'administrator' : 'agent',
        ...stats,
      });
    }

    if (role === 'beneficiary') {
      const data = await fetchBeneficiaryDashboard(req.user.id);
      return res.json({
        variant: 'beneficiary',
        role,
        ...data,
      });
    }

    if (role === 'external_verifier') {
      const data = await fetchVerifierDashboard();
      return res.json({
        variant: 'verifier',
        role,
        ...data,
      });
    }

    res.status(400).json({ error: 'Unsupported role for dashboard' });
  } catch (e) {
    next(e);
  }
}
