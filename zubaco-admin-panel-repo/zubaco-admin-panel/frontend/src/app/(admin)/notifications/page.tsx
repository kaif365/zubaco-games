'use client';

import { useEffect, useState } from 'react';
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { get, post } from "@/lib/api/http";

const TARGETS = [
  { value: 'ALL', label: 'All Users' },
  { value: 'ACTIVE_SEASON', label: 'Active Season Players' },
  { value: 'ELIMINATED', label: 'Eliminated Players' },
  { value: 'INACTIVE_7D', label: 'Inactive (7+ days)' },
];

interface NotificationHistory {
  id: string;
  title: string;
  body: string;
  created_at: string;
}

export default function NotificationsPage() {
  const [target, setTarget] = useState('ALL');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [deepLink, setDeepLink] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [history, setHistory] = useState<NotificationHistory[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    const data = await get<{ notifications: NotificationHistory[] }>('/admin/notifications/history');
    if (data?.notifications) setHistory(data.notifications);
  }

  async function handleSend() {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    setResult(null);

    const res = await post<{ sent: number; message: string }>('/admin/notifications/send', {
      target,
      title: title.trim(),
      body: body.trim(),
      deep_link: deepLink.trim() || undefined,
    });

    setSending(false);
    if (res) {
      setResult(res.message);
      setTitle('');
      setBody('');
      setDeepLink('');
      loadHistory();
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Push Notifications"
        description="Compose and send push notifications to users or segments."
      />

      {result && (
        <div className="mb-4 rounded-md bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-400">
          {result}
        </div>
      )}

      <div className="rounded-xl bg-card border p-6">
        <h2 className="text-lg font-semibold mb-4">Compose Notification</h2>
        <div className="space-y-4 max-w-lg">
          <div>
            <label className="block text-sm font-medium mb-1">Target Audience</label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              {TARGETS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Notification title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              rows={3}
              placeholder="Notification message..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Deep Link (optional)</label>
            <input
              type="text"
              value={deepLink}
              onChange={(e) => setDeepLink(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="e.g., /tournament/season-1"
            />
          </div>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !title.trim() || !body.trim()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Send Notification'}
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-card border p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Notifications</h2>
        {history.length === 0 ? (
          <p className="text-muted-foreground text-sm">No notifications sent yet.</p>
        ) : (
          <div className="space-y-3">
            {history.map((n) => (
              <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <div className="flex-1">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(n.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
