import { useState } from 'react';
import { motion } from 'framer-motion';

const SOUND_KEY = 'zubaco_flash_spot_sound';
const THEME_KEY = 'zubaco_flash_spot_theme';

function getSoundEnabled(): boolean {
  return localStorage.getItem(SOUND_KEY) !== 'false';
}
function setSoundEnabled(v: boolean): void {
  localStorage.setItem(SOUND_KEY, String(v));
}
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
  const [soundOn, setSoundOn] = useState(getSoundEnabled);
  const [theme, setTheme] = useState(getTheme);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  };

  const changeTheme = (t: string) => {
    setTheme(t);
    setThemePref(t);
  };

  return (
    <div className="flex h-screen flex-col bg-game-bg px-6 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Settings</h2>
        <button onClick={onClose} className="text-sm text-gray-400 hover:text-white">Done</button>
      </div>

      <div className="space-y-6">
        {/* Sound toggle */}
        <div className="flex items-center justify-between rounded-xl bg-white/5 p-4">
          <div>
            <div className="text-sm font-medium text-white">🔊 Sound Effects</div>
            <div className="text-xs text-gray-400">Tap and game sounds</div>
          </div>
          <motion.button
            onClick={toggleSound}
            className={`relative h-7 w-12 rounded-full transition-colors ${soundOn ? 'bg-game-accent' : 'bg-gray-600'}`}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow"
              animate={{ left: soundOn ? '22px' : '2px' }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </motion.button>
        </div>

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
