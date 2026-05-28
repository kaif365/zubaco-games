import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  size: number;
  velocityX: number;
  velocityY: number;
  opacity: number;
}

const COLORS = ['#a855f7', '#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#f43f5e'];

function createParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 50 + (Math.random() - 0.5) * 20,
    y: 40 + (Math.random() - 0.5) * 10,
    rotation: Math.random() * 360,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: 4 + Math.random() * 8,
    velocityX: (Math.random() - 0.5) * 6,
    velocityY: -(2 + Math.random() * 5),
    opacity: 1,
  }));
}

interface ConfettiProps {
  readonly active: boolean;
  readonly count?: number;
}

export function Confetti({ active, count = 60 }: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    setParticles(createParticles(count));

    const interval = setInterval(() => {
      setParticles((prev) => {
        const updated = prev.map((p) => ({
          ...p,
          x: p.x + p.velocityX * 0.3,
          y: p.y + p.velocityY * 0.3,
          velocityY: p.velocityY + 0.15,
          rotation: p.rotation + p.velocityX * 2,
          opacity: Math.max(0, p.opacity - 0.012),
        }));
        if (updated.every((p) => p.opacity <= 0)) {
          clearInterval(interval);
          return [];
        }
        return updated;
      });
    }, 1000 / 60);

    return () => clearInterval(interval);
  }, [active, count]);

  if (!active || particles.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[200] overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            transform: `rotate(${p.rotation}deg)`,
            opacity: p.opacity,
          }}
        />
      ))}
    </div>
  );
}
