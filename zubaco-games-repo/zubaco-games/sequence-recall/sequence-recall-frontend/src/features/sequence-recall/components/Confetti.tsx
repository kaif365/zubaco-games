import { useEffect, useState, useCallback } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  velocityX: number;
  velocityY: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
}

interface ConfettiProps {
  active: boolean;
  duration?: number;
}

const COLORS = ['#a855f7', '#22c55e', '#3b82f6', '#eab308', '#ef4444', '#ec4899', '#06b6d4'];

function createParticle(id: number): Particle {
  return {
    id,
    x: Math.random() * 100,
    y: -10 - Math.random() * 20,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: 6 + Math.random() * 6,
    velocityX: (Math.random() - 0.5) * 3,
    velocityY: 2 + Math.random() * 3,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 10,
    opacity: 1,
  };
}

export function Confetti({ active, duration = 3000 }: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    const initial = Array.from({ length: 60 }, (_, i) => createParticle(i));
    setParticles(initial);

    let nextId = 60;
    const spawnInterval = setInterval(() => {
      setParticles((prev) => [...prev.slice(-80), createParticle(nextId++)]);
    }, 50);

    const cleanup = setTimeout(() => {
      clearInterval(spawnInterval);
    }, duration);

    return () => {
      clearInterval(spawnInterval);
      clearTimeout(cleanup);
    };
  }, [active, duration]);

  useEffect(() => {
    if (particles.length === 0) return;

    const frame = requestAnimationFrame(() => {
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.velocityX * 0.3,
            y: p.y + p.velocityY * 0.3,
            rotation: p.rotation + p.rotationSpeed,
            opacity: p.y > 100 ? 0 : p.opacity - 0.003,
          }))
          .filter((p) => p.opacity > 0 && p.y < 120)
      );
    });

    return () => cancelAnimationFrame(frame);
  }, [particles]);

  if (!active && particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            transform: `rotate(${p.rotation}deg)`,
            opacity: p.opacity,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
}
