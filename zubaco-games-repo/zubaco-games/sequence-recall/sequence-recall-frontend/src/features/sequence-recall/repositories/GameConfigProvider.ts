import { mockGameConfig, mockPlayerSession } from '@/mocks/gameConfig.mock';
import { simulateLatency } from '@/services/latency';
import type { GameConfig, PlayerSession } from '@/types/game';

export class GameConfigProvider {
  /**
   * Gets config.
   *
   * @returns {Promise<GameConfig>} A promise that resolves with the result.
   */
  async getConfig(): Promise<GameConfig> {
    await simulateLatency(120);
    return mockGameConfig;
  }
  /**
   * Gets player session.
   *
   * @returns {Promise<PlayerSession>} A promise that resolves with the result.
   */
  async getPlayerSession(): Promise<PlayerSession> {
    await simulateLatency(110);
    return mockPlayerSession;
  }
}
