import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export function AuditPage() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.get('/audit-logs').then((r) => setItems(r.data.items || []));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Audit logs</h1>
        <p className="text-sm text-slate-500">Security-relevant actions across the platform</p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 text-slate-500">{new Date(a.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 font-medium">{a.action}</td>
                <td className="px-4 py-3">
                  {a.entity_type || '—'} {a.entity_id ? <span className="font-mono text-xs text-slate-400">{a.entity_id.slice(0, 8)}…</span> : ''}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{a.user_id ? a.user_id.slice(0, 8) + '…' : '—'}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{a.ip_address || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
