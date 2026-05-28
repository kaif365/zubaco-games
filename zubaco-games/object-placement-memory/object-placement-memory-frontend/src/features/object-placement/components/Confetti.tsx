import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

interface Props {
  active: boolean;
  duration?: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  angle: number;
  distance: number;
}

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export function Confetti({ active, duration = 3000 }: Props) {
  const [visible, setVisible] = useState(false);

  const particles = useMemo<Particle[]>(() => {
    if (!active) return [];
    return Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: 50 + (Math.random() - 0.5) * 10,
      y: 50 + (Math.random() - 0.5) * 10,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 4 + Math.random() * 6,
      angle: Math.random() * 360,
      distance: 80 + Math.random() * 200,
    }));
  }, [active]);

  useEffect(() => {
    if (active) {
      setVisible(true);
      const t = setTimeout(() => setVisible(false), duration);
      return () => clearTimeout(t);
    }
    setVisible(false);
  }, [active, duration]);

  if (!visible || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => {
        const rad = (p.angle * Math.PI) / 180;
        const tx = Math.cos(rad) * p.distance;
        const ty = Math.sin(rad) * p.distance;
        return (
          <motion.div
            key={p.id}
            initial={{ left: `${p.x}%`, top: `${p.y}%`, opacity: 1, scale: 1 }}
            animate={{ x: tx, y: ty, opacity: 0, scale: 0.5 }}
            transition={{ duration: duration / 1000, ease: 'easeOut' }}
            className="absolute"
            style={{
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              borderRadius: p.id % 2 === 0 ? '50%' : '2px',
            }}
          />
        );
      })}
    </div>
  );
}
