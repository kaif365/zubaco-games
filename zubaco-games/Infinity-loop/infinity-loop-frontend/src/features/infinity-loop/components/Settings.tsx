"use client";

import { motion } from "motion/react";
import { useState, useEffect } from "react";

interface SettingsProps {
  readonly onBack: () => void;
}

interface SettingsState {
  darkMode: boolean;
}

function loadSettings(): SettingsState {
  if (typeof window === "undefined") {
    return { darkMode: false };
  }
  try {
    const raw = localStorage.getItem("infinity-loop-settings");
    if (raw) {
      const parsed = JSON.parse(raw);
      return { darkMode: parsed.darkMode ?? false };
    }
  } catch { /* ignore */ }
  return { darkMode: false };
}

function saveSettings(s: SettingsState): void {
  localStorage.setItem("infinity-loop-settings", JSON.stringify(s));
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
      {/* Header */}
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
        {/* Dark Mode Toggle */}
        <div className="flex items-center justify-between rounded-xl bg-slate-800/60 p-4">
          <div>
            <p className="text-sm font-medium text-white">Dark Mode (Reverse)</p>
            <p className="text-xs text-slate-400">Disconnect tiles instead of connecting</p>
          </div>
          <button
            onClick={() => update({ darkMode: !settings.darkMode })}
            className={`relative h-7 w-12 rounded-full transition-colors ${
              settings.darkMode ? "bg-violet-500" : "bg-slate-600"
            }`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                settings.darkMode ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
