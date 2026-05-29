import { motion } from 'framer-motion';

interface MenuScreenProps {
  readonly onPlay: () => void;
  readonly onLevels: () => void;
  readonly onDaily: () => void;
  readonly onAchievements: () => void;
  readonly onStats: () => void;
  readonly onSettings: () => void;
}

const MENU_ITEMS = [
  { key: 'play', label: 'Play', icon: '▶️', accent: '#3b82f6' },
  { key: 'levels', label: 'Levels', icon: '🃏', accent: '#8b5cf6' },
  { key: 'daily', label: 'Daily Challenge', icon: '📅', accent: '#d97706' },
  { key: 'achievements', label: 'Achievements', icon: '🏆', accent: '#059669' },
  { key: 'stats', label: 'Statistics', icon: '📊', accent: '#0891b2' },
  { key: 'settings', label: 'Settings', icon: '⚙️', accent: '#475569' },
] as const;

export function MenuScreen({ onPlay, onLevels, onDaily, onAchievements, onStats, onSettings }: MenuScreenProps) {
  const handlers: Record<string, () => void> = {
    play: onPlay,
    levels: onLevels,
    daily: onDaily,
    achievements: onAchievements,
    stats: onStats,
    settings: onSettings,
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 40,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)', padding: '24px',
    }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '32px', textAlign: 'center' }}
      >
        <div style={{ marginBottom: '8px', fontSize: '2.5rem' }}>🃏</div>
        <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
          Memory Match
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'rgba(200,170,120,0.6)', letterSpacing: '0.08em' }}>
          Find all the matching pairs
        </p>
      </motion.div>

      <div style={{ width: '100%', maxWidth: '300px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {MENU_ITEMS.map((item, i) => (
          <motion.button
            key={item.key}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            whileTap={{ scale: 0.97 }}
            onClick={handlers[item.key]}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
              borderRadius: '14px', background: item.accent, border: 'none',
              padding: '14px 20px', textAlign: 'left', cursor: 'pointer',
              boxShadow: `0 4px 12px ${item.accent}40`,
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>{item.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
