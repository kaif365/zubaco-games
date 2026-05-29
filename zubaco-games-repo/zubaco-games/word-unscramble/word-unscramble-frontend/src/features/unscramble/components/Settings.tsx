import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface SettingsProps {
  onBack: () => void;
}

const STORAGE_KEY = 'wordscramble_settings';

interface SettingsState {
  soundEnabled: boolean;
  volume: number;
  theme: 'dark' | 'light' | 'system';
}

function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { soundEnabled: true, volume: 80, theme: 'dark' };
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
    <motion.div
      className="flex flex-col items-center min-h-screen px-6 py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="w-full max-w-sm">
        <button onClick={onBack} className="text-gray-400 hover:text-white mb-4 text-sm">
          ← Back
        </button>

        <h2 className="text-2xl font-bold text-white text-center mb-6">Settings</h2>

        <div className="space-y-6">
          {/* Sound toggle */}
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">Sound</div>
                <div className="text-xs text-gray-400">Enable feedback sounds</div>
              </div>
              <motion.button
                onClick={() => setSettings((s) => ({ ...s, soundEnabled: !s.soundEnabled }))}
                className={`w-12 h-7 rounded-full p-1 transition-colors ${
                  settings.soundEnabled ? 'bg-indigo-600' : 'bg-gray-600'
                }`}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  className="w-5 h-5 bg-white rounded-full"
                  animate={{ x: settings.soundEnabled ? 20 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </motion.button>
            </div>

            {/* Volume */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                <span>Volume</span>
                <span>{settings.volume}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={settings.volume}
                onChange={(e) => setSettings((s) => ({ ...s, volume: Number(e.target.value) }))}
                disabled={!settings.soundEnabled}
                className="w-full accent-indigo-500 disabled:opacity-40"
              />
            </div>
          </div>

          {/* Theme */}
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="text-sm font-semibold text-white mb-3">Theme</div>
            <div className="grid grid-cols-3 gap-2">
              {(['dark', 'light', 'system'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setSettings((s) => ({ ...s, theme: t }))}
                  className={`py-2 rounded-lg text-xs font-medium capitalize transition-all ${
                    settings.theme === t
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
