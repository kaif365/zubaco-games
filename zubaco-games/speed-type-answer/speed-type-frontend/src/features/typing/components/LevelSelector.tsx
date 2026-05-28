import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface LevelData {
  level: number;
  unlocked: boolean;
  stars: number;
  highScore: number;
  flashDuration: string;
  answerTime: string;
}

interface LevelSelectorProps {
  onBack: () => void;
  onSelectLevel: (level: number) => void;
}

const LEVEL_CONFIGS = [
  { level: 1, flashDuration: '5s', answerTime: '15s' },
  { level: 2, flashDuration: '4s', answerTime: '13s' },
  { level: 3, flashDuration: '4s', answerTime: '11s' },
  { level: 4, flashDuration: '3s', answerTime: '10s' },
  { level: 5, flashDuration: '3s', answerTime: '9s' },
  { level: 6, flashDuration: '2.5s', answerTime: '8s' },
  { level: 7, flashDuration: '2s', answerTime: '7s' },
  { level: 8, flashDuration: '2s', answerTime: '6s' },
  { level: 9, flashDuration: '1.5s', answerTime: '5s' },
  { level: 10, flashDuration: '1s', answerTime: '4s' },
];

const STORAGE_KEY = 'speed-type-levels';

function loadLevels(): LevelData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 10) return parsed;
    }
  } catch {}
  return LEVEL_CONFIGS.map((cfg, i) => ({
    ...cfg,
    unlocked: i === 0,
    stars: 0,
    highScore: 0,
  }));
}

function saveLevels(levels: LevelData[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(levels));
}

export function LevelSelector({ onBack, onSelectLevel }: LevelSelectorProps) {
  const [levels, setLevels] = useState<LevelData[]>(loadLevels);

  useEffect(() => {
    saveLevels(levels);
  }, [levels]);

  return (
    <div className="min-h-screen flex flex-col p-6 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950">
      <button onClick={onBack} className="text-gray-400 hover:text-white text-sm mb-6 self-start">
        ← Back
      </button>

      <h2 className="text-2xl font-bold text-white text-center mb-6">Select Level</h2>

      <div className="grid grid-cols-5 gap-3 max-w-md mx-auto w-full">
        {levels.map((lvl, i) => (
          <motion.button
            key={lvl.level}
            onClick={() => lvl.unlocked && onSelectLevel(lvl.level)}
            disabled={!lvl.unlocked}
            className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
              lvl.unlocked
                ? 'border-indigo-500/50 bg-indigo-500/10 hover:bg-indigo-500/20 cursor-pointer'
                : 'border-gray-700/50 bg-gray-800/30 opacity-50 cursor-not-allowed'
            }`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04, duration: 0.25 }}
          >
            {lvl.unlocked ? (
              <>
                <span className="text-lg font-bold text-white">{lvl.level}</span>
                <span className="text-[10px] text-gray-400">{lvl.flashDuration}</span>
                <div className="flex gap-0.5 mt-1">
                  {[1, 2, 3].map((s) => (
                    <span key={s} className={`text-xs ${s <= lvl.stars ? 'text-yellow-400' : 'text-gray-600'}`}>★</span>
                  ))}
                </div>
              </>
            ) : (
              <span className="text-lg">🔒</span>
            )}
          </motion.button>
        ))}
      </div>

      <div className="mt-6 text-center text-xs text-gray-500">
        Complete a level to unlock the next. Less time to read & answer!
      </div>
    </div>
  );
}

export function updateLevelProgress(level: number, score: number, accuracy: number) {
  const levels = loadLevels();
  const idx = level - 1;
  if (idx < 0 || idx >= levels.length) return;

  const stars = accuracy >= 0.95 ? 3 : accuracy >= 0.7 ? 2 : accuracy > 0 ? 1 : 0;

  levels[idx].stars = Math.max(levels[idx].stars, stars);
  levels[idx].highScore = Math.max(levels[idx].highScore, score);

  if (idx + 1 < levels.length && stars >= 1) {
    levels[idx + 1].unlocked = true;
  }

  saveLevels(levels);
}
