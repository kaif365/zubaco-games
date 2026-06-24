'use client';

import { useEffect, useState } from 'react';
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { get, put } from "@/lib/api/http";

interface SystemSetting {
  key: string;
  value: string;
  description: string | null;
  category: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const data = await get<{ settings: SystemSetting[] }>('/admin/settings');
    if (data?.settings) {
      setSettings(data.settings);
    }
  }

  function handleChange(key: string, value: string) {
    setEditedValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    const updates = Object.entries(editedValues).map(([key, value]) => ({ key, value }));
    if (updates.length === 0) return;

    setSaving(true);
    setMessage(null);
    await put('/admin/settings', { settings: updates });
    setSaving(false);
    setMessage(`${updates.length} setting(s) updated successfully`);
    setEditedValues({});
    loadSettings();
  }

  const categories = [...new Set(settings.map((s) => s.category))];

  return (
    <PageContainer>
      <PageHeader
        title="System Settings"
        description="Configure platform-wide settings. Changes take effect immediately."
      />

      {message && (
        <div className="mb-4 rounded-md bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-400">
          {message}
        </div>
      )}

      {categories.map((category) => (
        <div key={category} className="mb-6 rounded-xl bg-card border p-6">
          <h2 className="text-lg font-semibold capitalize mb-4">{category.replace(/_/g, ' ')}</h2>
          <div className="space-y-4">
            {settings
              .filter((s) => s.category === category)
              .map((setting) => (
                <div key={setting.key} className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <label className="block text-sm font-medium">{setting.key.replace(/_/g, ' ')}</label>
                    {setting.description && (
                      <p className="text-xs text-muted-foreground">{setting.description}</p>
                    )}
                  </div>
                  <input
                    type="text"
                    value={editedValues[setting.key] ?? setting.value}
                    onChange={(e) => handleChange(setting.key, e.target.value)}
                    className="w-32 rounded-md border bg-background px-3 py-1.5 text-sm text-right"
                  />
                </div>
              ))}
          </div>
        </div>
      ))}

      {Object.keys(editedValues).length > 0 && (
        <div className="sticky bottom-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-lg disabled:opacity-50"
          >
            {saving ? 'Saving...' : `Save ${Object.keys(editedValues).length} Change(s)`}
          </button>
        </div>
      )}
    </PageContainer>
  );
}
