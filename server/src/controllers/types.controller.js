import { supabaseAdmin } from '../lib/supabase.js';
import { logAudit } from '../services/audit.service.js';

export async function listTypes(_req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('attestation_types')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ items: data });
  } catch (e) {
    next(e);
  }
}

export async function createType(req, res, next) {
  try {
    const { name, description, dynamicFields } = req.body;
    const { data, error } = await supabaseAdmin
      .from('attestation_types')
      .insert({
        name,
        description: description || null,
        dynamic_fields: dynamicFields || [],
        created_by: req.user.id,
        version: 1,
      })
      .select()
      .single();
    if (error) throw error;
    await logAudit({
      userId: req.user.id,
      action: 'attestation_type_create',
      entityType: 'attestation_type',
      entityId: data.id,
      ip: req.ip,
    });
    res.status(201).json(data);
  } catch (e) {
    next(e);
  }
}

export async function updateType(req, res, next) {
  try {
    const id = req.params.id;
    const { name, description, dynamicFields } = req.body;
    const { data: current, error: fe } = await supabaseAdmin
      .from('attestation_types')
      .select('*')
      .eq('id', id)
      .single();
    if (fe) throw fe;

    const { data, error } = await supabaseAdmin
      .from('attestation_types')
      .insert({
        name: name ?? current.name,
        description: description ?? current.description,
        dynamic_fields: dynamicFields ?? current.dynamic_fields,
        version: (current.version || 1) + 1,
        parent_version_id: current.id,
        created_by: req.user.id,
      })
      .select()
      .single();
    if (error) throw error;
    await logAudit({
      userId: req.user.id,
      action: 'attestation_type_version',
      entityType: 'attestation_type',
      entityId: data.id,
      metadata: { previousId: current.id },
      ip: req.ip,
    });
    res.status(201).json(data);
  } catch (e) {
    next(e);
  }
}

export async function deleteType(req, res, next) {
  try {
    const id = req.params.id;
    const { error } = await supabaseAdmin.from('attestation_types').delete().eq('id', id);
    if (error) throw error;
    await logAudit({
      userId: req.user.id,
      action: 'attestation_type_delete',
      entityType: 'attestation_type',
      entityId: id,
      ip: req.ip,
    });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
}
