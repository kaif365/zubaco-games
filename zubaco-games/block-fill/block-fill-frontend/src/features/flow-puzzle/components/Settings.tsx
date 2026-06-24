import { motion } from 'framer-motion';
import { useState } from 'react';

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const [vibration, setVibration] = useState(() => {
    try {
      return localStorage.getItem('blockfill_vibration') !== 'false';
    } catch {
      return true;
    }
  });

  const handleToggleVibration = () => {
    const next = !vibration;
    setVibration(next);
    try {
      localStorage.setItem('blockfill_vibration', String(next));
    } catch { /* ignore */ }
  };

  return (
    <motion.div
      className="flex flex-col gap-6 px-4 py-6 w-full max-w-sm mx-auto min-h-[100dvh] justify-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Settings</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white p-1 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Vibration toggle */}
      <button
        type="button"
        onClick={handleToggleVibration}
        className="flex items-center justify-between p-4 bg-gray-800/60 rounded-xl border border-gray-700/50 transition-colors hover:bg-gray-800/80"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <span className="text-lg">📳</span>
          </div>
          <div className="text-left">
            <div className="text-sm font-medium text-white">Vibration</div>
            <div className="text-xs text-gray-400">Haptic feedback on moves</div>
          </div>
        </div>
        <div className={`h-6 w-11 rounded-full transition-colors ${vibration ? 'bg-emerald-500' : 'bg-gray-600'}`}>
          <div className={`mt-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${vibration ? 'translate-x-[1.375rem]' : 'translate-x-0.5'}`} />
        </div>
      </button>

      {/* Music (coming soon) */}
      <div className="flex items-center justify-between p-4 bg-gray-800/60 rounded-xl border border-gray-700/50 opacity-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-pink-500/20 flex items-center justify-center">
            <span className="text-lg">🎵</span>
          </div>
          <div className="text-left">
            <div className="text-sm font-medium text-white">Background Music</div>
            <div className="text-xs text-gray-400">Ambient gameplay music</div>
          </div>
        </div>
        <span className="text-xs text-gray-500">Soon</span>
      </div>

      <button
        onClick={onClose}
        className="mt-2 w-full py-3 rounded-xl bg-gray-700/60 text-sm font-medium text-gray-300 hover:bg-gray-600/60 transition-colors"
      >
        Done
      </button>
    </motion.div>
  );
}
