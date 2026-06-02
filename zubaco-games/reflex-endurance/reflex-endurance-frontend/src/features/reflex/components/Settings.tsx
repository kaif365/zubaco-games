import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface SettingsState {
  soundEnabled: boolean;
  volume: number;
}

interface SettingsProps {
  onBack: () => void;
}

const STORAGE_KEY = 'reflex-endurance-settings';

function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) return parsed as SettingsState;
    }
  } catch {}
  return { soundEnabled: true, volume: 80 };
}

function saveSettings(s: SettingsState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function Settings({ onBack }: SettingsProps) {
  const [settings, setSettings] = useState<SettingsState>(loadSettings);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  return (
    <div className="min-h-screen flex flex-col p-6 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950">
      <button onClick={onBack} className="text-gray-400 hover:text-white text-sm mb-6 self-start">
        ← Back
      </button>

      <h2 className="text-2xl font-bold text-white text-center mb-8">Settings</h2>

      <div className="w-full max-w-sm mx-auto space-y-6">
        {/* Sound Toggle */}
        <motion.div
          className="flex items-center justify-between p-4 rounded-xl bg-white/5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div>
            <div className="text-white font-medium">Sound</div>
            <div className="text-gray-400 text-xs">Enable game sounds</div>
          </div>
          <button
            onClick={() => setSettings((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
            className={`w-12 h-7 rounded-full transition-colors relative ${settings.soundEnabled ? 'bg-green-600' : 'bg-gray-600'}`}
          >
            <motion.div
              className="absolute top-1 w-5 h-5 rounded-full bg-white shadow"
              animate={{ left: settings.soundEnabled ? 26 : 4 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            />
          </button>
        </motion.div>

        {/* Volume Slider */}
        <motion.div
          className="p-4 rounded-xl bg-white/5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="text-white font-medium">Volume</div>
            <span className="text-gray-400 text-sm">{settings.volume}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={settings.volume}
            disabled={!settings.soundEnabled}
            onChange={(e) => setSettings((prev) => ({ ...prev, volume: Number(e.target.value) }))}
            className="w-full h-2 rounded-full appearance-none bg-gray-700 disabled:opacity-40 accent-green-500"
          />
        </motion.div>
      </div>
    </div>
  );
}
