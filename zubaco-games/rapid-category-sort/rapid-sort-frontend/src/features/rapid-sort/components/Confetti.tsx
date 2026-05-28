import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

interface ConfettiProps {
  active: boolean;
  duration?: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  rotation: number;
  scale: number;
  shape: 'circle' | 'rect';
}

const COLORS = ['#f43f5e', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16'];

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 400,
    y: -(Math.random() * 300 + 100),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotation: Math.random() * 720 - 360,
    scale: Math.random() * 0.5 + 0.5,
    shape: Math.random() > 0.5 ? 'circle' : 'rect',
  }));
}

export function Confetti({ active, duration = 3000 }: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (active) {
      setParticles(generateParticles(60));
      setVisible(true);
      timerRef.current = setTimeout(() => setVisible(false), duration);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active, duration]);

  if (!visible || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute left-1/2 top-1/2"
          initial={{ x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 }}
          animate={{
            x: p.x,
            y: p.y,
            rotate: p.rotation,
            scale: p.scale,
            opacity: 0,
          }}
          transition={{ duration: duration / 1000, ease: 'easeOut' }}
        >
          {p.shape === 'circle' ? (
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
          ) : (
            <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: p.color }} />
          )}
        </motion.div>
      ))}
    </div>
  );
}
