"use client";

import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { useTheme } from "@/hooks/useTheme";

interface SettingsProps {
  readonly onBack: () => void;
}

interface SettingsState {
  theme: string;
  darkMode: boolean;
}

const THEMES = [
  { id: "emerald", label: "Emerald", color: "#10b981" },
  { id: "violet", label: "Violet", color: "#8b5cf6" },
  { id: "cyan", label: "Cyan", color: "#22d3ee" },
  { id: "rose", label: "Rose", color: "#f43f5e" },
  { id: "amber", label: "Amber", color: "#f59e0b" },
];

function loadSettings(): SettingsState {
  if (typeof window === "undefined") {
    return { theme: "emerald", darkMode: false };
  }
  try {
    const raw = localStorage.getItem("infinity-loop-settings");
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { theme: "emerald", darkMode: false };
}

function saveSettings(s: SettingsState): void {
  localStorage.setItem("infinity-loop-settings", JSON.stringify(s));
}

export function Settings({ onBack }: SettingsProps) {
  const [settings, setSettings] = useState<SettingsState>(loadSettings);
  const { setTheme: applyTheme } = useTheme();

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const update = (partial: Partial<SettingsState>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      if ('darkMode' in partial) applyTheme(next.darkMode ? 'dark' : 'light');
      return next;
    });
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
                    ? "border-white scale-110"
                    : "border-transparent scale-100"
                }`}
                style={{ backgroundColor: t.color }}
                title={t.label}
              />
            ))}
          </div>
        </div>

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
