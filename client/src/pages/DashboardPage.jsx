import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ClipboardList, CheckCircle2, XCircle, PauseCircle, FileBadge } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

function StatCard({ title, value, icon: Icon, tone }) {
  const tones = {
    slate: 'from-slate-500/10 to-slate-500/5 text-slate-600',
    amber: 'from-amber-500/15 to-amber-500/5 text-amber-700 dark:text-amber-400',
    green: 'from-emerald-500/15 to-emerald-500/5 text-emerald-700 dark:text-emerald-400',
    red: 'from-red-500/15 to-red-500/5 text-red-700 dark:text-red-400',
    blue: 'from-brand-500/15 to-brand-500/5 text-brand-700 dark:text-brand-300',
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

export function DashboardPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState(null);
  const [myRequests, setMyRequests] = useState([]);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (profile?.role === 'beneficiary' || profile?.role === 'external_verifier') {
          const r = await api.get('/requests');
          if (!cancelled) setMyRequests(r.data.items || []);
        } else {
          const s = await api.get('/dashboard/stats');
          if (!cancelled) setStats(s.data);
        }
        setErr(null);
      } catch (e) {
        if (!cancelled) setErr(e.message);
      }
    }
    if (profile) load();
    return () => {
      cancelled = true;
    };
  }, [profile]);

  const chartData = stats
    ? [
        { name: 'Pending', v: stats.pendingRequests },
        { name: 'Approved', v: stats.approvedRequests },
        { name: 'Rejected', v: stats.rejectedRequests },
        { name: 'On hold', v: stats.onHoldRequests },
      ]
    : [];

  const beneficiaryCounts = myRequests.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    { pending: 0, approved: 0, rejected: 0, on_hold: 0 }
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-slate-500">Smart Attestation Management System with QR verification</p>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      {profile?.role === 'beneficiary' || profile?.role === 'external_verifier' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="My pending" value={beneficiaryCounts.pending || 0} icon={ClipboardList} tone="amber" />
          <StatCard title="Approved" value={beneficiaryCounts.approved || 0} icon={CheckCircle2} tone="green" />
          <StatCard title="Rejected" value={beneficiaryCounts.rejected || 0} icon={XCircle} tone="red" />
          <StatCard title="On hold" value={beneficiaryCounts.on_hold || 0} icon={PauseCircle} tone="slate" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Pending requests" value={stats?.pendingRequests ?? '—'} icon={ClipboardList} tone="amber" />
            <StatCard title="Approved (requests)" value={stats?.approvedRequests ?? '—'} icon={CheckCircle2} tone="green" />
            <StatCard title="Rejected" value={stats?.rejectedRequests ?? '—'} icon={XCircle} tone="red" />
            <StatCard title="Active attestations" value={stats?.activeAttestations ?? '—'} icon={FileBadge} tone="blue" />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
              <h2 className="mb-4 font-display text-lg font-semibold">Request pipeline</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
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
                {(stats?.recentActivity || []).map((a) => (
                  <li key={a.id} className="rounded-lg border border-slate-100 p-2 dark:border-slate-800">
                    <p className="font-medium capitalize">{a.action.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-slate-500">{new Date(a.createdAt).toLocaleString()}</p>
                  </li>
                ))}
                {!stats?.recentActivity?.length && <li className="text-slate-500">No events yet.</li>}
              </ul>
            </div>
          </div>
        </>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          to="/requests"
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-700"
        >
          Go to requests
        </Link>
        {['administrator', 'administrative_agent'].includes(profile?.role) && (
          <Link
            to="/beneficiaries"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Manage beneficiaries
          </Link>
        )}
      </div>
    </div>
  );
}
