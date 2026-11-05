import { motion } from 'framer-motion';
import { Music } from 'lucide-react';

interface SettingsProps {
  onBack: () => void;
}

export function Settings({ onBack }: SettingsProps) {
  return (
    <motion.div
      className="flex flex-col gap-6 px-4 py-6 w-full max-w-sm mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Settings</h2>
      </div>

      {/* Music (coming soon) */}
      <div className="flex items-center justify-between p-4 bg-gray-800/60 rounded-xl border border-white/5 opacity-60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-pink-500/20 flex items-center justify-center text-pink-400">
            <Music size={18} />
          </div>
          <div>
            <div className="text-sm font-medium text-white">Background Music</div>
            <div className="text-xs text-gray-400">Ambient gameplay music</div>
          </div>
        </div>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-gray-400 uppercase">
          Coming Soon
        </span>
      </div>

      <button
        onClick={onBack}
        className="mt-2 w-full py-3 rounded-xl bg-gray-700 text-sm font-medium text-white hover:bg-gray-600 transition-colors"
      >
        Done
      </button>
    </motion.div>
  );
}
