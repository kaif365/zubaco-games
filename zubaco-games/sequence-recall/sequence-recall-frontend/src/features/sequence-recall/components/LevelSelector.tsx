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

const DIFFICULTY_LABELS = ['Beginner', 'Easy', 'Normal', 'Medium', 'Tricky', 'Hard', 'Tough', 'Expert', 'Master', 'Legend'];

export function LevelSelector({ onBack, onSelectLevel }: LevelSelectorProps) {
  const [levels, setLevels] = useState<LevelData[]>(loadLevels);

  useEffect(() => {
    saveLevels(levels);
  }, [levels]);

  const currentLevel = Math.max(...levels.filter(l => l.unlocked).map(l => l.level));

  return (
    <motion.div
      className="flex flex-col items-center gap-6 px-4 py-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="text-2xl font-bold text-white">Select Level</h2>
      <p className="text-sm text-gray-400 text-center">Memorize and repeat the sequence — they get longer!</p>

      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {levels.map((lvl, idx) => {
          const isCurrent = lvl.level === currentLevel;
          const config = LEVEL_CONFIGS[idx];
          return (
            <motion.button
              key={lvl.level}
              onClick={() => lvl.unlocked && onSelectLevel(lvl.level)}
              disabled={!lvl.unlocked}
              className={`relative p-4 rounded-xl border-2 text-left transition-all
                ${isCurrent
                  ? 'border-indigo-400 bg-indigo-500/15 shadow-lg shadow-indigo-500/20'
                  : lvl.unlocked
                  ? 'border-gray-600 bg-gray-800/60 hover:border-gray-400'
                  : 'border-gray-700/50 bg-gray-900/40 opacity-50 cursor-not-allowed'
                }`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={lvl.unlocked ? { scale: 1.03 } : {}}
              whileTap={lvl.unlocked ? { scale: 0.97 } : {}}
            >
              <div className="flex items-center justify-between">
                <span className={`text-lg font-bold ${lvl.unlocked ? 'text-white' : 'text-gray-600'}`}>
                  {lvl.level}
                </span>
                {!lvl.unlocked && (
                  <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
                {lvl.unlocked && (
                  <div className="flex gap-0.5">
                    {[1, 2, 3].map((s) => (
                      <span key={s} className={`text-xs ${s <= lvl.stars ? 'text-yellow-400' : 'text-gray-600'}`}>★</span>
                    ))}
                  </div>
                )}
              </div>
              <div className={`text-xs mt-1 ${lvl.unlocked ? 'text-gray-400' : 'text-gray-600'}`}>
                {DIFFICULTY_LABELS[idx]}
              </div>
              <div className={`text-xs mt-0.5 ${lvl.unlocked ? 'text-gray-500' : 'text-gray-700'}`}>
                {config.sequenceLength} tiles · {config.timerSeconds}s
              </div>
              {isCurrent && (
                <motion.div
                  className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-400 rounded-full"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      <button
        onClick={onBack}
        className="mt-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        ← Back to Menu
      </button>
    </motion.div>
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
