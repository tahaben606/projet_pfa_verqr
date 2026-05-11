import { supabaseAdmin } from '../lib/supabase.js';
import { logAudit } from '../services/audit.service.js';

export async function listAttestations(req, res, next) {
  try {
    const { status, requestId, from, to, q } = req.query;
    let query = supabaseAdmin
      .from('attestations')
      .select(
        `
        *,
        attestation_requests!inner(
          id,status,created_at,submitted_by,
          beneficiaries(name,department),
          attestation_types(name)
        )
      `
      )
      .order('issued_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (requestId) query = query.eq('request_id', requestId);
    if (from) query = query.gte('issued_at', from);
    if (to) query = query.lte('issued_at', to);
    if (q) query = query.ilike('unique_identifier', `%${q}%`);

    if (req.user.role === 'beneficiary') {
      query = query.eq('attestation_requests.submitted_by', req.user.id);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json({ items: data });
  } catch (e) {
    next(e);
  }
}

export async function revokeAttestation(req, res, next) {
  try {
    const id = req.params.id;
    const { error } = await supabaseAdmin
      .from('attestations')
      .update({ status: 'revoked', updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    await logAudit({
      userId: req.user.id,
      action: 'attestation_revoke',
      entityType: 'attestation',
      entityId: id,
      ip: req.ip,
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

export async function signedDownloadUrl(req, res, next) {
  try {
    const id = req.params.id;
    const { data: row, error } = await supabaseAdmin
      .from('attestations')
      .select('pdf_storage_path, attestation_requests(submitted_by)')
      .eq('id', id)
      .single();
    if (error) throw error;
    if (!row.pdf_storage_path) {
      return res.status(404).json({ error: 'PDF not available' });
    }

    if (req.user.role === 'beneficiary' && row.attestation_requests?.submitted_by !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { data: signed, error: se } = await supabaseAdmin.storage
      .from('attestations')
      .createSignedUrl(row.pdf_storage_path, 120);
    if (se) throw se;
    await logAudit({
      userId: req.user.id,
      action: 'pdf_download',
      entityType: 'attestation',
      entityId: id,
      ip: req.ip,
    });
    res.json({ url: signed.signedUrl });
  } catch (e) {
    next(e);
  }
}
