import { motion } from 'framer-motion';

interface SettingsProps {
  readonly onBack: () => void;
}

export function Settings({ onBack }: SettingsProps) {
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
      </motion.div>
    </div>
  );
}
