import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  rotation: number;
  size: number;
}

const COLORS = ['#00f0ff', '#8b5cf6', '#f43f5e', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899'];

function generatePieces(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
    delay: Math.random() * 0.8,
    rotation: Math.random() * 360,
    size: 6 + Math.random() * 8,
  }));
}

interface ConfettiProps {
  show: boolean;
  count?: number;
}

export function Confetti({ show, count = 60 }: ConfettiProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (show) setPieces(generatePieces(count));
  }, [show, count]);

  if (!show) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: p.rotation }}
          animate={{ y: '110vh', opacity: 0, rotate: p.rotation + 360 }}
          transition={{ duration: 2.5 + Math.random(), delay: p.delay, ease: 'easeIn' }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
}
