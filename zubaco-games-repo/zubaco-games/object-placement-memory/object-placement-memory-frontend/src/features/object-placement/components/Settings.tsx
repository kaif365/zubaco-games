import { useState } from 'react';
import { motion } from 'framer-motion';

interface Props {
  onBack: () => void;
}

const STORAGE_KEY = 'object-placement-settings';

interface SettingsData {
  soundEnabled: boolean;
  volume: number;
  darkMode: boolean;
}

function loadSettings(): SettingsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { soundEnabled: true, volume: 80, darkMode: true };
}

function saveSettings(s: SettingsData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function Settings({ onBack }: Props) {
  const [settings, setSettings] = useState<SettingsData>(loadSettings);

  const update = (patch: Partial<SettingsData>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  };

  return (
    <div className="flex flex-col items-center min-h-screen px-6 py-8 gap-6">
      <div className="flex items-center w-full max-w-sm">
        <button onClick={onBack} className="text-gray-400 hover:text-white font-bold">← Back</button>
        <h2 className="flex-1 text-center text-2xl font-bold">Settings</h2>
        <div className="w-12" />
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm space-y-5">
        {/* Sound */}
        <div className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
          <span className="font-medium">🔊 Sound</span>
          <button onClick={() => update({ soundEnabled: !settings.soundEnabled })}
            className={`w-12 h-6 rounded-full relative transition-colors ${settings.soundEnabled ? 'bg-indigo-500' : 'bg-gray-600'}`}>
            <motion.div animate={{ x: settings.soundEnabled ? 24 : 2 }} className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow" />
          </button>
        </div>

        {/* Volume */}
        <div className="bg-gray-800 rounded-xl px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">🎚️ Volume</span>
            <span className="text-sm text-gray-400">{settings.volume}%</span>
          </div>
          <input type="range" min={0} max={100} value={settings.volume}
            disabled={!settings.soundEnabled}
            onChange={(e) => update({ volume: Number(e.target.value) })}
            className="w-full accent-indigo-500 disabled:opacity-40" />
        </div>

        {/* Theme */}
        <div className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
          <span className="font-medium">🌙 Dark Mode</span>
          <button onClick={() => update({ darkMode: !settings.darkMode })}
            className={`w-12 h-6 rounded-full relative transition-colors ${settings.darkMode ? 'bg-indigo-500' : 'bg-gray-600'}`}>
            <motion.div animate={{ x: settings.darkMode ? 24 : 2 }} className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
