import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface LevelData {
  level: number;
  unlocked: boolean;
  stars: number;
  highScore: number;
  timeLimitMs: number;
  roundCount: number;
  maxReactionMs: number;
  scoreMultiplier: number;
}

interface LevelSelectorProps {
  onBack: () => void;
  onSelectLevel: (level: number) => void;
}

const LEVEL_CONFIGS = [
  { level: 1, timeLimitMs: 60000, roundCount: 10, maxReactionMs: 1000, scoreMultiplier: 1.0 },
  { level: 2, timeLimitMs: 55000, roundCount: 12, maxReactionMs: 900, scoreMultiplier: 1.2 },
  { level: 3, timeLimitMs: 52000, roundCount: 14, maxReactionMs: 850, scoreMultiplier: 1.4 },
  { level: 4, timeLimitMs: 50000, roundCount: 16, maxReactionMs: 800, scoreMultiplier: 1.6 },
  { level: 5, timeLimitMs: 48000, roundCount: 18, maxReactionMs: 750, scoreMultiplier: 1.8 },
  { level: 6, timeLimitMs: 45000, roundCount: 20, maxReactionMs: 700, scoreMultiplier: 2.0 },
  { level: 7, timeLimitMs: 42000, roundCount: 22, maxReactionMs: 650, scoreMultiplier: 2.3 },
  { level: 8, timeLimitMs: 40000, roundCount: 24, maxReactionMs: 600, scoreMultiplier: 2.6 },
  { level: 9, timeLimitMs: 38000, roundCount: 26, maxReactionMs: 550, scoreMultiplier: 3.0 },
  { level: 10, timeLimitMs: 35000, roundCount: 30, maxReactionMs: 500, scoreMultiplier: 3.5 },
];

const STORAGE_KEY = 'reflex-endurance-levels';

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
                ? 'border-green-500/50 bg-green-500/10 hover:bg-green-500/20 cursor-pointer'
                : 'border-gray-700/50 bg-gray-800/30 opacity-50 cursor-not-allowed'
            }`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04, duration: 0.25 }}
          >
            {lvl.unlocked ? (
              <>
                <span className="text-lg font-bold text-white">{lvl.level}</span>
                <span className="text-[10px] text-gray-400">{lvl.maxReactionMs}ms</span>
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
        Complete a level to unlock the next. Reaction windows shrink each level!
      </div>
    </div>
  );
}

export function updateLevelProgress(level: number, score: number, wrongTaps: number, totalGreens: number) {
  const levels = loadLevels();
  const idx = level - 1;
  if (idx < 0 || idx >= levels.length) return;

  const accuracy = totalGreens > 0 ? (score / totalGreens) : 0;
  const stars = wrongTaps === 0 ? 3 : accuracy >= 0.8 ? 2 : score > 0 ? 1 : 0;

  levels[idx].stars = Math.max(levels[idx].stars, stars);
  levels[idx].highScore = Math.max(levels[idx].highScore, score);

  if (idx + 1 < levels.length && stars >= 1) {
    levels[idx + 1].unlocked = true;
  }

  saveLevels(levels);
}
