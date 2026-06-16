import { supabaseAdmin } from '../lib/supabase.js';
import { logAudit } from '../services/audit.service.js';
import { buildFrenchCertificateParagraph } from '../services/attestationCopy.service.js';
import { buildAttestationPdfBuffer } from '../services/pdf.service.js';
import { generateQrToken, qrPngBuffer, verificationUrl } from '../services/qr.service.js';
import { uniqueAttestationId } from '../utils/id.js';
import { sendApprovalEmail } from '../services/email.service.js';

const IDENTITY_FORM_KEYS = ['prenom', 'nom', 'codeInterne', 'structure', 'filiereService', 'dateNaissance'];

async function ensureSelfBeneficiaryId(user) {
  console.log('ensureSelfBeneficiaryId called with user:', { id: user.id, email: user.email });

  if (user.email) {
    const { data: match } = await supabaseAdmin
      .from('beneficiaries')
      .select('id')
      .eq('created_by', user.id)
      .eq('email', user.email)
      .maybeSingle();
    console.log('beneficiary match result:', match);
    if (match?.id) {
      console.log('found existing beneficiary by email:', match.id);
      return match.id;
    }
  }

  const { data: fallback } = await supabaseAdmin
    .from('beneficiaries')
    .select('id')
    .eq('created_by', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  console.log('fallback beneficiary result:', fallback);
  if (fallback?.id) {
    console.log('found existing beneficiary by user:', fallback.id);
    return fallback.id;
  }

  console.log('creating new beneficiary...');
  const { data: newBen, error } = await supabaseAdmin
    .from('beneficiaries')
    .insert({
      created_by: user.id,
      name: user.full_name || user.email?.split('@')[0] || 'Unknown',
      email: user.email || null,
    })
    .select('id')
    .single();
  if (error) {
    console.error('beneficiary insert error:', error);
    throw error;
  }
  console.log('created new beneficiary:', newBen.id);
  return newBen.id;
}

function splitIdentityFromFormPayload(formPayload) {
  const src = formPayload && typeof formPayload === 'object' ? formPayload : {};
  const identity = {};
  const typePayload = { ...src };
  for (const k of IDENTITY_FORM_KEYS) {
    if (Object.prototype.hasOwnProperty.call(typePayload, k)) {
      const v = typePayload[k];
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        identity[k] = v;
      }
      delete typePayload[k];
    }
  }
  return { identity, typePayload };
}

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
    const { attestationTypeId, formPayload: rawPayload } = req.body;
    console.log('createRequest called:', { attestationTypeId, rawPayloadType: typeof rawPayload });

    const formPayload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {};

    const beneficiaryId = await ensureSelfBeneficiaryId(req.user);
    console.log('ensureSelfBeneficiaryId result:', beneficiaryId);

    const { identity, typePayload } = splitIdentityFromFormPayload(formPayload);
    console.log('split payload:', { identity, typePayloadKeys: Object.keys(typePayload) });

    // Only update email and combined name in database; other fields stay in form_payload for PDF only
    const benPatch = { email: req.user.email || null };
    const combinedName = [identity.prenom, identity.nom].filter(Boolean).join(' ').trim();
    if (combinedName) benPatch.name = combinedName;

    console.log('benPatch:', benPatch);
    const { error: benUpErr } = await supabaseAdmin.from('beneficiaries').update(benPatch).eq('id', beneficiaryId);
    if (benUpErr) {
      console.error('beneficiaries update error:', benUpErr);
      throw benUpErr;
    }

    console.log('about to insert request with:', { beneficiary_id: beneficiaryId, attestation_type_id: attestationTypeId, submitted_by: req.user.id, form_payload: typePayload, status: 'pending' });
    const { data, error } = await supabaseAdmin
      .from('attestation_requests')
      .insert({
        beneficiary_id: beneficiaryId,
        attestation_type_id: attestationTypeId,
        submitted_by: req.user.id,
        form_payload: typePayload,
        status: 'pending',
      })
      .select()
      .single();
    if (error) {
      console.error('attestation_requests insert error:', error);
      throw error;
    }
    console.log('request created:', data.id);
    await logAudit({
      userId: req.user.id,
      action: 'request_create',
      entityType: 'attestation_request',
      entityId: data.id,
      ip: req.ip,
    });
    res.status(201).json(data);
  } catch (e) {
    console.error('createRequest error:', e);
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
    console.log('approveRequest called for id:', id);

    const request = await loadRequestBundle(id);
    console.log('request loaded:', { id: request.id, status: request.status, typeName: request.attestation_types?.name });

    // Check for an existing attestation (handles retry after partial failure)
    const { data: existingAtt } = await supabaseAdmin
      .from('attestations')
      .select('*')
      .eq('request_id', request.id)
      .maybeSingle();

    if (!existingAtt && !['pending', 'on_hold'].includes(request.status)) {
      return res.status(400).json({ error: 'Request cannot be approved in current status' });
    }

    let att = existingAtt;

    if (!att) {
      const qrToken = generateQrToken();
      const uid = uniqueAttestationId();
      const verifyUrl = verificationUrl(qrToken);
      console.log('Generated tokens:', { qrToken: qrToken.slice(0, 8) + '...', uid, verifyUrl });

      const { data: newAtt, error: ae } = await supabaseAdmin
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
      if (ae) {
        console.error('attestations insert error:', ae);
        throw ae;
      }
      att = newAtt;
      console.log('attestation created:', att.id);
    } else {
      console.log('reusing existing attestation:', att.id);
    }

    const uid = att.unique_identifier;
    const qrToken = att.qr_token;
    const verifyUrl = verificationUrl(qrToken);

    console.log('Generating QR code...');
    const qrBuf = await qrPngBuffer(verifyUrl);
    console.log('QR code generated, size:', qrBuf.length, 'bytes');

    const typeName = request.attestation_types?.name || 'Attestation';
    const issueDateIso = new Date().toISOString().slice(0, 10);

    console.log('Building certificate paragraph...');
    const certificateBodyFr = buildFrenchCertificateParagraph({
      typeName,
      beneficiary: request.beneficiaries,
      formPayload: request.form_payload || {},
    });
    console.log('Certificate paragraph built, length:', certificateBodyFr.length);

    console.log('Building PDF...');
    const pdfBuf = await buildAttestationPdfBuffer({
      qrPng: qrBuf,
      uniqueIdentifier: uid,
      typeName,
      issueDateIso,
      certificateBodyFr,
      safeFields: {
        Type: typeName,
        Identifiant: uid,
      },
    });
    console.log('PDF built, size:', pdfBuf.length, 'bytes');

    const storagePath = `${att.id}.pdf`;
    console.log('Uploading PDF to storage:', storagePath);
    const { error: upErr } = await supabaseAdmin.storage
      .from('attestations')
      .upload(storagePath, pdfBuf, { contentType: 'application/pdf', upsert: true });
    if (upErr) {
      console.error('storage upload error:', upErr);
      // Only clean up the attestation row if it was freshly created (not a reused existing one)
      if (!existingAtt) {
        await supabaseAdmin.from('attestations').delete().eq('id', att.id);
      }
      throw upErr;
    }
    console.log('PDF uploaded successfully');

    const { error: ue } = await supabaseAdmin
      .from('attestations')
      .update({ pdf_storage_path: storagePath })
      .eq('id', att.id);
    if (ue) {
      console.error('attestations update error:', ue);
      throw ue;
    }

    const { error: re } = await supabaseAdmin
      .from('attestation_requests')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', request.id);
    if (re) {
      console.error('attestation_requests update error:', re);
      throw re;
    }

    if (request.beneficiaries?.email) {
      const beneficiaryName = request.beneficiaries.name || 'Beneficiary';
      const attestationTypeName = request.attestation_types?.name || 'Attestation';
      console.log('Sending approval email to:', request.beneficiaries.email);
      // Fire and forget email notification
      sendApprovalEmail(request.beneficiaries.email, beneficiaryName, attestationTypeName).catch(err => {
        console.error('Failed to send approval email asynchronously:', err);
      });
    }

    console.log('Logging audit...');
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

    console.log('approveRequest completed successfully');
    res.json({ attestationId: att.id, uniqueIdentifier: uid, qrToken });
  } catch (e) {
    console.error('approveRequest error:', e);
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
