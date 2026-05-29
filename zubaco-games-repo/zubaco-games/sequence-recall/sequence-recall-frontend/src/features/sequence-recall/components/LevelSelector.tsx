import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface LevelData {
  level: number;
  unlocked: boolean;
  stars: number;
  highScore: number;
  sequenceLength: number;
  timerSeconds: number;
  scoreMultiplier: number;
}

interface LevelSelectorProps {
  onBack: () => void;
  onSelectLevel: (level: number) => void;
}

const LEVEL_CONFIGS = [
  { level: 1, sequenceLength: 3, timerSeconds: 90, scoreMultiplier: 1.0 },
  { level: 2, sequenceLength: 4, timerSeconds: 85, scoreMultiplier: 1.2 },
  { level: 3, sequenceLength: 5, timerSeconds: 80, scoreMultiplier: 1.4 },
  { level: 4, sequenceLength: 6, timerSeconds: 75, scoreMultiplier: 1.6 },
  { level: 5, sequenceLength: 7, timerSeconds: 70, scoreMultiplier: 1.8 },
  { level: 6, sequenceLength: 8, timerSeconds: 65, scoreMultiplier: 2.0 },
  { level: 7, sequenceLength: 9, timerSeconds: 60, scoreMultiplier: 2.3 },
  { level: 8, sequenceLength: 10, timerSeconds: 55, scoreMultiplier: 2.6 },
  { level: 9, sequenceLength: 11, timerSeconds: 50, scoreMultiplier: 3.0 },
  { level: 10, sequenceLength: 12, timerSeconds: 45, scoreMultiplier: 3.5 },
];

const STORAGE_KEY = 'sequence-recall-levels';

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
                <span className="text-[10px] text-gray-400">{lvl.sequenceLength} tiles</span>
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
        Complete a level to unlock the next. Sequences get longer!
      </div>
    </div>
  );
}

export function updateLevelProgress(level: number, score: number, roundsCompleted: number, totalRounds: number) {
  const levels = loadLevels();
  const idx = level - 1;
  if (idx < 0 || idx >= levels.length) return;

  const completionRate = totalRounds > 0 ? roundsCompleted / totalRounds : 0;
  const stars = completionRate >= 0.95 ? 3 : completionRate >= 0.7 ? 2 : completionRate > 0 ? 1 : 0;

  levels[idx].stars = Math.max(levels[idx].stars, stars);
  levels[idx].highScore = Math.max(levels[idx].highScore, score);

  if (idx + 1 < levels.length && stars >= 1) {
    levels[idx + 1].unlocked = true;
  }

  saveLevels(levels);
}
