import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { api } from '../lib/api.js';

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  department: z.string().optional(),
  birthDate: z.string().optional(),
});

export function BeneficiariesPage() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const res = await api.get('/beneficiaries', { params: { q } });
    setItems(res.data.items || []);
  };

  useEffect(() => {
    load();
  }, []);

  const form = useForm({ resolver: zodResolver(schema), defaultValues: { name: '', email: '', phone: '', department: '', birthDate: '' } });

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: '', email: '', phone: '', department: '', birthDate: '' });
    setModal('form');
  };

  const openEdit = (row) => {
    setEditing(row);
    form.reset({
      name: row.name,
      email: row.email || '',
      phone: row.phone || '',
      department: row.department || '',
      birthDate: row.birth_date || '',
    });
    setModal('form');
  };

  const onSubmit = async (values) => {
    try {
      const payload = {
        name: values.name,
        email: values.email || undefined,
        phone: values.phone || undefined,
        department: values.department || undefined,
        birthDate: values.birthDate || undefined,
      };
      if (editing) await api.patch(`/beneficiaries/${editing.id}`, payload);
      else await api.post('/beneficiaries', payload);
      toast.success(editing ? 'Updated' : 'Created');
      setModal(null);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this beneficiary?')) return;
    try {
      await api.delete(`/beneficiaries/${id}`);
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
          <h1 className="font-display text-2xl font-bold">Beneficiaries</h1>
          <p className="text-sm text-slate-500">Manage people referenced on attestations</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          New beneficiary
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-900"
          placeholder="Search name, email, department…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Birth date</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                <td className="px-4 py-3 font-medium">{b.name}</td>
                <td className="px-4 py-3 text-slate-600">{b.email || '—'}</td>
                <td className="px-4 py-3">{b.department || '—'}</td>
                <td className="px-4 py-3">{b.birth_date || '—'}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" className="mr-2 inline-flex rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => openEdit(b)}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" className="inline-flex rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40" onClick={() => remove(b.id)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal === 'form' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-4 font-display text-lg font-semibold">{editing ? 'Edit beneficiary' : 'New beneficiary'}</h2>
            <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
              <input className="w-full rounded-xl border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Name" {...form.register('name')} />
              <input className="w-full rounded-xl border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Email" {...form.register('email')} />
              <input className="w-full rounded-xl border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Phone" {...form.register('phone')} />
              <input className="w-full rounded-xl border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Department" {...form.register('department')} />
              <input type="date" className="w-full rounded-xl border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" {...form.register('birthDate')} />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="rounded-xl border px-4 py-2 text-sm dark:border-slate-700" onClick={() => setModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
