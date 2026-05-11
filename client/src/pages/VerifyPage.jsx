import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, ShieldX, SearchX } from 'lucide-react';

export function VerifyPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
        const url = base ? `${base}/public/verify/${token}` : `/api/public/verify/${token}`;
        const res = await fetch(url);
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setErr(e.message);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const state = data?.state;
  const icon =
    state === 'valid' ? (
      <ShieldCheck className="h-14 w-14 text-emerald-500" />
    ) : state === 'revoked' || state === 'expired' ? (
      <ShieldX className="h-14 w-14 text-amber-500" />
    ) : state === 'not_found' ? (
      <SearchX className="h-14 w-14 text-slate-400" />
    ) : (
      <ShieldAlert className="h-14 w-14 text-slate-400" />
    );

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex justify-center">{icon}</div>
        {err && <p className="text-red-600">{err}</p>}
        {!data && !err && <p className="text-slate-500">Verifying…</p>}
        {data && (
          <>
            <h1 className="font-display text-2xl font-bold capitalize">{data.state?.replace('_', ' ') || 'Result'}</h1>
            <p className="mt-3 text-slate-600 dark:text-slate-300">{data.message}</p>
            {data.typeName && <p className="mt-4 text-sm text-slate-500">Template: {data.typeName}</p>}
            {data.issuedAt && <p className="text-sm text-slate-500">Issued: {new Date(data.issuedAt).toLocaleDateString()}</p>}
            {data.documentIdSuffix && (
              <p className="mt-2 font-mono text-xs text-slate-400">Document reference ends with ···{data.documentIdSuffix}</p>
            )}
          </>
        )}
        <p className="mt-8 text-xs text-slate-400">Public verification — no personal data is exposed.</p>
      </div>
    </div>
  );
}
