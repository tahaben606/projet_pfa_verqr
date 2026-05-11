import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';

const schema = z.object({
  fullName: z.string().min(2),
});

export function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '' },
  });

  useEffect(() => {
    if (profile) form.reset({ fullName: profile.full_name || '' });
  }, [profile, form]);

  const onSave = async (values) => {
    setBusy(true);
    try {
      await api.patch('/me', { fullName: values.fullName });
      toast.success('Profile updated');
      await refreshProfile();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Settings & profile</h1>
        <p className="text-sm text-slate-500">Signed in as {profile?.email}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-display text-lg font-semibold">Profile</h2>
        <p className="mb-4 text-xs text-slate-500">Update the name shown on your account.</p>
        <form className="space-y-3" onSubmit={form.handleSubmit(onSave)}>
          <input className="w-full rounded-xl border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" {...form.register('fullName')} />
          <button type="submit" disabled={busy} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            Save
          </button>
        </form>
      </div>
    </div>
  );
}
