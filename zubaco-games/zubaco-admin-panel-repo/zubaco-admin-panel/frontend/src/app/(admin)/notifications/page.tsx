'use client';

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";

export default function NotificationsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Push Notifications"
        description="Compose and send push notifications to users or segments."
      />

      <div className="rounded-xl bg-card border p-6">
        <h2 className="text-lg font-semibold mb-4">Compose Notification</h2>
        <form className="space-y-4 max-w-lg">
          <div>
            <label className="block text-sm font-medium mb-1">Target Audience</label>
            <select className="w-full rounded-md border bg-background px-3 py-2 text-sm">
              <option>All Users</option>
              <option>Active Season Players</option>
              <option>Eliminated Players</option>
              <option>Inactive (7+ days)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input type="text" className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Notification title" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Body</label>
            <textarea className="w-full rounded-md border bg-background px-3 py-2 text-sm" rows={3} placeholder="Notification message..." />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Deep Link (optional)</label>
            <input type="text" className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="e.g., /tournament/season-1" />
          </div>
          <button type="button" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Send Notification
          </button>
        </form>
      </div>

      <div className="mt-6 rounded-xl bg-card border p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Notifications</h2>
        <p className="text-muted-foreground text-sm">No notifications sent yet.</p>
      </div>
    </PageContainer>
  );
}
