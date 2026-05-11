import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { CheckCircle2, XCircle, PauseCircle, Send, Download } from 'lucide-react';

const COMMON_DEFS = {
  prenom: { label: 'Prénom', type: 'text' },
  nom: { label: 'Nom', type: 'text' },
  codeInterne: { label: 'Code interne', type: 'text' },
  structure: { label: 'Structure', type: 'text' },
  filiereService: { label: 'Filière ou service', type: 'text' },
  dateNaissance: { label: 'Date de naissance', type: 'date' },
};

function commonKeysForType(typeName) {
  const t = typeName || '';
  if (t.includes('Scolarité')) return ['prenom', 'nom', 'codeInterne', 'structure', 'filiereService'];
  if (t.includes('Stage')) return ['prenom', 'nom', 'structure'];
  if (t.includes('Travail')) return ['prenom', 'nom', 'structure'];
  if (t.includes('Formation')) return ['prenom', 'nom'];
  if (t.includes('Participation')) return ['prenom', 'nom'];
  if (t.includes('Médicale')) return ['prenom', 'nom', 'dateNaissance'];
  return ['prenom', 'nom'];
}

function guessNameParts(fullName) {
  const s = (fullName || '').trim();
  if (!s) return { prenom: '', nom: '' };
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { prenom: parts[0], nom: '' };
  return { prenom: parts.slice(0, -1).join(' '), nom: parts[parts.length - 1] };
}

function normalizeAttestationType(t) {
  if (!t) return t;
  const dynamic_fields = t.dynamic_fields ?? t.dynamicFields ?? [];
  return { ...t, dynamic_fields };
}

function buildInitialFieldValues(type, profileFullName) {
  if (!type) return {};
  const t = normalizeAttestationType(type);
  const common = commonKeysForType(t.name);
  const { prenom, nom } = guessNameParts(profileFullName);
  const next = {};
  for (const k of common) {
    if (k === 'prenom') next[k] = prenom;
    else if (k === 'nom') next[k] = nom;
    else next[k] = '';
  }
  const fields = t.dynamic_fields || [];
  for (const df of fields) {
    next[df.name] = '';
  }
  return next;
}

function validateBeforeSubmit(type, fieldValues) {
  if (!type) return 'Choisissez un type d’attestation.';
  const common = commonKeysForType(type.name);
  for (const k of common) {
    if (!String(fieldValues[k] ?? '').trim()) {
      return `Le champ « ${COMMON_DEFS[k]?.label || k} » est requis.`;
    }
  }
  const fields = normalizeAttestationType(type).dynamic_fields || [];
  for (const df of fields) {
    if (df.required && !String(fieldValues[df.name] ?? '').trim()) {
      return `Le champ « ${df.label || df.name} » est requis.`;
    }
  }
  return null;
}

