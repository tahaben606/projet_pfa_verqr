import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  dynamicFieldsJson: z.string().min(2),
});

export function AttestationTypesPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(false);
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', dynamicFieldsJson: '[{"key":"purpose","label":"Purpose","type":"text"}]' },
  });

  const load = async () => {
    const res = await api.get('/attestation-types');
    setItems(res.data.items || []);
  };

  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (values) => {
    try {
      const dynamicFields = JSON.parse(values.dynamicFieldsJson);
      if (!Array.isArray(dynamicFields)) throw new Error('Dynamic fields must be a JSON array');
      await api.post('/attestation-types', {
        name: values.name,
        description: values.description,
        dynamicFields,
      });
      toast.success('Template created');
      setModal(false);
      form.reset();
      load();
    } catch (e) {
      toast.error(e.message || 'Invalid JSON');
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this template?')) return;
    try {
      await api.delete(`/attestation-types/${id}`);
      toast.success('Deleted');
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Attestation types</h1>
          <p className="text-sm text-slate-500">Templates with dynamic fields and versioning</p>
        </div>
        <button
          type="button"
          onClick={() => setModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          New template
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((t) => (
          <div key={t.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-display text-lg font-semibold">{t.name}</h3>
                <p className="text-xs text-slate-500">v{t.version}</p>
              </div>
              {profile?.role === 'administrator' && (
                <button type="button" className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40" onClick={() => remove(t.id)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t.description || '—'}</p>
            <pre className="mt-3 max-h-32 overflow-auto rounded-lg bg-slate-50 p-2 text-xs dark:bg-slate-950">
              {JSON.stringify(t.dynamic_fields || [], null, 2)}
            </pre>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-4 font-display text-lg font-semibold">New attestation type</h2>
            <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
              <input className="w-full rounded-xl border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Name" {...form.register('name')} />
              <textarea className="w-full rounded-xl border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Description" rows={2} {...form.register('description')} />
              <label className="block text-xs font-medium text-slate-500">Dynamic fields (JSON array)</label>
              <textarea className="w-full rounded-xl border px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-950" rows={8} {...form.register('dynamicFieldsJson')} />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="rounded-xl border px-4 py-2 text-sm dark:border-slate-700" onClick={() => setModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
