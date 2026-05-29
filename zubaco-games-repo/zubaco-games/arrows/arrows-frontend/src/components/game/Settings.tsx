import { useAudio } from '@/hooks/useAudio';
import { useState } from 'react';

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const { isEnabled, setEnabled } = useAudio();
  const [soundOn, setSoundOn] = useState(isEnabled());
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>(
    (localStorage.getItem('arrowgame_theme') as any) || 'dark'
  );

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setEnabled(next);
  };

  const changeTheme = (t: 'dark' | 'light' | 'system') => {
    setTheme(t);
    localStorage.setItem('arrowgame_theme', t);
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-6 w-full max-w-sm mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Settings</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Sound */}
      <div className="flex items-center justify-between p-4 bg-gray-800/60 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium text-white">Sound Effects</div>
            <div className="text-xs text-gray-400">Game sounds and feedback</div>
          </div>
        </div>
        <button
          onClick={toggleSound}
          className={`relative w-11 h-6 rounded-full transition-colors ${soundOn ? 'bg-amber-500' : 'bg-gray-600'}`}
        >
          <div
            className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
            style={{ left: soundOn ? '22px' : '2px' }}
          />
        </button>
      </div>

      {/* Theme */}
      <div className="p-4 bg-gray-800/60 rounded-xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium text-white">Theme</div>
            <div className="text-xs text-gray-400">Choose appearance</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(['dark', 'light', 'system'] as const).map((t) => (
            <button
              key={t}
              onClick={() => changeTheme(t)}
              className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all
                ${theme === t ? 'bg-amber-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
