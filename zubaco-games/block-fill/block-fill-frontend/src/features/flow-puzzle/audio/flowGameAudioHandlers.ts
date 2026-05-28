import type { SoundKey } from '@/audio/soundRegistry';
import type { FlowSessionTransitionHandlers } from '@/features/flow-puzzle/hooks/useFlowGame';

/**
 * Maps grid session transitions to SFX: pickup on path start, release on path end.
 *
 * @param play Plays a sound from the global registry
 */
export function createFlowGameTransitionHandlers(
  play: (key: SoundKey) => void,
): FlowSessionTransitionHandlers {
  return {
    onAfterBeginPath(prev, next) {
      if (next === prev) return;
      void play('pathPickUp');
    },
    onAfterEndPath(prev, next) {
      if (next === prev) return;
      void play('pathRelease');
    },
  };
}
