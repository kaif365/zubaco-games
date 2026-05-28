import { mockTutorialSteps } from '@/mocks/gameConfig.mock';
import { simulateLatency } from '@/services/latency';
import type { TutorialStep } from '@/types/game';

export class TutorialRepository {
  /**
   * Gets tutorial steps.
   *
   * @returns {Promise<TutorialStep[]>} A promise that resolves with the result.
   */
  async getTutorialSteps(): Promise<TutorialStep[]> {
    await simulateLatency(140);
    return mockTutorialSteps;
  }
}
