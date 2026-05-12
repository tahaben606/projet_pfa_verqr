import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import { isSupabaseConfigured, isUnsupportedSupabaseAnonKey } from '../lib/supabase.js';
import { ShieldCheck } from 'lucide-react';

const schema = z
  .object({
    fullName: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    confirm: z.string().min(6),
  })
  .refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });

export function RegisterPage() {
  const { signUp } = useAuth();
  const [busy, setBusy] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (values) => {
    setBusy(true);
    try {
      await signUp(values.email, values.password, values.fullName);
      toast.success('Account created. Check your email if confirmation is required.');
    } catch (e) {
      toast.error(e.message || 'Registration failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 p-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white/90 p-8 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-500/30">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="font-display text-2xl font-bold">Create account</h1>
          <p className="mt-1 text-sm text-slate-500">You will be assigned the Beneficiary role by default</p>
          {isUnsupportedSupabaseAnonKey && (
            <div
              role="alert"
              className="mt-4 w-full rounded-xl border border-red-200 bg-red-50 p-3 text-left text-xs text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100"
            >
              Replace <code className="rounded bg-black/5 px-1">sb_publishable_*</code> with the{' '}
              <strong>anon JWT</strong> (<code className="rounded bg-black/5 px-1">eyJ…</code>) from Supabase → Settings → API, as <code className="rounded bg-black/5 px-1">VITE_SUPABASE_ANON_KEY</code>, then redeploy.
            </div>
          )}
          {!isSupabaseConfigured && !isUnsupportedSupabaseAnonKey && (
            <div
              role="alert"
              className="mt-4 w-full rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
            >
              Set <code className="rounded bg-black/5 px-1 dark:bg-white/10">VITE_SUPABASE_URL</code> and{' '}
              <code className="rounded bg-black/5 px-1 dark:bg-white/10">VITE_SUPABASE_ANON_KEY</code> on Vercel, then redeploy.
            </div>
          )}
        </div>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="mb-1 block text-sm font-medium">Full name</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
              {...register('fullName')}
            />
            {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
              {...register('email')}
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Password</label>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
              {...register('password')}
            />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Confirm password</label>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
              {...register('confirm')}
            />
            {errors.confirm && <p className="mt-1 text-xs text-red-600">{errors.confirm.message}</p>}
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700 disabled:opacity-60"
          >
            {busy ? 'Creating…' : 'Register'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link className="font-medium text-brand-600 hover:underline" to="/login">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
