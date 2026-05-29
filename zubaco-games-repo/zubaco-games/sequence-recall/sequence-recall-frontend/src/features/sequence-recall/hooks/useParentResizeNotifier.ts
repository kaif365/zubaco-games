import { useEffect } from 'react';

import { postParentMessage } from '@/lib/embed/messaging';

/**
 * Hook for parent resize notifier.
 *
 * @param {number} score - The score.
 * @param {number} level - The level.
 * @param {number} lives - The lives.
 *
 * @returns {void} No return value.
 */
export function useParentResizeNotifier(score: number, level: number, lives: number) {
  useEffect(() => {
    /**
     * Emit.
     *
     * @returns {void} No return value.
     */
    const emit = () => {
      postParentMessage({
        type: 'SEQUENCE_RECALL_RESIZE',
        payload: { width: window.innerWidth, height: window.innerHeight },
      });
    };
    emit();
    window.addEventListener('resize', emit);
    return () => {
      window.removeEventListener('resize', emit);
    };
  }, []);

  useEffect(() => {
    postParentMessage({ type: 'SEQUENCE_RECALL_SCORE_UPDATE', payload: { score, level, lives } });
  }, [lives, level, score]);
}
