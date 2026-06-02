import { motion } from 'framer-motion';

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
        <button onClick={onBack} className="text-gray-400 hover:text-white text-sm">
          Done
        </button>
      </div>

      {/* Music (coming soon) */}
      <div className="flex items-center justify-between p-4 bg-gray-800/60 rounded-xl opacity-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-pink-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium text-white">Background Music</div>
            <div className="text-xs text-gray-400">Ambient gameplay music</div>
          </div>
        </div>
        <span className="text-xs text-gray-500">Soon</span>
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
