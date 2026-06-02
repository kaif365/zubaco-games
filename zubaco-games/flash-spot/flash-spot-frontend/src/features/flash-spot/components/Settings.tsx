interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  return (
    <div className="flex h-screen flex-col bg-game-bg px-6 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Settings</h2>
        <button onClick={onClose} className="text-sm text-gray-400 hover:text-white">Done</button>
      </div>

      <div className="space-y-6">
        {/* Background Music (future) */}
        <div className="flex items-center justify-between rounded-xl bg-white/5 p-4 opacity-50">
          <div>
            <div className="text-sm font-medium text-white">🎵 Background Music</div>
            <div className="text-xs text-gray-400">Coming soon</div>
          </div>
          <span className="text-xs text-gray-500">Soon</span>
        </div>
      </div>
    </div>
  );
}
