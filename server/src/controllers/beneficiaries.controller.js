import { supabaseAdmin } from '../lib/supabase.js';
import { logAudit } from '../services/audit.service.js';

export async function listBeneficiaries(req, res, next) {
  try {
    const q = (req.query.q || '').toString().trim();
    let query = supabaseAdmin.from('beneficiaries').select('*').order('created_at', { ascending: false });
    if (q) {
      query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,department.ilike.%${q}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    res.json({ items: data });
  } catch (e) {
    next(e);
  }
}

export async function createBeneficiary(req, res, next) {
  try {
    const { name, email, phone, department, birthDate } = req.body;
    const { data, error } = await supabaseAdmin
      .from('beneficiaries')
      .insert({
        created_by: req.user.id,
        name,
        email: email || null,
        phone: phone || null,
        department: department || null,
        birth_date: birthDate || null,
      })
      .select()
      .single();
    if (error) throw error;
    await logAudit({
      userId: req.user.id,
      action: 'beneficiary_create',
      entityType: 'beneficiary',
      entityId: data.id,
      ip: req.ip,
    });
    res.status(201).json(data);
  } catch (e) {
    next(e);
  }
}

export async function updateBeneficiary(req, res, next) {
  try {
    const id = req.params.id;
    const { name, email, phone, department, birthDate } = req.body;
    const { data, error } = await supabaseAdmin
      .from('beneficiaries')
      .update({
        name,
        email: email || null,
        phone: phone || null,
        department: department || null,
        birth_date: birthDate || null,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    await logAudit({
      userId: req.user.id,
      action: 'beneficiary_update',
      entityType: 'beneficiary',
      entityId: id,
      ip: req.ip,
    });
    res.json(data);
  } catch (e) {
    next(e);
  }
}

export async function deleteBeneficiary(req, res, next) {
  try {
    const id = req.params.id;
    const { error } = await supabaseAdmin.from('beneficiaries').delete().eq('id', id);
    if (error) throw error;
    await logAudit({
      userId: req.user.id,
      action: 'beneficiary_delete',
      entityType: 'beneficiary',
      entityId: id,
      ip: req.ip,
    });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
}
