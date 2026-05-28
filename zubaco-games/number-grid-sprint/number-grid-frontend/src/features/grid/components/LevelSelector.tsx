import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Props {
  onSelect: (level: number) => void;
  onBack: () => void;
}

interface LevelData {
  unlocked: boolean;
  stars: number;
}

const STORAGE_KEY = 'number-grid-levels';

function loadLevels(): LevelData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return Array.from({ length: 10 }, (_, i) => ({ unlocked: i === 0, stars: 0 }));
}

export function unlockLevel(level: number, stars: number) {
  const levels = loadLevels();
  if (level <= 10) {
    levels[level - 1].stars = Math.max(levels[level - 1].stars, stars);
    if (level < 10) levels[level].unlocked = true;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(levels));
}

export function LevelSelector({ onSelect, onBack }: Props) {
  const [levels, setLevels] = useState<LevelData[]>(loadLevels);

  useEffect(() => { setLevels(loadLevels()); }, []);

  // Level config labels
  const configs = ['4×4', '4×4', '5×5', '5×5', '5×5', '6×6', '6×6', '7×7', '7×7', '8×8'];

  return (
    <div className="flex flex-col items-center min-h-screen px-6 py-8 gap-6">
      <div className="flex items-center w-full max-w-sm">
        <button onClick={onBack} className="text-gray-400 hover:text-white font-bold">← Back</button>
        <h2 className="flex-1 text-center text-2xl font-bold">Select Level</h2>
        <div className="w-12" />
      </div>

      <div className="grid grid-cols-5 gap-3 w-full max-w-sm">
        {levels.map((lvl, i) => (
          <motion.button
            key={i}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.04 }}
            disabled={!lvl.unlocked}
            onClick={() => lvl.unlocked && onSelect(i + 1)}
            className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-bold border-2 transition-colors
              ${lvl.unlocked ? 'bg-blue-700 border-blue-500 hover:bg-blue-600' : 'bg-gray-800 border-gray-700 opacity-50'}`}
          >
            {lvl.unlocked ? (
              <>
                <span className="text-lg">{i + 1}</span>
                <span className="text-[10px] text-gray-300">{configs[i]}</span>
                <span className="text-xs">{'★'.repeat(lvl.stars)}{'☆'.repeat(3 - lvl.stars)}</span>
              </>
            ) : (
              <span>🔒</span>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
