import { useState, useEffect } from 'react';

// ─── Types & Storage ─────────────────────────────────────────────────────────

interface SettingsData {
  soundEnabled: boolean;
  volume: number;
}

const STORAGE_KEY = 'maze-navigation-settings';

function loadSettings(): SettingsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { soundEnabled: true, volume: 80 };
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
        {/* Sound Toggle */}
        <div className="w-full flex items-center justify-between rounded-xl bg-slate-800/80 px-5 py-4">
          <span className="text-sm font-medium text-white">Sound Effects</span>
          <button
            onClick={() => setSettings((s) => ({ ...s, soundEnabled: !s.soundEnabled }))}
            className={`w-12 h-7 rounded-full transition-colors ${settings.soundEnabled ? 'bg-blue-600' : 'bg-slate-600'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform mx-1 ${settings.soundEnabled ? 'translate-x-5' : ''}`} />
          </button>
        </div>

        {/* Volume Slider */}
        <div className="w-full rounded-xl bg-slate-800/80 px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white">Volume</span>
            <span className="text-xs text-slate-400">{settings.volume}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={settings.volume}
            onChange={(e) => setSettings((s) => ({ ...s, volume: Number(e.target.value) }))}
            disabled={!settings.soundEnabled}
            className="w-full h-2 rounded-full bg-slate-600 appearance-none cursor-pointer accent-blue-500 disabled:opacity-40"
          />
        </div>
      </div>
    </div>
  );
}
