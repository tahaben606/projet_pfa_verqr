import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Download, Ban } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export function ArchivePage() {
  const { profile } = useAuth();
  const [items, setItems] = useState([]);
  const isStaff = profile?.role === 'administrator' || profile?.role === 'administrative_agent';

  const load = async () => {
    const res = await api.get('/attestations');
    setItems(res.data.items || []);
  };

  useEffect(() => {
    load();
  }, []);

  const download = async (id) => {
    try {
      const res = await api.get(`/attestations/${id}/download-url`);
      window.open(res.data.url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast.error(e.message);
    }
  };

  const revoke = async (id) => {
    if (!confirm('Revoke this attestation? It will show as revoked on verification.')) return;
    try {
      await api.post(`/attestations/${id}/revoke`);
      toast.success('Revoked');
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Attestations archive</h1>
        <p className="text-sm text-slate-500">Search, download PDFs, and manage lifecycle</p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3">Identifier</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Beneficiary</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Issued</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((a) => {
              const req = Array.isArray(a.attestation_requests) ? a.attestation_requests[0] : a.attestation_requests;
              const at = req?.attestation_types;
              const typeName = Array.isArray(at) ? at[0]?.name : at?.name;
              const ben = req?.beneficiaries;
              const beneficiaryName = Array.isArray(ben) ? ben[0]?.name : ben?.name;
              return (
                <tr key={a.id}>
                  <td className="px-4 py-3 font-mono text-xs">{a.unique_identifier}</td>
                  <td className="px-4 py-3">{typeName || '—'}</td>
                  <td className="px-4 py-3">{beneficiaryName || '—'}</td>
                  <td className="px-4 py-3 capitalize">{a.status}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(a.issued_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" className="mr-2 inline-flex rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => download(a.id)} title="Download">
                      <Download className="h-4 w-4" />
                    </button>
                    {isStaff && a.status === 'active' && (
                      <button type="button" className="inline-flex rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40" onClick={() => revoke(a.id)} title="Revoke">
                        <Ban className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
