import { motion } from 'framer-motion';

interface PauseDialogProps {
  readonly matchedPairs: number;
  readonly totalPairs: number;
  readonly timeElapsed: number;
  readonly onResume: () => void;
  readonly onRestart: () => void;
  readonly onExit: () => void;
}

export function PauseDialog({ matchedPairs, totalPairs, timeElapsed, onResume, onRestart, onExit }: PauseDialogProps) {
  const mins = Math.floor(timeElapsed / 60);
  const secs = timeElapsed % 60;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          width: '280px', borderRadius: '20px',
          border: '1px solid rgba(71,85,105,0.5)',
          background: '#0f172a', padding: '24px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
        }}
      >
        <h2 style={{ margin: '0 0 16px', textAlign: 'center', fontSize: '1.3rem', fontWeight: 700, color: '#fff' }}>
          Paused
        </h2>

        <div style={{
          marginBottom: '24px', display: 'flex', justifyContent: 'space-around',
          borderRadius: '12px', background: 'rgba(30,27,75,0.6)', padding: '12px',
        }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
              {matchedPairs}/{totalPairs}
            </p>
            <p style={{ margin: 0, fontSize: '0.6rem', color: '#94a3b8' }}>Pairs</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
              {mins}:{String(secs).padStart(2, '0')}
            </p>
            <p style={{ margin: 0, fontSize: '0.6rem', color: '#94a3b8' }}>Time</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onResume}
            style={{
              width: '100%', borderRadius: '12px', padding: '12px', border: 'none',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.9rem', color: '#fff',
              boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
            }}
          >
            ▶ Resume
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onRestart}
            style={{
              width: '100%', borderRadius: '12px', padding: '12px', border: 'none',
              background: '#334155', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.9rem', color: '#fff',
            }}
          >
            ↻ Restart
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onExit}
            style={{
              width: '100%', borderRadius: '12px', padding: '12px',
              border: '1px solid #475569', background: 'transparent', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.9rem', color: '#94a3b8',
            }}
          >
            ✕ Exit to Menu
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
