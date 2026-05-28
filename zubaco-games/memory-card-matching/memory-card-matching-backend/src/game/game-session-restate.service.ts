import { config } from "@config";
import { Injectable } from "@nestjs/common";
import * as restateClients from "@restatedev/restate-sdk-clients";

import type { SaveProgressDto } from "./dto/save-progress.dto";
import {
  GAME_SESSION_RESTATE_TARGET,
  type GameSessionRestateObject,
} from "./game-session.restate";
import type {
  CompleteBoardResponse,
  CurrentSessionResponse,
  GameOverResponse,
  NextLevelResponse,
  SaveProgressResponse,
  StartGameResponse,
} from "./types/game.types";

interface RestateGameSessionObjectClient {
  startGame(input: {
    ownerKey: string;
    stageId: string;
  }): Promise<StartGameResponse>;
  getCurrentSession(input: {
    ownerKey: string;
  }): Promise<CurrentSessionResponse>;
  getNextLevel(input: { ownerKey: string }): Promise<NextLevelResponse>;
  saveProgress(input: {
    ownerKey: string;
    payload: SaveProgressDto;
  }): Promise<SaveProgressResponse>;
  completeBoard(input: { ownerKey: string }): Promise<CompleteBoardResponse>;
  gameOver(input: {
    ownerKey: string;
    stageId: string;
  }): Promise<GameOverResponse>;
  getTimerState(input: { ownerKey: string }): Promise<{
    startTimeMs: number;
    endTimeMs: number;
  } | null>;
  markResultProcessing(input: { sessionId: string }): Promise<void>;
  finalizeExpired(input: { sessionId: string }): Promise<void>;
}

interface RestateClientLike {
  objectClient(
    target: GameSessionRestateObject,
    key: string,
  ): RestateGameSessionObjectClient;
}

@Injectable()
export class GameSessionRestateService {
  private readonly restateClient = restateClients.connect({
    url: config.restate.ingressUrl,
  }) as unknown as RestateClientLike;

  private objectKey(userId: string, stageId: string): string {
    return `${userId}:${stageId}`;
  }

  startGame(userId: string, stageId: string): Promise<StartGameResponse> {
    return this.restateClient
      .objectClient(
        GAME_SESSION_RESTATE_TARGET,
        this.objectKey(userId, stageId),
      )
      .startGame({ ownerKey: userId, stageId });
  }

  getCurrentSession(
    userId: string,
    stageId: string,
  ): Promise<CurrentSessionResponse> {
    return this.restateClient
      .objectClient(
        GAME_SESSION_RESTATE_TARGET,
        this.objectKey(userId, stageId),
      )
      .getCurrentSession({ ownerKey: userId });
  }

  getNextLevel(userId: string, stageId: string): Promise<NextLevelResponse> {
    return this.restateClient
      .objectClient(
        GAME_SESSION_RESTATE_TARGET,
        this.objectKey(userId, stageId),
      )
      .getNextLevel({ ownerKey: userId });
  }

  saveProgress(
    userId: string,
    stageId: string,
    payload: SaveProgressDto,
  ): Promise<SaveProgressResponse> {
    return this.restateClient
      .objectClient(
        GAME_SESSION_RESTATE_TARGET,
        this.objectKey(userId, stageId),
      )
      .saveProgress({
        ownerKey: userId,
        payload,
      });
  }

  completeBoard(
    userId: string,
    stageId: string,
  ): Promise<CompleteBoardResponse> {
    return this.restateClient
      .objectClient(
        GAME_SESSION_RESTATE_TARGET,
        this.objectKey(userId, stageId),
      )
      .completeBoard({
        ownerKey: userId,
      });
  }

  gameOver(userId: string, stageId: string): Promise<GameOverResponse> {
    return this.restateClient
      .objectClient(
        GAME_SESSION_RESTATE_TARGET,
        this.objectKey(userId, stageId),
      )
      .gameOver({ ownerKey: userId, stageId });
  }

  getTimerState(
    userId: string,
    stageId: string,
  ): Promise<{
    startTimeMs: number;
    endTimeMs: number;
  } | null> {
    return this.restateClient
      .objectClient(
        GAME_SESSION_RESTATE_TARGET,
        this.objectKey(userId, stageId),
      )
      .getTimerState({ ownerKey: userId });
  }
}
