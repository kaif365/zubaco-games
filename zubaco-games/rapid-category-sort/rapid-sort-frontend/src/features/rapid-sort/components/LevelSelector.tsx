import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface LevelData {
  level: number;
  unlocked: boolean;
  stars: number;
  highScore: number;
  timeLimitMs: number;
  itemCount: number;
  categoryCount: number;
  scoreMultiplier: number;
}

interface LevelSelectorProps {
  onBack: () => void;
  onSelectLevel: (level: number) => void;
}

const LEVEL_CONFIGS = [
  { level: 1, timeLimitMs: 60000, itemCount: 10, categoryCount: 3, scoreMultiplier: 1.0 },
  { level: 2, timeLimitMs: 55000, itemCount: 12, categoryCount: 3, scoreMultiplier: 1.2 },
  { level: 3, timeLimitMs: 50000, itemCount: 14, categoryCount: 4, scoreMultiplier: 1.4 },
  { level: 4, timeLimitMs: 48000, itemCount: 16, categoryCount: 4, scoreMultiplier: 1.6 },
  { level: 5, timeLimitMs: 45000, itemCount: 18, categoryCount: 4, scoreMultiplier: 1.8 },
  { level: 6, timeLimitMs: 42000, itemCount: 20, categoryCount: 5, scoreMultiplier: 2.0 },
  { level: 7, timeLimitMs: 40000, itemCount: 22, categoryCount: 5, scoreMultiplier: 2.3 },
  { level: 8, timeLimitMs: 38000, itemCount: 24, categoryCount: 5, scoreMultiplier: 2.6 },
  { level: 9, timeLimitMs: 35000, itemCount: 26, categoryCount: 6, scoreMultiplier: 3.0 },
  { level: 10, timeLimitMs: 30000, itemCount: 30, categoryCount: 6, scoreMultiplier: 3.5 },
];

const STORAGE_KEY = 'rapid-sort-levels';

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
                ? 'border-purple-500/50 bg-purple-500/10 hover:bg-purple-500/20 cursor-pointer'
                : 'border-gray-700/50 bg-gray-800/30 opacity-50 cursor-not-allowed'
            }`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04, duration: 0.25 }}
          >
            {lvl.unlocked ? (
              <>
                <span className="text-lg font-bold text-white">{lvl.level}</span>
                <span className="text-[10px] text-gray-400">{lvl.itemCount} items</span>
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
        Complete a level to unlock the next. Earn stars by scoring high!
      </div>
    </div>
  );
}

export function updateLevelProgress(level: number, score: number, totalItems: number, correctCount: number) {
  const levels = loadLevels();
  const idx = level - 1;
  if (idx < 0 || idx >= levels.length) return;

  const accuracy = totalItems > 0 ? correctCount / totalItems : 0;
  const stars = accuracy >= 0.95 ? 3 : accuracy >= 0.75 ? 2 : accuracy > 0 ? 1 : 0;

  levels[idx].stars = Math.max(levels[idx].stars, stars);
  levels[idx].highScore = Math.max(levels[idx].highScore, score);

  // Unlock next level
  if (idx + 1 < levels.length && stars >= 1) {
    levels[idx + 1].unlocked = true;
  }

  saveLevels(levels);
}
