import { supabaseAdmin } from '../lib/supabase.js';
import { logAudit } from '../services/audit.service.js';
import { buildAttestationPdfBuffer } from '../services/pdf.service.js';
import { generateQrToken, qrPngBuffer, verificationUrl } from '../services/qr.service.js';
import { uniqueAttestationId } from '../utils/id.js';

async function loadRequestBundle(id) {
  const { data: request, error } = await supabaseAdmin
    .from('attestation_requests')
    .select(
      `
      *,
      beneficiaries(*),
      attestation_types(*)
    `
    )
    .eq('id', id)
    .single();
  if (error) throw error;
  return request;
}

export async function listRequests(req, res, next) {
  try {
    const { status, typeId, from, to, submittedBy } = req.query;
    let q = supabaseAdmin
      .from('attestation_requests')
      .select(
        `
        *,
        beneficiaries(id,name,email,department),
        attestation_types(id,name,version)
      `
      )
      .order('created_at', { ascending: false });

    if (status) q = q.eq('status', status);
    if (typeId) q = q.eq('attestation_type_id', typeId);
    if (submittedBy) q = q.eq('submitted_by', submittedBy);
    if (from) q = q.gte('created_at', from);
    if (to) q = q.lte('created_at', to);

    if (req.user.role === 'beneficiary') {
      q = q.eq('submitted_by', req.user.id);
    }

    const { data, error } = await q;
    if (error) throw error;
    res.json({ items: data });
  } catch (e) {
    next(e);
  }
}

export async function createRequest(req, res, next) {
  try {
    const { beneficiaryId, attestationTypeId, formPayload } = req.body;
    const { data, error } = await supabaseAdmin
      .from('attestation_requests')
      .insert({
        beneficiary_id: beneficiaryId,
        attestation_type_id: attestationTypeId,
        submitted_by: req.user.id,
        form_payload: formPayload || {},
        status: 'pending',
      })
      .select()
      .single();
    if (error) throw error;
    await logAudit({
      userId: req.user.id,
      action: 'request_create',
      entityType: 'attestation_request',
      entityId: data.id,
      ip: req.ip,
    });
    res.status(201).json(data);
  } catch (e) {
    next(e);
  }
}

export async function updateRequest(req, res, next) {
  try {
    const id = req.params.id;
    const { status, rejectionReason, comments, assignedTo } = req.body;
    const patch = {};
    if (status) patch.status = status;
    if (rejectionReason !== undefined) patch.rejection_reason = rejectionReason;
    if (comments !== undefined) patch.comments = comments;
    if (assignedTo !== undefined) patch.assigned_to = assignedTo;

    const { data, error } = await supabaseAdmin
      .from('attestation_requests')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    await logAudit({
      userId: req.user.id,
      action: 'request_update',
      entityType: 'attestation_request',
      entityId: id,
      metadata: patch,
      ip: req.ip,
    });
    res.json(data);
  } catch (e) {
    next(e);
  }
}

export async function approveRequest(req, res, next) {
  try {
    const id = req.params.id;
    const request = await loadRequestBundle(id);
    if (!['pending', 'on_hold'].includes(request.status)) {
      return res.status(400).json({ error: 'Request cannot be approved in current status' });
    }

    const qrToken = generateQrToken();
    const uid = uniqueAttestationId();
    const verifyUrl = verificationUrl(qrToken);

    const { data: att, error: ae } = await supabaseAdmin
      .from('attestations')
      .insert({
        request_id: request.id,
        unique_identifier: uid,
        qr_token: qrToken,
        status: 'active',
        issued_by: req.user.id,
        pdf_storage_path: null,
      })
      .select()
      .single();
    if (ae) throw ae;

    const qrBuf = await qrPngBuffer(verifyUrl);
    const typeName = request.attestation_types?.name || 'Attestation';
    const issueDateIso = new Date().toISOString().slice(0, 10);
    const safeFields = {
      Department: request.beneficiaries?.department || '',
      ...Object.fromEntries(
        Object.entries(request.form_payload || {}).filter(([k]) =>
          ['purpose', 'program', 'period', 'reference'].some((p) => k.toLowerCase().includes(p))
        )
      ),
    };

    const pdfBuf = await buildAttestationPdfBuffer({
      qrPng: qrBuf,
      uniqueIdentifier: uid,
      typeName,
      issueDateIso,
      safeFields: {
        'Attestation type': typeName,
        ...safeFields,
      },
    });

    const storagePath = `${att.id}.pdf`;
    const { error: upErr } = await supabaseAdmin.storage
      .from('attestations')
      .upload(storagePath, pdfBuf, { contentType: 'application/pdf', upsert: true });
    if (upErr) {
      await supabaseAdmin.from('attestations').delete().eq('id', att.id);
      throw upErr;
    }

    const { error: ue } = await supabaseAdmin
      .from('attestations')
      .update({ pdf_storage_path: storagePath })
      .eq('id', att.id);
    if (ue) throw ue;

    const { error: re } = await supabaseAdmin
      .from('attestation_requests')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', request.id);
    if (re) throw re;

    await logAudit({
      userId: req.user.id,
      action: 'request_approve',
      entityType: 'attestation_request',
      entityId: request.id,
      metadata: { attestationId: att.id },
      ip: req.ip,
    });
    await logAudit({
      userId: req.user.id,
      action: 'pdf_generate',
      entityType: 'attestation',
      entityId: att.id,
      ip: req.ip,
    });

    res.json({ attestationId: att.id, uniqueIdentifier: uid, qrToken });
  } catch (e) {
    next(e);
  }
}

export async function rejectRequest(req, res, next) {
  try {
    const id = req.params.id;
    const { rejectionReason, comments } = req.body;
    const { data, error } = await supabaseAdmin
      .from('attestation_requests')
      .update({
        status: 'rejected',
        rejection_reason: rejectionReason || null,
        comments: comments || null,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    await logAudit({
      userId: req.user.id,
      action: 'request_reject',
      entityType: 'attestation_request',
      entityId: id,
      ip: req.ip,
    });
    res.json(data);
  } catch (e) {
    next(e);
  }
}
