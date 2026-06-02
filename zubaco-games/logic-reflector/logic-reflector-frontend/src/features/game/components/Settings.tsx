import { useState, useEffect } from 'react';

// ─── Types & Storage ─────────────────────────────────────────────────────────

interface SettingsData {
  theme: 'dark' | 'light';
}

const STORAGE_KEY = 'logic-reflector-settings';

function loadSettings(): SettingsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { theme: 'dark' };
}

function saveSettings(data: SettingsData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getSettings(): SettingsData {
  return loadSettings();
}

// ─── Component ───────────────────────────────────────────────────────────────

interface SettingsProps {
  readonly onBack: () => void;
}

export function Settings({ onBack }: SettingsProps) {
  const [settings, setSettings] = useState<SettingsData>(loadSettings);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-950 p-6">
      <div className="mb-6 flex items-center justify-between">
        <button onClick={onBack} className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors">
          ← Back
        </button>
        <h2 className="text-lg font-bold text-white">Settings</h2>
        <div className="w-16" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full space-y-6">
        {/* Theme Toggle */}
        <div className="w-full flex items-center justify-between rounded-xl bg-slate-800/80 px-5 py-4">
          <span className="text-sm font-medium text-white">Dark Theme</span>
          <button
            onClick={() => setSettings((s) => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }))}
            className={`w-12 h-7 rounded-full transition-colors ${settings.theme === 'dark' ? 'bg-purple-600' : 'bg-slate-600'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform mx-1 ${settings.theme === 'dark' ? 'translate-x-5' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
