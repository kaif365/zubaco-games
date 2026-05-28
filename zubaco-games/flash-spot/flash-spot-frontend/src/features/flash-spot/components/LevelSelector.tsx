import { motion } from 'framer-motion';

const LEVEL_KEY = 'zubaco_flash_spot_level';
const STARS_KEY = 'zubaco_flash_spot_stars';

export function getHighestLevel(): number {
  try { return parseInt(localStorage.getItem(LEVEL_KEY) || '1', 10); } catch { return 1; }
}

export function setHighestLevel(level: number): void {
  const current = getHighestLevel();
  if (level > current) localStorage.setItem(LEVEL_KEY, String(level));
}

export function getLevelStars(level: number): number {
  try {
    const data = JSON.parse(localStorage.getItem(STARS_KEY) || '{}');
    return data[String(level)] || 0;
  } catch { return 0; }
}

export function setLevelStars(level: number, stars: number): void {
  try {
    const data = JSON.parse(localStorage.getItem(STARS_KEY) || '{}');
    const current = data[String(level)] || 0;
    if (stars > current) {
      data[String(level)] = stars;
      localStorage.setItem(STARS_KEY, JSON.stringify(data));
    }
  } catch { /* ignore */ }
}

const LEVELS = [
  { level: 1, name: 'Beginner', grid: '4×4', time: '60s' },
  { level: 2, name: 'Easy', grid: '4×4', time: '55s' },
  { level: 3, name: 'Normal', grid: '5×5', time: '50s' },
  { level: 4, name: 'Medium', grid: '5×5', time: '48s' },
  { level: 5, name: 'Tricky', grid: '5×5', time: '45s' },
  { level: 6, name: 'Hard', grid: '6×6', time: '42s' },
  { level: 7, name: 'Tough', grid: '6×6', time: '40s' },
  { level: 8, name: 'Expert', grid: '6×6', time: '38s' },
  { level: 9, name: 'Master', grid: '7×7', time: '35s' },
  { level: 10, name: 'Legend', grid: '7×7', time: '30s' },
];

interface LevelSelectorProps {
  onSelect: (level: number) => void;
  onBack: () => void;
}

export function LevelSelector({ onSelect, onBack }: LevelSelectorProps) {
  const highest = getHighestLevel();

  return (
    <div className="flex h-screen flex-col bg-game-bg px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Select Level</h2>
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-white">← Back</button>
      </div>

      <div className="grid grid-cols-2 gap-3 overflow-y-auto">
        {LEVELS.map((lv) => {
          const unlocked = lv.level <= highest;
          const stars = getLevelStars(lv.level);

          return (
            <motion.button
              key={lv.level}
              whileHover={unlocked ? { scale: 1.03 } : {}}
              whileTap={unlocked ? { scale: 0.97 } : {}}
              onClick={() => unlocked && onSelect(lv.level)}
              disabled={!unlocked}
              className={`relative rounded-xl p-4 text-left transition-colors ${
                unlocked
                  ? 'bg-white/5 hover:bg-white/10 border border-game-accent/30'
                  : 'bg-white/3 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-white">{lv.level}</span>
                {!unlocked && <span className="text-sm">🔒</span>}
                {unlocked && lv.level === highest && (
                  <span className="h-2 w-2 rounded-full bg-game-accent animate-pulse" />
                )}
              </div>
              <div className="mt-1 text-xs text-gray-400">{lv.name}</div>
              <div className="mt-0.5 text-xs text-gray-500">{lv.grid} · {lv.time}</div>
              {stars > 0 && (
                <div className="mt-1 text-xs">
                  {'★'.repeat(stars)}{'☆'.repeat(3 - stars)}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
