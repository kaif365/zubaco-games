import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

interface SettingsState {
  theme: string;
}

const THEMES = [
  { id: 'blue', label: 'Blue', color: '#3b82f6' },
  { id: 'emerald', label: 'Emerald', color: '#10b981' },
  { id: 'violet', label: 'Violet', color: '#8b5cf6' },
  { id: 'rose', label: 'Rose', color: '#f43f5e' },
  { id: 'amber', label: 'Amber', color: '#f59e0b' },
];

function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem('live-route-settings');
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { theme: 'blue' };
}

function saveSettings(s: SettingsState): void {
  localStorage.setItem('live-route-settings', JSON.stringify(s));
}

interface SettingsProps {
  readonly onBack: () => void;
}

export function Settings({ onBack }: SettingsProps) {
  const [settings, setSettings] = useState<SettingsState>(loadSettings);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const update = (partial: Partial<SettingsState>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-950 p-6">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          ← Back
        </button>
        <h2 className="text-lg font-bold text-white">Settings</h2>
        <div className="w-16" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 space-y-6 max-w-sm mx-auto w-full"
      >
        {/* Theme Selector */}
        <div className="rounded-xl bg-slate-800/60 p-4">
          <p className="text-sm font-medium text-white mb-3">Color Theme</p>
          <div className="flex gap-3">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => update({ theme: t.id })}
                className={`h-8 w-8 rounded-full border-2 transition-all ${
                  settings.theme === t.id
                    ? 'border-white scale-110'
                    : 'border-transparent scale-100'
                }`}
                style={{ backgroundColor: t.color }}
                title={t.label}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
