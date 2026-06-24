'use client';

import { useEffect, useState } from 'react';
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { get } from "@/lib/api/http";

interface AuditLogEntry {
  id: string;
  admin_id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  changes: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  admin: { id: string; email: string };
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [entityFilter, setEntityFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, [page, entityFilter]);

  async function loadLogs() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '30' });
    if (entityFilter) params.set('entity', entityFilter);

    const data = await get<{ logs: AuditLogEntry[]; total: number }>(`/admin/audit-logs?${params}`);
    if (data) {
      setLogs(data.logs);
      setTotal(data.total);
    }
    setLoading(false);
  }

  const entities = [...new Set(logs.map((l) => l.entity))];

  return (
    <PageContainer>
      <PageHeader
        title="Audit Logs"
        description="Track all admin actions. Every change is logged for accountability."
      />

      <div className="mb-4 flex gap-3">
        <select
          value={entityFilter}
          onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">All Entities</option>
          {['users', 'seasons', 'stages', 'tournaments', 'games', 'notifications', 'settings', 'cheat-flags'].map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <span className="text-sm text-muted-foreground self-center">
          {total} total entries
        </span>
      </div>

      <div className="rounded-xl bg-card border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Time</th>
              <th className="px-4 py-3 text-left font-medium">Admin</th>
              <th className="px-4 py-3 text-left font-medium">Action</th>
              <th className="px-4 py-3 text-left font-medium">Entity</th>
              <th className="px-4 py-3 text-left font-medium">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No audit logs found</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">{log.admin?.email || log.admin_id}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      log.action.startsWith('DELETE') ? 'bg-red-500/10 text-red-400' :
                      log.action.startsWith('POST') ? 'bg-green-500/10 text-green-400' :
                      'bg-blue-500/10 text-blue-400'
                    }`}>
                      {log.action.split(' ')[0]}
                    </span>
                  </td>
                  <td className="px-4 py-3 capitalize">{log.entity}</td>
                  <td className="px-4 py-3 max-w-xs truncate text-muted-foreground">
                    {log.entity_id || (log.changes ? JSON.stringify(log.changes).slice(0, 60) : '—')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > 30 && (
        <div className="mt-4 flex justify-between items-center">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">Page {page} of {Math.ceil(total / 30)}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page * 30 >= total}
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </PageContainer>
  );
}