export function RequestsPage() {
  const { profile, session } = useAuth();
  const [items, setItems] = useState([]);
  const [types, setTypes] = useState([]);
  const [typesError, setTypesError] = useState(null);
  const [typesReady, setTypesReady] = useState(false);
  const [filters, setFilters] = useState({ status: '' });
  const [createOpen, setCreateOpen] = useState(false);
  const [attestationTypeId, setAttestationTypeId] = useState('');
  const [fieldValues, setFieldValues] = useState({});

  const isStaff = profile?.role === 'administrator' || profile?.role === 'administrative_agent';
  const displayName = profile?.full_name?.trim() || profile?.email || 'Votre compte';
  const selectedType = useMemo(() => types.find((x) => x.id === attestationTypeId) || null, [types, attestationTypeId]);

  const load = async () => {
    const res = await api.get('/requests', { params: { status: filters.status || undefined } });
    setItems(res.data.items || []);
  };

  useEffect(() => {
    if (!session) return;
    load();
  }, [filters.status, session]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    async function boot() {
      setTypesError(null);
      setTypesReady(false);
      try {
        const t = await api.get('/attestation-types');
        if (!cancelled) {
          setTypes((t.data.items || []).map(normalizeAttestationType));
          setTypesError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setTypes([]);
          const msg = e.message || 'Could not load attestation types';
          setTypesError(msg);
          toast.error(msg);
        }
      } finally {
        if (!cancelled) setTypesReady(true);
      }
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const openCreate = () => {
    setAttestationTypeId('');
    setFieldValues({});
    setCreateOpen(true);
  };

  const onTypeChange = (id) => {
    setAttestationTypeId(id);
    const t = types.find((x) => x.id === id);
    setFieldValues(buildInitialFieldValues(t, profile?.full_name));
  };

  const approve = async (id) => {
    try {
      await api.post(`/requests/${id}/approve`);
      toast.success('Approved — PDF generated');
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const reject = async (id) => {
    const reason = prompt('Rejection reason (optional)') || '';
    try {
      await api.post(`/requests/${id}/reject`, { rejectionReason: reason });
      toast.success('Rejected');
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const downloadAttestation = async (requestId) => {
    try {
      const { data: attestations } = await api.get('/attestations', { params: { requestId } });
      if (!attestations.items || attestations.items.length === 0) {
        toast.error('No attestation found');
        return;
      }
      const att = attestations.items[0];
      const { data: urlData } = await api.get(`/attestations/${att.id}/download-url`);
      window.open(urlData.url, '_blank');
    } catch (e) {
      toast.error(e.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-300', badge: 'bg-emerald-200 dark:bg-emerald-900' };
      case 'on_hold':
        return { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-300', badge: 'bg-amber-200 dark:bg-amber-900' };
      case 'rejected':
        return { bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-300', badge: 'bg-red-200 dark:bg-red-900' };
      case 'pending':
      default:
        return { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-300', badge: 'bg-blue-200 dark:bg-blue-900' };
    }
  };

  const hold = async (id) => {
    try {
      await api.patch(`/requests/${id}`, { status: 'on_hold' });
      toast.success('On hold');
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    const err = validateBeforeSubmit(selectedType, fieldValues);
    if (err) {
      toast.error(err);
      return;
    }
    const payload = { ...fieldValues };
    for (const df of selectedType?.dynamic_fields || []) {
      if (df.type === 'number' && payload[df.name] !== '' && payload[df.name] != null) {
        const n = Number(payload[df.name]);
        payload[df.name] = Number.isFinite(n) ? n : payload[df.name];
      }
    }
    try {
      await api.post('/requests', {
        attestationTypeId,
        formPayload: payload,
      });
      toast.success('Request submitted');
      setCreateOpen(false);
      load();
    } catch (err) {
      toast.error(err.message || 'Submit failed');
    }
  };

  const commonKeys = selectedType ? commonKeysForType(selectedType.name) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Requests</h1>
          <p className="text-sm text-slate-500">Submit, review, and issue attestations</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-700"
        >
          <Send className="h-4 w-4" />
          New request
        </button>
      </div>

      {typesError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          <p className="font-medium">Attestation types could not be loaded</p>
          <p className="mt-1">{typesError}</p>
          <p className="mt-2 text-xs opacity-90">
            Ensure the API is running (e.g. <code className="rounded bg-red-100 px-1 dark:bg-red-900/60">cd server</code> then{' '}
            <code className="rounded bg-red-100 px-1 dark:bg-red-900/60">npm run dev</code>) and that{' '}
            <code className="rounded bg-red-100 px-1 dark:bg-red-900/60">VITE_API_URL</code> ends with{' '}
            <code className="rounded bg-red-100 px-1 dark:bg-red-900/60">/api</code> if you point to a full host.
          </p>
        </div>
      )}

      {typesReady && !typesError && types.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-medium">No attestation types in the database yet</p>
          <p className="mt-1 text-xs opacity-90">
            Seed the six default types from the server folder (with <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/50">.env</code> configured):{' '}
            <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/50">npm run seed:types</code>
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {['', 'pending', 'on_hold', 'approved', 'rejected'].map((s) => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => setFilters({ status: s })}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              filters.status === s ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3">Titulaire</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              {isStaff && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-medium">{r.beneficiaries?.name || '—'}</td>
                <td className="px-4 py-3">{r.attestation_types?.name || '—'}</td>
                <td className="px-4 py-3 capitalize">{r.status.replace('_', ' ')}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(r.created_at).toLocaleString()}</td>
                {isStaff && (
                  <td className="px-4 py-3 text-right">
                    {['pending', 'on_hold'].includes(r.status) && (
                      <div className="flex justify-end gap-1">
                        <button type="button" title="Approve" className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30" onClick={() => approve(r.id)}>
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button type="button" title="Hold" className="rounded-lg p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30" onClick={() => hold(r.id)}>
                          <PauseCircle className="h-4 w-4" />
                        </button>
                        <button type="button" title="Reject" className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40" onClick={() => reject(r.id)}>
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={submitCreate} className="max-h-[90vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h2 className="font-display text-lg font-semibold">Nouvelle demande d’attestation</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Cette demande est établie à votre nom : <span className="font-medium text-slate-900 dark:text-slate-100">{displayName}</span>. Aucun autre titulaire n’est sélectionné.
            </p>
            <select
              required
              className="w-full rounded-xl border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              value={attestationTypeId}
              onChange={(e) => onTypeChange(e.target.value)}
            >
              <option value="">Type d’attestation</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (v{t.version})
                </option>
              ))}
            </select>

            {selectedType && (
              <>
                <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Vos informations</p>
                  {commonKeys.map((key) => {
                    const def = COMMON_DEFS[key];
                    if (!def) return null;
                    return (
                      <label key={key} className="block text-sm">
                        <span className="mb-1 block text-slate-600 dark:text-slate-400">{def.label}</span>
                        <input
                          type={def.type}
                          required
                          className="w-full rounded-xl border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                          value={fieldValues[key] ?? ''}
                          onChange={(e) => setFieldValues((fv) => ({ ...fv, [key]: e.target.value }))}
                        />
                      </label>
                    );
                  })}
                </div>

                <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Détails du type « {selectedType.name} »</p>
                  {(selectedType.dynamic_fields || []).map((df) => (
                    <label key={df.name} className="block text-sm">
                      <span className="mb-1 block text-slate-600 dark:text-slate-400">
                        {df.label || df.name}
                        {df.required ? ' *' : ''}
                      </span>
                      {df.type === 'number' ? (
                        <input
                          type="number"
                          required={!!df.required}
                          className="w-full rounded-xl border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                          value={fieldValues[df.name] ?? ''}
                          onChange={(e) => setFieldValues((fv) => ({ ...fv, [df.name]: e.target.value }))}
                        />
                      ) : (
                        <input
                          type={df.type === 'date' ? 'date' : 'text'}
                          required={!!df.required}
                          className="w-full rounded-xl border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                          value={fieldValues[df.name] ?? ''}
                          onChange={(e) => setFieldValues((fv) => ({ ...fv, [df.name]: e.target.value }))}
                        />
                      )}
                    </label>
                  ))}
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <button type="button" className="rounded-xl border px-4 py-2 text-sm dark:border-slate-700" onClick={() => setCreateOpen(false)}>
                Annuler
              </button>
              <button
                type="submit"
                disabled={!selectedType}
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Envoyer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
