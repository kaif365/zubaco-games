import { useState } from 'react';
import { useTheme } from '@/hooks/useTheme';

const THEME_KEY = 'zubaco_flash_spot_theme';

function getTheme(): string {
  return localStorage.getItem(THEME_KEY) || 'dark';
}
function setThemePref(v: string): void {
  localStorage.setItem(THEME_KEY, v);
}

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const [theme, setTheme] = useState(getTheme);
  const { setTheme: applyTheme } = useTheme();

  const changeTheme = (t: string) => {
    setTheme(t);
    setThemePref(t);
    applyTheme(t as 'dark' | 'light' | 'system');
  };

  return (
    <div className="flex h-screen flex-col bg-game-bg px-6 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Settings</h2>
        <button onClick={onClose} className="text-sm text-gray-400 hover:text-white">Done</button>
      </div>

      <div className="space-y-6">
        {/* Theme */}
        <div className="rounded-xl bg-white/5 p-4">
          <div className="mb-3 text-sm font-medium text-white">🎨 Theme</div>
          <div className="flex gap-2">
            {['dark', 'light', 'system'].map((t) => (
              <button
                key={t}
                onClick={() => changeTheme(t)}
                className={`flex-1 rounded-lg py-2 text-xs font-medium capitalize transition-colors ${
                  theme === t ? 'bg-game-accent text-white' : 'bg-white/10 text-gray-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

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
