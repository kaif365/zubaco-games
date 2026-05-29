import { useState, useEffect } from 'react';

// ─── Types & Storage ─────────────────────────────────────────────────────────

interface SettingsData {
  soundEnabled: boolean;
  volume: number;
  theme: 'dark' | 'light';
}

const STORAGE_KEY = 'memory-groups-settings';

function loadSettings(): SettingsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { soundEnabled: true, volume: 80, theme: 'dark' };
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
    <div className="flex flex-col min-h-screen p-6">
      <div className="mb-6 flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-white transition-colors">
          ← Back
        </button>
        <h2 className="text-lg font-bold text-white">Settings</h2>
        <div className="w-12" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full space-y-5">
        {/* Sound Toggle */}
        <div className="w-full flex items-center justify-between rounded-xl bg-gray-800/80 px-5 py-4">
          <span className="text-sm font-medium text-white">Sound Effects</span>
          <button
            onClick={() => setSettings((s) => ({ ...s, soundEnabled: !s.soundEnabled }))}
            className={`w-12 h-7 rounded-full transition-colors relative ${settings.soundEnabled ? 'bg-indigo-600' : 'bg-gray-600'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow absolute top-1 transition-transform ${settings.soundEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* Volume Slider */}
        <div className="w-full rounded-xl bg-gray-800/80 px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white">Volume</span>
            <span className="text-xs text-gray-400">{settings.volume}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={settings.volume}
            onChange={(e) => setSettings((s) => ({ ...s, volume: Number(e.target.value) }))}
            disabled={!settings.soundEnabled}
            className="w-full h-2 rounded-full bg-gray-600 appearance-none cursor-pointer accent-indigo-500 disabled:opacity-40"
          />
        </div>

        {/* Theme Toggle */}
        <div className="w-full flex items-center justify-between rounded-xl bg-gray-800/80 px-5 py-4">
          <span className="text-sm font-medium text-white">Dark Theme</span>
          <button
            onClick={() => setSettings((s) => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }))}
            className={`w-12 h-7 rounded-full transition-colors relative ${settings.theme === 'dark' ? 'bg-indigo-600' : 'bg-gray-600'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow absolute top-1 transition-transform ${settings.theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
