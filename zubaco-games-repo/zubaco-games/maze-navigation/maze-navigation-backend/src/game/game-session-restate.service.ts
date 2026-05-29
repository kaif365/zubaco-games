import { config } from "@config";
import { Injectable } from "@nestjs/common";
import * as restateClients from "@restatedev/restate-sdk-clients";

import type { SubmitMovesDto } from "./dto/submit-moves.dto";
import { GAME_SESSION_RESTATE_TARGET } from "./game-session.restate";

@Injectable()
export class GameSessionRestateService {
  private readonly restateClient = restateClients.connect({
    url: config.restate.ingressUrl,
  });

  /**
   * Start or re-enter a game through Restate.
   *
   * @param {string} userId - user id value.
   * @param {string} stageId - stage id value.
   * @param {string} clientSeed - client seed value.
   *
   * @returns {Promise<GameResponse>} The asynchronous result.
   */
  async startGame(userId: string, stageId: string, clientSeed: string) {
    return this.restateClient
      .objectClient(
        GAME_SESSION_RESTATE_TARGET,
        this.objectKey(userId, stageId),
      )
      .startGame({ userId, stageId, clientSeed });
  }

  /**
   * Get game status through Restate.
   *
   * @param {string} userId - user id value.
   * @param {string} stageId - stage id value.
   *
   * @returns {Promise<GameResponse>} The asynchronous result.
   */
  async getStatus(userId: string, stageId: string) {
    return this.restateClient
      .objectClient(
        GAME_SESSION_RESTATE_TARGET,
        this.objectKey(userId, stageId),
      )
      .getStatus({ userId, stageId });
  }

  /**
   * Route nextBoard through Restate.
   *
   * @param {string} userId - user id value.
   * @param {string} stageId - stage id value.
   *
   * @returns {Promise<MazeResponse>} The asynchronous result.
   */
  async nextBoard(userId: string, stageId: string) {
    return this.restateClient
      .objectClient(
        GAME_SESSION_RESTATE_TARGET,
        this.objectKey(userId, stageId),
      )
      .nextBoard({ userId, stageId });
  }

  /**
   * Route submitMoves through Restate.
   *
   * @param {string} userId - user id value.
   * @param {string} stageId - stage id value.
   * @param {SubmitMovesDto} dto - dto value.
   *
   * @returns {Promise<{ accepted: number; startedAt: string; expiryAt: string }>} The asynchronous result.
   */
  async submitMoves(userId: string, stageId: string, dto: SubmitMovesDto) {
    return this.restateClient
      .objectClient(
        GAME_SESSION_RESTATE_TARGET,
        this.objectKey(userId, stageId),
      )
      .submitMoves({ userId, stageId, dto });
  }

  /**
   * Route endBoard through Restate.
   *
   * @param {string} userId - user id value.
   * @param {string} stageId - stage id value.
   *
   * @returns {Promise<EndBoardResponse>} The asynchronous result.
   */
  async endBoard(userId: string, stageId: string) {
    return this.restateClient
      .objectClient(
        GAME_SESSION_RESTATE_TARGET,
        this.objectKey(userId, stageId),
      )
      .endBoard({ userId, stageId });
  }

  /**
   * Route endGame through Restate.
   *
   * @param {string} userId - user id value.
   * @param {string} stageId - stage id value.
   *
   * @returns {Promise<{ status: number; totalScore: number; timeBonus: number }>} The asynchronous result.
   */
  async endGame(userId: string, stageId: string) {
    return this.restateClient
      .objectClient(
        GAME_SESSION_RESTATE_TARGET,
        this.objectKey(userId, stageId),
      )
      .endGame({ userId, stageId });
  }

  /**
   * Build the Restate Virtual Object key for this user's game session.
   *
   * @param {string} userId - user id value.
   * @param {string} stageId - stage id value.
   *
   * @returns {string} The string result.
   */
  private objectKey(userId: string, stageId: string): string {
    return `${userId}:${stageId}`;
  }
}
