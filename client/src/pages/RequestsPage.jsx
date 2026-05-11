import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { CheckCircle2, XCircle, PauseCircle, Send } from 'lucide-react';

export function RequestsPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [types, setTypes] = useState([]);
  const [filters, setFilters] = useState({ status: '' });
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ beneficiaryId: '', attestationTypeId: '', formPayload: '{}' });

  const isStaff = profile?.role === 'administrator' || profile?.role === 'administrative_agent';

  const load = async () => {
    const res = await api.get('/requests', { params: { status: filters.status || undefined } });
    setItems(res.data.items || []);
  };

  useEffect(() => {
    load();
  }, [filters.status]);

  useEffect(() => {
    async function boot() {
      try {
        const [b, t] = await Promise.all([api.get('/beneficiaries'), api.get('/attestation-types')]);
        setBeneficiaries(b.data.items || []);
        setTypes(t.data.items || []);
      } catch {
        /* beneficiary may not access types endpoint — ignore */
      }
    }
    boot();
  }, []);

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
    try {
      const payload = JSON.parse(form.formPayload || '{}');
      await api.post('/requests', {
        beneficiaryId: form.beneficiaryId,
        attestationTypeId: form.attestationTypeId,
        formPayload: payload,
      });
      toast.success('Request submitted');
      setCreateOpen(false);
      load();
    } catch (err) {
      toast.error(err.message || 'Invalid JSON payload');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Requests</h1>
          <p className="text-sm text-slate-500">Submit, review, and issue attestations</p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-700"
        >
          <Send className="h-4 w-4" />
          New request
        </button>
      </div>

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
              <th className="px-4 py-3">Beneficiary</th>
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
                        <button type="button" title="Reject" className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => reject(r.id)}>
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
          <form onSubmit={submitCreate} className="w-full max-w-lg space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h2 className="font-display text-lg font-semibold">New attestation request</h2>
            <select
              required
              className="w-full rounded-xl border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              value={form.beneficiaryId}
              onChange={(e) => setForm((f) => ({ ...f, beneficiaryId: e.target.value }))}
            >
              <option value="">Select beneficiary</option>
              {beneficiaries.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <select
              required
              className="w-full rounded-xl border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              value={form.attestationTypeId}
              onChange={(e) => setForm((f) => ({ ...f, attestationTypeId: e.target.value }))}
            >
              <option value="">Select type</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (v{t.version})
                </option>
              ))}
            </select>
            <textarea
              className="w-full rounded-xl border px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-950"
              rows={5}
              value={form.formPayload}
              onChange={(e) => setForm((f) => ({ ...f, formPayload: e.target.value }))}
            />
            <div className="flex justify-end gap-2">
              <button type="button" className="rounded-xl border px-4 py-2 text-sm dark:border-slate-700" onClick={() => setCreateOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
                Submit
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
