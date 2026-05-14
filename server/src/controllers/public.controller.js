import { supabaseAdmin } from '../lib/supabase.js';

/**
 * Public verification — minimal fields only (no PII).
 */
export async function verifyByToken(req, res, next) {
  try {
    const token = req.params.token;
    const { data: row, error } = await supabaseAdmin
      .from('attestations')
      .select(
        `
        id,
        status,
        unique_identifier,
        issued_at,
        expires_at,
        attestation_requests(
          attestation_types(name)
        )
      `
      )
      .eq('qr_token', token)
      .maybeSingle();

    if (error) throw error;
    if (!row) {
      return res.json({
        state: 'not_found',
        message: 'No attestation matches this code.',
      });
    }

    const now = new Date();
    const reqRow = Array.isArray(row.attestation_requests) ? row.attestation_requests[0] : row.attestation_requests;
    const at = reqRow?.attestation_types;
    const typeName = Array.isArray(at) ? at[0]?.name : at?.name ?? null;

    if (row.expires_at && new Date(row.expires_at) < now) {
      return res.json({
        state: 'expired',
        message: 'This attestation is no longer valid (expired).',
        documentIdSuffix: row.unique_identifier.slice(-6),
        typeName,
      });
    }
    if (row.status === 'revoked') {
      return res.json({
        state: 'revoked',
        message: 'This attestation has been revoked by the admin.',
        documentIdSuffix: row.unique_identifier.slice(-6),
        typeName,
      });
    }
    if (row.status === 'active') {
      return res.json({
        state: 'valid',
        message: 'This attestation is authentic and active.',
        issuedAt: row.issued_at,
        typeName,
        documentIdSuffix: row.unique_identifier.slice(-6),
      });
    }

    res.json({ state: 'unknown', message: 'Unable to determine status.' });
  } catch (e) {
    next(e);
  }
}
