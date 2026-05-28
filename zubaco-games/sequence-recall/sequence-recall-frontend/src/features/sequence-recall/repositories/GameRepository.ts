import {
  applyMove,
  applySessionTimeout,
  createInitialGameState,
  finishPlayback,
  restartGame,
  startRound,
} from '@/features/sequence-recall/engine/gameEngine';
import { simulateLatency } from '@/services/latency';
import { GAME_PHASE } from '@/types/game';
import type {
  GameConfig,
  GamePhase,
  GameState,
  SubmitMoveRequest,
  SubmitMoveResponse,
} from '@/types/game';

export class GameRepository {
  private config: GameConfig;
  private gameState: GameState;

  constructor(config: GameConfig) {
    this.config = config;
    // Pass initialSequenceLength so the engine can set the correct starting length
    this.gameState = createInitialGameState(config, config.initialSequenceLength);
  }

  /**
   * Gets initial state.
   *
   * @returns {Promise<GameState>} A promise that resolves with the result.
   */
  async getInitialState() {
    await simulateLatency();
    return this.gameState;
  }

  /**
   * Start game.
   *
   * @returns {Promise<GameState>} A promise that resolves with the result.
   */
  async startGame() {
    await simulateLatency(180);
    this.gameState = startRound(this.gameState);
    return this.gameState;
  }

  /**
   * Finish playback.
   *
   * @returns {Promise<GameState>} A promise that resolves with the result.
   */
  async finishPlayback() {
    await simulateLatency(80);
    this.gameState = finishPlayback(this.gameState);
    return this.gameState;
  }

  /**
   * Submit move.
   *
   * @param {SubmitMoveRequest} request - Request data.
   * @param {number} request.tileId - The tile id.
   *
   * @returns {Promise<SubmitMoveResponse>} A promise that resolves with the result.
   */
  async submitMove({ tileId }: SubmitMoveRequest): Promise<SubmitMoveResponse> {
    await simulateLatency(140);
    this.gameState = applyMove(this.gameState, this.config, tileId);
    const terminalPhases: GamePhase[] = [
      GAME_PHASE.ROUND_FAILURE,
      GAME_PHASE.GAME_OVER,
      GAME_PHASE.SESSION_COMPLETE,
    ];
    const completedPhases: GamePhase[] = [
      GAME_PHASE.ROUND_SUCCESS,
      GAME_PHASE.SESSION_COMPLETE,
      GAME_PHASE.ROUND_FAILURE,
      GAME_PHASE.GAME_OVER,
    ];
    return {
      isCorrect: !terminalPhases.includes(this.gameState.phase),
      completedRound: completedPhases.includes(this.gameState.phase),
      wonGame: this.gameState.phase === GAME_PHASE.SESSION_COMPLETE,
      state: this.gameState,
    };
  }

  // Session-level timeout: ends the whole game when the session timer expires
  /**
   * Session timeout game.
   *
   * @returns {Promise<GameState>} A promise that resolves with the result.
   */
  async sessionTimeoutGame() {
    await simulateLatency(60);
    this.gameState = applySessionTimeout(this.gameState);
    return this.gameState;
  }

  /**
   * Replay current round.
   *
   * @returns {Promise<GameState>} A promise that resolves with the result.
   */
  async replayCurrentRound() {
    await simulateLatency(140);
    this.gameState = startRound(this.gameState);
    return this.gameState;
  }

  /**
   * Restart game.
   *
   * @returns {Promise<GameState>} A promise that resolves with the result.
   */
  async restartGame() {
    await simulateLatency(220);
    this.gameState = restartGame(
      this.config,
      this.gameState.highScore,
      this.config.initialSequenceLength,
    );
    return this.gameState;
  }
}
