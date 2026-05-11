import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import { ShieldCheck } from 'lucide-react';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

/** Paths restricted by role (must match `App.jsx` / `ProtectedRoute`). */
const RESTRICTED_PREFIXES = [
  { prefix: '/beneficiaries', roles: ['administrator', 'administrative_agent'] },
  { prefix: '/attestation-types', roles: ['administrator', 'administrative_agent'] },
  { prefix: '/audit', roles: ['administrator', 'administrative_agent'] },
  { prefix: '/archive', roles: ['administrator', 'administrative_agent', 'external_verifier'] },
];

function postLoginPath(from, role) {
  if (!role) return '/dashboard';
  const pathname = (typeof from === 'string' ? from : '/dashboard').split('?')[0] || '/dashboard';
  if (pathname === '/login' || pathname === '/register') return '/dashboard';
  for (const { prefix, roles } of RESTRICTED_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      if (!roles.includes(role)) return '/dashboard';
    }
  }
  return pathname;
}

export function LoginPage() {
  const { signIn } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const from = loc.state?.from || '/dashboard';
  const [busy, setBusy] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (values) => {
    setBusy(true);
    try {
      const { profile } = await signIn(values.email, values.password);
      toast.success('Signed in');
      const destination = postLoginPath(from, profile?.role);
      nav(destination, { replace: true });
    } catch (e) {
      toast.error(e.message || 'Sign in failed');
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
          <h1 className="font-display text-2xl font-bold">Smart Attestation Management</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in with your institutional account</p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
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
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700 disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          No account?{' '}
          <Link className="font-medium text-brand-600 hover:underline" to="/register">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
