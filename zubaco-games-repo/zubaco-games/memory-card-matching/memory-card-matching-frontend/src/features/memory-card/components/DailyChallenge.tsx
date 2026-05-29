import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDailySeed(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getWeekDays(): { label: string; dateStr: string; isToday: boolean }[] {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const days: { label: string; dateStr: string; isToday: boolean }[] = [];
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push({ label: dayNames[i], dateStr, isToday: dateStr === getDailySeed() });
  }
  return days;
}

// ─── Storage ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'memory-card-daily';

interface DailyData {
  completedDates: string[];
  currentStreak: number;
  bestStreak: number;
}

function loadDaily(): DailyData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { completedDates: [], currentStreak: 0, bestStreak: 0 };
}

function saveDaily(data: DailyData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function markDailyComplete(): void {
  const data = loadDaily();
  const today = getDailySeed();
  if (data.completedDates.includes(today)) return;
  data.completedDates.push(today);
  data.currentStreak += 1;
  data.bestStreak = Math.max(data.bestStreak, data.currentStreak);
  saveDaily(data);
}

export function isDailyCompleted(): boolean {
  return loadDaily().completedDates.includes(getDailySeed());
}

export function getDailySeedValue(): string {
  return getDailySeed();
}

// ─── Component ───────────────────────────────────────────────────────────────

interface DailyChallengeProps {
  readonly onPlay: () => void;
  readonly onBack: () => void;
}

export function DailyChallenge({ onPlay, onBack }: DailyChallengeProps) {
  const [daily] = useState(loadDaily);
  const weekDays = useMemo(getWeekDays, []);
  const completed = daily.completedDates.includes(getDailySeed());

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
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Daily Challenge</h2>
        <div style={{ width: '50px' }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', maxWidth: '320px', margin: '0 auto', width: '100%' }}>
        {/* Calendar Week */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: '32px', width: '100%' }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
            {weekDays.map((day) => {
              const isDone = daily.completedDates.includes(day.dateStr);
              return (
                <div
                  key={day.dateStr}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    borderRadius: '12px', padding: '10px 0',
                    border: day.isToday ? '2px solid #3b82f6' : '1px solid rgba(71,85,105,0.4)',
                    background: day.isToday ? 'rgba(30,27,75,0.8)' : 'rgba(30,27,75,0.4)',
                  }}
                >
                  <span style={{ fontSize: '0.6rem', color: '#94a3b8', marginBottom: '4px' }}>{day.label}</span>
                  <span style={{ fontSize: '0.8rem', color: isDone ? '#34d399' : '#64748b' }}>
                    {isDone ? '✓' : '○'}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Streak */}
        <div style={{ marginBottom: '32px', display: 'flex', gap: '40px', textAlign: 'center' }}>
          <div>
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>{daily.currentStreak}</p>
            <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8' }}>Current Streak</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#fbbf24' }}>{daily.bestStreak}</p>
            <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8' }}>Best Streak</p>
          </div>
        </div>

        {/* Info */}
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1' }}>Today's card layout uses a unique seed</p>
          <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#3b82f6' }}>1.5× score multiplier</p>
        </div>

        {/* Play Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onPlay}
          disabled={completed}
          style={{
            width: '100%', maxWidth: '280px', borderRadius: '14px', padding: '16px',
            border: 'none', cursor: completed ? 'default' : 'pointer',
            fontWeight: 700, fontSize: '0.95rem', color: '#fff',
            background: completed ? '#475569' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            opacity: completed ? 0.6 : 1,
            boxShadow: completed ? 'none' : '0 4px 16px rgba(59,130,246,0.3)',
          }}
        >
          {completed ? '✓ Completed Today' : 'Start Daily Match'}
        </motion.button>
      </div>
    </div>
  );
}
