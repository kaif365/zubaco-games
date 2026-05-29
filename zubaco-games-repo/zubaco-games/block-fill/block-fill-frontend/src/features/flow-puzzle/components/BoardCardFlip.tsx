import { useAnimationControls, motion } from 'framer-motion';
import { useEffect, useRef, type ReactNode } from 'react';

export type FlipPhase = 'idle' | 'folding' | 'unfolding';

interface BoardCardFlipProps {
  children: ReactNode;
  flipPhase: FlipPhase;
}

/** Duration of each half of the flip animation in seconds. */
export const FLIP_HALF_S = 0.42;

export function BoardCardFlip({ children, flipPhase }: Readonly<BoardCardFlipProps>) {
  const controls = useAnimationControls();
  const prevPhaseRef = useRef<FlipPhase>('idle');

  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = flipPhase;

    if (flipPhase === 'folding' && prev !== 'folding') {
      void controls.start({
        rotateY: -90,
        transition: { duration: FLIP_HALF_S, ease: [0.4, 0, 1, 1] },
      });
      return;
    }

    if (flipPhase === 'unfolding' && prev !== 'unfolding') {
      void controls.set({ rotateY: 90 });
      void controls.start({
        rotateY: 0,
        transition: { duration: FLIP_HALF_S, ease: [0, 0, 0.6, 1] },
      });
      return;
    }

    if (flipPhase === 'idle' && prev !== 'idle') {
      void controls.set({ rotateY: 0 });
    }
  }, [flipPhase, controls]);

  return (
    <div style={{ perspective: '1400px', width: '100%', height: '100%' }}>
      <motion.div
        animate={controls}
        initial={{ rotateY: 0 }}
        style={{ width: '100%', height: '100%', transformOrigin: 'center center' }}
      >
        {children}
      </motion.div>
    </div>
  );
}
