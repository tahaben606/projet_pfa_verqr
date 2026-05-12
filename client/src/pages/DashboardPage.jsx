import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  PauseCircle,
  FileBadge,
  User,
  FolderArchive,
  QrCode,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

function StatCard({ title, value, icon: Icon, tone }) {
  const tones = {
    slate: 'from-slate-500/10 to-slate-500/5 text-slate-600',
    amber: 'from-amber-500/15 to-amber-500/5 text-amber-700 dark:text-amber-400',
    green: 'from-emerald-500/15 to-emerald-500/5 text-emerald-700 dark:text-emerald-400',
    red: 'from-red-500/15 to-red-500/5 text-red-700 dark:text-red-400',
    blue: 'from-brand-500/15 to-brand-500/5 text-brand-700 dark:text-brand-300',
    violet: 'from-violet-500/15 to-violet-500/5 text-violet-700 dark:text-violet-400',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className={`mb-3 inline-flex rounded-xl bg-gradient-to-br p-2 ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-1 font-display text-3xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

function RoleBadge({ role }) {
  const labels = {
    administrator: 'Administrator',
    administrative_agent: 'Administrative agent',
    beneficiary: 'Beneficiary',
    external_verifier: 'External verifier',
  };
  const label = labels[role] || role;
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
      {label}
    </span>
  );
}

export function DashboardPage() {
  const { profile, session } = useAuth();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [dashLoading, setDashLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!session) {
        setData(null);
        return;
      }
      setDashLoading(true);
      setErr(null);
      try {
        const res = await api.get('/dashboard');
        if (!cancelled) {
          setData(res.data);
          setErr(null);
        }
      } catch (e) {
        if (!cancelled) {
          setData(null);
          setErr(
            e.message ||
              'Dashboard could not be loaded. Start the API (e.g. port 4000) and ensure you are in table public.users.'
          );
        }
      } finally {
        if (!cancelled) setDashLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const effectiveRole = profile?.role || data?.role;
  const displayName =
    profile?.full_name?.trim() || 'User';
  const variant = data?.variant;

  const staffChart =
    data?.variant === 'staff'
      ? [
          { name: 'Pending', v: data.pendingRequests },
          { name: 'Approved', v: data.approvedRequests },
          { name: 'Rejected', v: data.rejectedRequests },
          { name: 'On hold', v: data.onHoldRequests },
        ]
      : [];

  const beneficiaryChart =
    data?.variant === 'beneficiary'
      ? [
          { name: 'Pending', v: data.pendingRequests },
          { name: 'Approved', v: data.approvedRequests },
          { name: 'Rejected', v: data.rejectedRequests },
          { name: 'On hold', v: data.onHoldRequests },
        ]
      : [];

  const verifierChart =
    data?.variant === 'verifier'
      ? [
          { name: 'Active', v: data.activeAttestations },
          { name: 'Revoked', v: data.revokedAttestations },
          { name: 'Expired', v: data.expiredAttestations },
        ]
      : [];

  const staffSubtitle =
    data?.staffTitle === 'administrator'
      ? 'Global pipeline, issued documents, and audit activity.'
      : 'Review requests, issue PDFs, and keep the queue moving.';

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold">Dashboard</h1>
            {effectiveRole && <RoleBadge role={effectiveRole} />}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Hello, <span className="font-medium text-slate-900 dark:text-slate-100">{displayName}</span>
            {variant === 'staff' && ` — ${staffSubtitle}`}
            {variant === 'beneficiary' && ' — Here is the status of your attestation requests.'}
            {variant === 'verifier' && ' — Overview of issued documents you can review in the archive.'}
            {!variant && !err && dashLoading && ' — Loading your workspace…'}
          </p>
          <p className="mt-1 text-xs text-slate-500">Smart Attestation Management System with QR verification</p>
        </div>
      </div>

      {dashLoading && !data && !err && (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          Loading dashboard…
        </div>
      )}

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <p className="font-medium">Dashboard unavailable</p>
          <p className="mt-1">{err}</p>
          <p className="mt-2 text-xs text-red-600/90 dark:text-red-400/90">
            Tip: run the API in another terminal:{' '}
            <code className="rounded bg-red-100 px-1 dark:bg-red-900/50">{'cd server && npm run dev'}</code>
            (Vite proxies <code className="rounded bg-red-100 px-1 dark:bg-red-900/50">/api</code> to port 4000).
          </p>
        </div>
      )}

      {variant === 'staff' && data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Pending requests" value={data.pendingRequests} icon={ClipboardList} tone="amber" />
            <StatCard title="Approved (requests)" value={data.approvedRequests} icon={CheckCircle2} tone="green" />
            <StatCard title="Rejected" value={data.rejectedRequests} icon={XCircle} tone="red" />
            <StatCard title="Active attestations" value={data.activeAttestations} icon={FileBadge} tone="blue" />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
              <h2 className="mb-4 font-display text-lg font-semibold">Request pipeline</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={staffChart}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="v" fill="#3293fa" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-3 font-display text-lg font-semibold">Recent activity</h2>
              <ul className="max-h-64 space-y-3 overflow-auto text-sm">
                {(data.recentActivity || []).map((a) => (
                  <li key={a.id} className="rounded-lg border border-slate-100 p-2 dark:border-slate-800">
                    <p className="font-medium capitalize">{a.action.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-slate-500">{new Date(a.createdAt).toLocaleString()}</p>
                  </li>
                ))}
                {!data.recentActivity?.length && <li className="text-slate-500">No events yet.</li>}
              </ul>
            </div>
          </div>

          <p className="text-sm text-slate-500">
            Revoked attestations (system-wide): <span className="font-medium text-slate-700 dark:text-slate-300">{data.revokedAttestations}</span>
          </p>
        </>
      )}

      {variant === 'beneficiary' && data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="My pending" value={data.pendingRequests} icon={ClipboardList} tone="amber" />
            <StatCard title="Approved" value={data.approvedRequests} icon={CheckCircle2} tone="green" />
            <StatCard title="Rejected" value={data.rejectedRequests} icon={XCircle} tone="red" />
            <StatCard title="On hold" value={data.onHoldRequests} icon={PauseCircle} tone="slate" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-4 font-display text-lg font-semibold">My request status</h2>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={beneficiaryChart}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="v" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-3 font-display text-lg font-semibold">Recent requests</h2>
              <ul className="max-h-56 space-y-2 overflow-auto text-sm">
                {(data.recentRequests || []).map((r) => (
                  <li key={r.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800">
                    <div>
                      <p className="font-medium">{r.typeName}</p>
                      <p className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleString()}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {r.status.replace('_', ' ')}
                    </span>
                  </li>
                ))}
                {!data.recentRequests?.length && <li className="text-slate-500">No requests yet. Submit one from Requests.</li>}
              </ul>
            </div>
          </div>
        </>
      )}

      {variant === 'verifier' && data && (
        <>
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-4 text-sm text-indigo-900 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-200">
            <p className="font-medium">External verifier workspace</p>
            <p className="mt-1 text-indigo-800/90 dark:text-indigo-300/90">
              You can browse issued PDFs in the archive and confirm authenticity with the verification page when you have a QR link or token.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard title="Active attestations" value={data.activeAttestations} icon={FileBadge} tone="green" />
            <StatCard title="Revoked" value={data.revokedAttestations} icon={XCircle} tone="red" />
            <StatCard title="Expired" value={data.expiredAttestations} icon={PauseCircle} tone="slate" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-4 font-display text-lg font-semibold">Issued documents (system-wide)</h2>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={verifierChart}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="v" fill="#0d9488" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-3 font-display text-lg font-semibold">Recently issued</h2>
              <ul className="max-h-56 space-y-2 overflow-auto text-sm">
                {(data.recentAttestations || []).map((a) => (
                  <li key={a.id} className="rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800">
                    <p className="font-medium">{a.typeName}</p>
                    <p className="font-mono text-xs text-slate-500">{a.uniqueIdentifier}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(a.issuedAt).toLocaleString()} · <span className="capitalize">{a.status}</span>
                    </p>
                  </li>
                ))}
                {!data.recentAttestations?.length && <li className="text-slate-500">No attestations in the system yet.</li>}
              </ul>
            </div>
          </div>
        </>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          to="/requests"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-700"
        >
          <ClipboardList className="h-4 w-4" />
          {variant === 'staff' ? 'Review requests' : 'Requests'}
        </Link>

        {/* {variant === 'beneficiary' && (
          // <Link
          //   to="/requests"
          //   className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-100 dark:border-brand-900 dark:bg-brand-950/50 dark:text-brand-200 dark:hover:bg-brand-900/40"
          // >
          //   New attestation request
          // </Link>
        )} */}

        {['administrator', 'administrative_agent'].includes(effectiveRole) && (
          <>
            <Link
              to="/beneficiaries"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <User className="h-4 w-4" />
              Beneficiaries
            </Link>
            <Link
              to="/attestation-types"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Attestation types
            </Link>
          </>
        )}

        {['administrator', 'administrative_agent', 'external_verifier'].includes(effectiveRole) && (
          <Link
            to="/archive"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <FolderArchive className="h-4 w-4" />
            Archive
          </Link>
        )}

        {['administrator', 'administrative_agent'].includes(effectiveRole) && (
          <Link
            to="/audit"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Audit logs
          </Link>
        )}

        {effectiveRole === 'external_verifier' && (
          <span className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2 text-xs text-slate-500 dark:border-slate-600 dark:text-slate-400">
            <QrCode className="h-4 w-4 shrink-0" />
            Open <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">/verify/…</code> from a QR link to check a document
          </span>
        )}

        <Link
          to="/settings"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Settings
        </Link>
      </div>
    </div>
  );
}
