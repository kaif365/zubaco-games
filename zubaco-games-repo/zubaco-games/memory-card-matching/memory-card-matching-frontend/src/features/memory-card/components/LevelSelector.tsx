import { motion } from 'framer-motion';

// ─── Types & Config ──────────────────────────────────────────────────────────

export interface LevelConfig {
  level: number;
  gridRows: number;
  gridColumns: number;
  pairs: number;
  previewSec: number;
}

export const LEVELS: LevelConfig[] = [
  { level: 1, gridRows: 2, gridColumns: 3, pairs: 3, previewSec: 5 },
  { level: 2, gridRows: 2, gridColumns: 4, pairs: 4, previewSec: 5 },
  { level: 3, gridRows: 3, gridColumns: 4, pairs: 6, previewSec: 4 },
  { level: 4, gridRows: 3, gridColumns: 4, pairs: 6, previewSec: 3 },
  { level: 5, gridRows: 4, gridColumns: 4, pairs: 8, previewSec: 3 },
  { level: 6, gridRows: 4, gridColumns: 5, pairs: 10, previewSec: 3 },
  { level: 7, gridRows: 4, gridColumns: 5, pairs: 10, previewSec: 2 },
  { level: 8, gridRows: 4, gridColumns: 6, pairs: 12, previewSec: 2 },
  { level: 9, gridRows: 5, gridColumns: 6, pairs: 15, previewSec: 2 },
  { level: 10, gridRows: 5, gridColumns: 6, pairs: 15, previewSec: 1 },
];

// ─── Storage ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'memory-card-levels';

interface LevelData {
  highestUnlocked: number;
  stars: Record<number, number>;
}

function loadData(): LevelData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { highestUnlocked: 1, stars: {} };
}

function saveData(data: LevelData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getHighestLevel(): number {
  return loadData().highestUnlocked;
}

export function setHighestLevel(level: number): void {
  const data = loadData();
  if (level > data.highestUnlocked) {
    data.highestUnlocked = level;
    saveData(data);
  }
}

export function getLevelStars(level: number): number {
  return loadData().stars[level] ?? 0;
}

export function setLevelStars(level: number, stars: number): void {
  const data = loadData();
  if (stars > (data.stars[level] ?? 0)) {
    data.stars[level] = stars;
    saveData(data);
  }
}

/** Star calculation: 3★ = 0 mismatches, 2★ = ≤2 mismatches, 1★ = completed */
export function calculateStars(mismatches: number): number {
  if (mismatches === 0) return 3;
  if (mismatches <= 2) return 2;
  return 1;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface LevelSelectorProps {
  readonly onSelect: (config: LevelConfig) => void;
  readonly onBack: () => void;
}

export function LevelSelector({ onSelect, onBack }: LevelSelectorProps) {
  const { highestUnlocked, stars } = loadData();

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 40,
      display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)', padding: '24px',
    }}>
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem' }}>
          ← Back
        </button>
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Select Level</h2>
        <div style={{ width: '50px' }} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px',
          maxWidth: '320px', width: '100%', alignContent: 'start',
        }}>
          {LEVELS.map((config, i) => {
            const unlocked = config.level <= highestUnlocked;
            const levelStars = stars[config.level] ?? 0;
            return (
              <motion.button
                key={config.level}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                whileTap={unlocked ? { scale: 0.9 } : undefined}
                onClick={() => unlocked && onSelect(config)}
                disabled={!unlocked}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '12px', aspectRatio: '1', border: unlocked ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(51,65,85,0.3)',
                  background: unlocked ? 'rgba(30,27,75,0.8)' : 'rgba(15,23,42,0.5)',
                  opacity: unlocked ? 1 : 0.5, cursor: unlocked ? 'pointer' : 'default',
                  padding: '8px',
                }}
              >
                {unlocked ? (
                  <>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{config.level}</span>
                    <div style={{ display: 'flex', gap: '2px', marginTop: '4px' }}>
                      {[1, 2, 3].map((s) => (
                        <span key={s} style={{ fontSize: '0.6rem', color: s <= levelStars ? '#fbbf24' : '#475569' }}>★</span>
                      ))}
                    </div>
                  </>
                ) : (
                  <span style={{ fontSize: '1.1rem', color: '#475569' }}>🔒</span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
