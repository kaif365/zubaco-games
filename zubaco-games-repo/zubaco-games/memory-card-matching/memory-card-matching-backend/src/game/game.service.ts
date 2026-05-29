import {
  ANTI_CHEAT_CONFIGS,
  CHEAT_FLAG_TYPE,
  ERROR_CODES,
  GAME_CONFIGS,
  GAME_SESSION_STATUS,
  STATUS_CODES,
} from "@common/constants";
import { PrismaService } from "@common/prisma/prisma.service";
import { config } from "@config";
import { HttpException, Injectable, Logger } from "@nestjs/common";
import type { Level, Prisma } from "@prisma/client";

import {
  StageConfigService,
  type ResolvedStageConfig,
} from "../admin/stage-config/stage-config.service";
import { SnsService } from "../aws/sns.service";

import type { SaveProgressDto } from "./dto/save-progress.dto";
import { GameExpiryService } from "./game-expiry.service";
import { throwTerminalError } from "./restate-errors";
import type {
  ActiveGameSessionState,
  CardContentType,
  CompleteBoardResponse,
  CurrentSessionResponse,
  GameConfigResponse,
  GameOverResponse,
  LevelCard,
  LevelData,
  MatchedPairProgressEntry,
  NextLevelResponse,
  SaveProgressResponse,
  SessionLevelSnapshot,
  SessionMoveRecord,
  StartGameResponse,
} from "./types/game.types";

interface PersistedGameSessionSnapshot {
  gameSessionId: string;
  stageConfigSnapshotId: string;
  levels: Array<{
    gameSessionLevelId: string;
    levelIndex: number;
    sourceLevelId: string;
  }>;
}

interface ExistingPersistedGameSession {
  id: string;
  ownerKey: string;
  stageId: string;
  status: string;
  startedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  stageConfigSnapshot: {
    id: string;
    gameTimeLimitSeconds: number;
    levels: Array<{
      id: string;
      sourceLevelId: string;
      levelIndex: number;
      gridRows: number;
      gridColumns: number;
      cardContentType: string;
      previewDurationSeconds: number;
      mismatchDisplayDurationSeconds: number;
      cards: Array<{
        cardId: string;
        pairId: string;
        contentType: string;
        content: string;
        imageUrl: string | null;
      }>;
    }>;
  } | null;
}

type FinalizedGameResult = "win" | "lose";

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stageConfigService: StageConfigService,
    private readonly expiry: GameExpiryService,
    private readonly sns: SnsService,
  ) {}

  async getConfig(stageId: string): Promise<GameConfigResponse> {
    const stageConfig =
      await this.stageConfigService.getResolvedStageConfig(stageId);

    return {
      gameTimeLimitSeconds: stageConfig.gameTimeLimitSeconds,
      totalLevels: stageConfig.levels.length,
      enableDemo: stageConfig.enableDemo,
    };
  }

  async getResolvedGameplayConfig(
    stageId: string,
  ): Promise<ResolvedStageConfig> {
    try {
      return await this.stageConfigService.getResolvedStageConfig(stageId);
    } catch (error) {
      if (error instanceof HttpException) {
        const response = error.getResponse();
        if (typeof response === "string") {
          throwTerminalError(response, response, error.getStatus());
        }

        if (typeof response === "object" && response !== null) {
          const payload = response as Record<string, unknown>;
          const message =
            typeof payload.message === "string"
              ? payload.message
              : "Unable to resolve stage config";
          const code =
            typeof payload.error === "string" ? payload.error : message;
          throwTerminalError(code, message, error.getStatus());
        }
      }

      throw error;
    }
  }

  async buildNewSession(
    ownerKey: string,
    stageConfig: ResolvedStageConfig,
    startedAtMs: number,
  ): Promise<ActiveGameSessionState> {
    const existingSession = await this.fetchReusableActiveSession(
      ownerKey,
      stageConfig,
    );
    if (existingSession) {
      this.logger.warn(
        `[${ownerKey}] Reusing existing active game session ${existingSession.sessionId}`,
      );
      return existingSession;
    }

    const levels = stageConfig.levels.map((level, index) =>
      this.buildLevelSnapshot(level, index),
    );
    const now = new Date(startedAtMs).toISOString();
    let persistedSnapshot: PersistedGameSessionSnapshot;
    try {
      persistedSnapshot = await this.persistSessionSnapshot(
        ownerKey,
        stageConfig,
        levels,
        startedAtMs,
      );
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        const retriedSession = await this.fetchReusableActiveSession(
          ownerKey,
          stageConfig,
        );
        if (retriedSession) {
          this.logger.warn(
            `[${ownerKey}] create game session retry reused ${retriedSession.sessionId}`,
          );
          return retriedSession;
        }
      }

      throw error;
    }

    return {
      sessionId: persistedSnapshot.gameSessionId,
      ownerKey,
      stageId: stageConfig.stageId,
      status: GAME_SESSION_STATUS.STARTED,
      gameTimeLimitSeconds: stageConfig.gameTimeLimitSeconds,
      enableDemo: stageConfig.enableDemo,
      gameSessionSnapshotId: persistedSnapshot.gameSessionId,
      gameSessionStageConfigSnapshotId: persistedSnapshot.stageConfigSnapshotId,
      currentLevelIndex: 0,
      timeRemaining: stageConfig.gameTimeLimitSeconds,
      startTimeMs: startedAtMs,
      endTimeMs: startedAtMs + stageConfig.gameTimeLimitSeconds * 1000,
      matchedPairsByLevel: levels.map(() => []),
      processedMoveIdsByLevel: levels.map(() => []),
      pendingFlipsByLevel: levels.map(() => null),
      completedLevelIndices: [],
      completedAtMsByLevel: levels.map(() => null),
      levels: levels.map((level) => ({
        ...level,
        gameSessionLevelId:
          persistedSnapshot.levels.find(
            (persistedLevel) => persistedLevel.levelIndex === level.levelIndex,
          )?.gameSessionLevelId ?? "",
      })),
      moveHistory: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  buildStartGameResponse(session: ActiveGameSessionState): StartGameResponse {
    const activeLevel = session.levels[session.currentLevelIndex];
    if (!activeLevel) {
      throwTerminalError(
        ERROR_CODES.ACTIVE_STAGE_CONFIG_NOT_FOUND,
        "No playable levels were found for this stage",
        STATUS_CODES.CONFLICT,
      );
    }

    return {
      sessionId: session.sessionId,
      firstLevel: this.buildLevelDataResponse(activeLevel.data),
      ...this.buildTimingResponse(session),
    };
  }

  buildCurrentSessionResponse(
    session: ActiveGameSessionState,
    nowMs: number,
  ): CurrentSessionResponse {
    const currentLevel = session.levels[session.currentLevelIndex];
    if (!currentLevel) {
      throwTerminalError(
        ERROR_CODES.SESSION_NOT_FOUND,
        "The requested session is missing its active level",
        STATUS_CODES.NOT_FOUND,
      );
    }

    return {
      sessionId: session.sessionId,
      currentLevelIndex: session.currentLevelIndex,
      timeRemaining: this.getServerTimeRemainingSeconds(session, nowMs),
      currentLevel: this.buildLevelDataResponse(
        currentLevel.data,
        new Set(
          this.getMatchedPairIdsForLevel(session, session.currentLevelIndex),
        ),
      ),
      ...this.buildTimingResponse(session),
    };
  }

  buildNextLevelResponse(session: ActiveGameSessionState): NextLevelResponse {
    const nextLevel = session.levels[session.currentLevelIndex + 1];
    if (!nextLevel) {
      throwTerminalError(
        ERROR_CODES.NO_NEXT_LEVEL,
        "This is the last level",
        STATUS_CODES.NOT_FOUND,
      );
    }

    return {
      level: this.buildLevelDataResponse(nextLevel.data),
      ...this.buildTimingResponse(session),
    };
  }

  refreshSessionForNow(
    session: ActiveGameSessionState,
    nowMs: number,
  ): ActiveGameSessionState {
    const serverTimeRemaining = this.getServerTimeRemainingSeconds(
      session,
      nowMs,
    );
    if (serverTimeRemaining === session.timeRemaining) {
      return session;
    }

    return {
      ...session,
      timeRemaining: serverTimeRemaining,
      updatedAt: new Date(nowMs).toISOString(),
    };
  }

  applyProgress(
    session: ActiveGameSessionState,
    payload: SaveProgressDto,
    nowMs: number,
  ): { nextState: ActiveGameSessionState; response: SaveProgressResponse } {
    const levelIndex = session.currentLevelIndex;
    const currentLevel = session.levels[levelIndex];
    if (!currentLevel) {
      throwTerminalError(
        ERROR_CODES.SESSION_NOT_FOUND,
        "The requested session is missing its active level",
        STATUS_CODES.NOT_FOUND,
      );
    }

    const serverTimeRemaining = this.getServerTimeRemainingSeconds(
      session,
      nowMs,
    );
    const normalizedMoves = this.normalizeMovesForProgress(
      payload,
      session,
      levelIndex,
      nowMs,
    );
    const acceptedMoveIds = [
      ...(session.processedMoveIdsByLevel[levelIndex] ?? []),
    ];
    const mergedMatchedPairs = [
      ...(session.matchedPairsByLevel[levelIndex] ?? []),
    ];
    const matchedPairIds = new Set(
      mergedMatchedPairs.map((matchedPair) => matchedPair.pairId),
    );
    const cardById = new Map(
      currentLevel.data.cards.map((card) => [card.id, card] as const),
    );
    let pendingFlip = session.pendingFlipsByLevel[levelIndex];
    let nextMoveIndex = session.moveHistory.length;
    const newMoveRecords: SessionMoveRecord[] = [];

    for (const move of normalizedMoves) {
      const card = cardById.get(move.id);
      if (!card) {
        throwTerminalError(
          ERROR_CODES.INVALID_CARD_SUBMISSION,
          `Unknown card id submitted for level ${levelIndex}`,
          STATUS_CODES.BAD_REQUEST,
        );
      }

      let outcome: SessionMoveRecord["outcome"] = "IGNORED";
      let matchedPairId: string | null = null;

      if (matchedPairIds.has(card.pairId)) {
        outcome = "IGNORED";
      } else if (!pendingFlip) {
        pendingFlip = {
          clientMoveId: move.moveId,
          cardId: card.id,
          pairId: card.pairId,
          clickedAt: move.clickedAt,
          clickedAtMs: move.clickedAtMs,
        };
        outcome = "FIRST_FLIP";
      } else if (pendingFlip.cardId === card.id) {
        outcome = "IGNORED";
      } else if (pendingFlip.pairId === card.pairId) {
        matchedPairId = card.pairId;
        matchedPairIds.add(matchedPairId);
        mergedMatchedPairs.push({
          pairId: matchedPairId,
          timestamp: move.clickedAt,
          timestampMs: move.clickedAtMs,
        });
        pendingFlip = null;
        outcome = "MATCH";
      } else {
        pendingFlip = null;
        outcome = "MISMATCH";
      }

      acceptedMoveIds.push(move.moveId);
      newMoveRecords.push({
        moveIndex: nextMoveIndex++,
        levelIndex,
        clientMoveId: move.moveId,
        cardId: card.id,
        pairId: card.pairId,
        clickedAt: move.clickedAt,
        clickedAtMs: move.clickedAtMs,
        timeRemaining: serverTimeRemaining,
        outcome,
        matchedPairId,
      });
    }

    mergedMatchedPairs.sort((left, right) => {
      if (left.timestampMs !== right.timestampMs) {
        return left.timestampMs - right.timestampMs;
      }

      return left.pairId.localeCompare(right.pairId);
    });

    const matchedPairsByLevel = session.matchedPairsByLevel.map((entry) => [
      ...entry,
    ]);
    matchedPairsByLevel[levelIndex] = mergedMatchedPairs;
    const processedMoveIdsByLevel = session.processedMoveIdsByLevel.map(
      (entry) => [...entry],
    );
    processedMoveIdsByLevel[levelIndex] = acceptedMoveIds;
    const pendingFlipsByLevel = [...session.pendingFlipsByLevel];
    pendingFlipsByLevel[levelIndex] = pendingFlip;

    const nextState: ActiveGameSessionState = {
      ...session,
      timeRemaining: serverTimeRemaining,
      matchedPairsByLevel,
      processedMoveIdsByLevel,
      pendingFlipsByLevel,
      moveHistory: [...session.moveHistory, ...newMoveRecords],
      updatedAt: new Date(nowMs).toISOString(),
    };

    return {
      nextState,
      response: {
        accepted: normalizedMoves.length,
        startedAt: new Date(session.startTimeMs).toISOString(),
        expiryAt: new Date(session.endTimeMs).toISOString(),
      },
    };
  }

  async completeBoard(
    session: ActiveGameSessionState,
    nowMs: number,
  ): Promise<{
    nextState: ActiveGameSessionState;
    response: CompleteBoardResponse;
    clearSession: boolean;
  }> {
    const levelIndex = session.currentLevelIndex;
    const currentLevel = session.levels[levelIndex];
    if (!currentLevel) {
      throwTerminalError(
        ERROR_CODES.SESSION_NOT_FOUND,
        "The requested session is missing its active level",
        STATUS_CODES.NOT_FOUND,
      );
    }

    if (session.pendingFlipsByLevel[levelIndex]) {
      throwTerminalError(
        ERROR_CODES.LEVEL_NOT_READY_TO_END,
        "The current level still has an unresolved flip",
        STATUS_CODES.CONFLICT,
      );
    }

    const matchedPairIds = this.getMatchedPairIdsForLevel(session, levelIndex);
    const expectedPairIds = this.getExpectedPairIdsForLevel(currentLevel.data);

    if (
      matchedPairIds.length !== expectedPairIds.length ||
      !expectedPairIds.every((pairId) => matchedPairIds.includes(pairId))
    ) {
      await this.persistCheatFlags(session, levelIndex, [
        {
          flagType: CHEAT_FLAG_TYPE.REMAINING_PAIRS_AT_END,
          evidence: {
            levelIndex,
            matchedPairIds,
            expectedPairIds,
            missingPairIds: expectedPairIds.filter(
              (pairId) => !matchedPairIds.includes(pairId),
            ),
            submittedPairCount: matchedPairIds.length,
            expectedPairCount: expectedPairIds.length,
          },
        },
      ]);
      throwTerminalError(
        ERROR_CODES.LEVEL_NOT_COMPLETED,
        "The current board is not fully completed",
        STATUS_CODES.BAD_REQUEST,
      );
    }

    const nextLevelIndex = levelIndex + 1;
    const nextLevel = session.levels[nextLevelIndex];
    const completedLevelIndices = [...session.completedLevelIndices];
    if (!completedLevelIndices.includes(levelIndex)) {
      completedLevelIndices.push(levelIndex);
      completedLevelIndices.sort((left, right) => left - right);
    }
    const completedAtMsByLevel = [...session.completedAtMsByLevel];
    completedAtMsByLevel[levelIndex] = nowMs;

    if (!nextLevel) {
      const nextState: ActiveGameSessionState = {
        ...session,
        completedLevelIndices,
        completedAtMsByLevel,
        timeRemaining: this.getServerTimeRemainingSeconds(session, nowMs),
        updatedAt: new Date(nowMs).toISOString(),
      };

      await this.persistCheatFlags(
        nextState,
        levelIndex,
        this.detectLevelCompletionFlags(nextState, levelIndex),
      );

      const finalizedOutcome = this.buildFinalizationOutcome(nextState);
      await this.finalizePersistedGameSession(
        nextState,
        finalizedOutcome.result,
        finalizedOutcome.finalScore,
        finalizedOutcome.timeBonus,
        nowMs,
      );

      return {
        nextState,
        clearSession: true,
        response: {
          gameOver: true,
        },
      };
    }

    const nextState: ActiveGameSessionState = {
      ...session,
      currentLevelIndex: nextLevelIndex,
      completedLevelIndices,
      completedAtMsByLevel,
      timeRemaining: this.getServerTimeRemainingSeconds(session, nowMs),
      updatedAt: new Date(nowMs).toISOString(),
    };

    await this.persistCheatFlags(
      nextState,
      levelIndex,
      this.detectLevelCompletionFlags(nextState, levelIndex),
    );

    return {
      nextState,
      clearSession: false,
      response: {
        gameOver: false,
      },
    };
  }

  async finalizeGameOver(
    session: ActiveGameSessionState,
    finalizedAtMs: number,
  ): Promise<GameOverResponse> {
    const finalizedOutcome = this.buildFinalizationOutcome(session);

    await this.finalizePersistedGameSession(
      session,
      finalizedOutcome.result,
      finalizedOutcome.finalScore,
      finalizedOutcome.timeBonus,
      finalizedAtMs,
    );

    return this.buildGameOverResponse(session, finalizedOutcome.finalScore);
  }

  async finalizeExpiredGameOver(
    session: ActiveGameSessionState,
    finalizedAtMs: number,
  ): Promise<GameOverResponse> {
    const finalizedOutcome = this.buildFinalizationOutcome(session);

    await this.finalizePersistedGameSession(
      session,
      finalizedOutcome.result,
      finalizedOutcome.finalScore,
      finalizedOutcome.timeBonus,
      finalizedAtMs,
    );

    return this.buildGameOverResponse(session, finalizedOutcome.finalScore);
  }

  async getFinalizedGameOver(
    ownerKey: string,
    stageId: string,
  ): Promise<GameOverResponse | null> {
    const session = await this.prisma.gameSession.findFirst({
      where: {
        ownerKey,
        stageId,
        status: {
          in: ["won", "lost"],
        },
        finalScore: {
          not: null,
        },
      },
      select: {
        currentLevelIndex: true,
        finalScore: true,
        result: true,
        stageConfigSnapshot: {
          select: {
            levelCount: true,
          },
        },
      },
      orderBy: {
        endedAt: "desc",
      },
    });

    if (session?.finalScore === null || session?.finalScore === undefined) {
      return null;
    }

    return {
      finalScore: session.finalScore,
      roundsCompleted:
        session.result === "win"
          ? (session.stageConfigSnapshot?.levelCount ?? 0)
          : session.currentLevelIndex,
      totalRounds: session.stageConfigSnapshot?.levelCount ?? 0,
    };
  }

  getTimerState(session: ActiveGameSessionState) {
    return {
      startTimeMs: session.startTimeMs,
      endTimeMs: session.endTimeMs,
    };
  }

  async scheduleExpiry(session: ActiveGameSessionState): Promise<void> {
    await this.expiry.schedule(
      session.sessionId,
      session.endTimeMs,
      session.ownerKey,
      session.stageId,
      session.status,
    );
  }

  async fetchOpenSession(ownerKey: string, stageId: string) {
    return this.prisma.gameSession.findFirst({
      where: {
        ownerKey,
        stageId,
        status: {
          in: ["active", "result_processing"],
        },
      },
      select: { id: true, status: true },
    });
  }

  async fetchFinalizedStageSession(ownerKey: string, stageId: string) {
    return this.prisma.gameSession.findFirst({
      where: {
        ownerKey,
        stageId,
        status: {
          in: ["won", "lost"],
        },
      },
      select: {
        id: true,
        status: true,
        result: true,
        finalScore: true,
        startedAt: true,
        endedAt: true,
        updatedAt: true,
      },
      orderBy: {
        endedAt: "desc",
      },
    });
  }

  async expireOpenSessionWithoutRestateState(
    sessionId: string,
  ): Promise<boolean> {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
      select: { status: true },
    });
    if (!session) {
      return false;
    }

    if (!["active", "result_processing"].includes(session.status)) {
      return false;
    }

    await this.prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        status: "lost",
        result: "lose",
        finalScore: 0,
        timeRemainingSeconds: 0,
        endedAt: new Date(),
      },
    });

    return true;
  }

  private buildTimingResponse(session: ActiveGameSessionState) {
    return {
      startTime: new Date(session.startTimeMs).toISOString(),
      endTime: new Date(session.endTimeMs).toISOString(),
    };
  }

  private getExpectedPairIdsForLevel(level: LevelData): string[] {
    return [...new Set(level.cards.map((card) => card.pairId))];
  }

  private getMatchedPairIdsForLevel(
    session: ActiveGameSessionState,
    levelIndex: number,
  ): string[] {
    return (session.matchedPairsByLevel[levelIndex] ?? []).map(
      (matchedPair) => matchedPair.pairId,
    );
  }

  private getMatchedPairsForLevel(
    session: ActiveGameSessionState,
    levelIndex: number,
  ): MatchedPairProgressEntry[] {
    return (session.matchedPairsByLevel[levelIndex] ?? []).map(
      (matchedPair) => ({
        pairId: matchedPair.pairId,
        timestamp: matchedPair.timestamp,
      }),
    );
  }

  private buildLevelDataResponse(
    levelData: LevelData,
    turnedPairIds: Set<string> = new Set(),
  ): LevelData {
    return {
      ...levelData,
      cards: levelData.cards.map((card) => ({
        ...card,
        isTurned: turnedPairIds.has(card.pairId),
      })),
    };
  }

  private getServerTimeRemainingSeconds(
    session: ActiveGameSessionState,
    nowMs: number,
  ): number {
    return Math.max(0, Math.ceil((session.endTimeMs - nowMs) / 1000));
  }

  private async fetchReusableActiveSession(
    ownerKey: string,
    stageConfig: ResolvedStageConfig,
  ): Promise<ActiveGameSessionState | null> {
    const session = await this.prisma.gameSession.findFirst({
      where: {
        ownerKey,
        stageId: stageConfig.stageId,
        status: "active",
      },
      select: {
        id: true,
        ownerKey: true,
        stageId: true,
        status: true,
        startedAt: true,
        createdAt: true,
        updatedAt: true,
        stageConfigSnapshot: {
          select: {
            id: true,
            gameTimeLimitSeconds: true,
            levels: {
              orderBy: {
                levelIndex: "asc",
              },
              select: {
                id: true,
                sourceLevelId: true,
                levelIndex: true,
                gridRows: true,
                gridColumns: true,
                cardContentType: true,
                previewDurationSeconds: true,
                mismatchDisplayDurationSeconds: true,
                cards: {
                  orderBy: {
                    sortOrder: "asc",
                  },
                  select: {
                    cardId: true,
                    pairId: true,
                    contentType: true,
                    content: true,
                    imageUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!session) {
      return null;
    }

    return this.buildSessionStateFromPersistedSession(session, stageConfig);
  }

  private buildSessionStateFromPersistedSession(
    session: ExistingPersistedGameSession,
    stageConfig: ResolvedStageConfig,
  ): ActiveGameSessionState {
    if (!session.stageConfigSnapshot) {
      throwTerminalError(
        ERROR_CODES.GAME_SESSION_RECOVERY_REQUIRED,
        "An open game session exists but its snapshot is unavailable",
        STATUS_CODES.CONFLICT,
      );
    }

    const startTimeMs = session.startedAt.getTime();
    const timeLimitSeconds = session.stageConfigSnapshot.gameTimeLimitSeconds;
    const levels = session.stageConfigSnapshot.levels.map((level) => ({
      gameSessionLevelId: level.id,
      levelIndex: level.levelIndex,
      sourceLevelId: level.sourceLevelId,
      data: {
        id: level.sourceLevelId,
        levelIndex: level.levelIndex,
        gridRows: level.gridRows,
        gridColumns: level.gridColumns,
        cardContentType: level.cardContentType as CardContentType,
        previewDurationSeconds: level.previewDurationSeconds,
        mismatchDisplayDurationSeconds: level.mismatchDisplayDurationSeconds,
        cards: level.cards.map((card) => ({
          id: card.cardId,
          pairId: card.pairId,
          contentType: card.contentType as CardContentType,
          content: card.content,
          imageUrl: card.imageUrl,
          isTurned: false,
        })),
      },
    }));

    return {
      sessionId: session.id,
      ownerKey: session.ownerKey,
      stageId: session.stageId,
      status: session.status,
      gameTimeLimitSeconds: timeLimitSeconds,
      enableDemo: stageConfig.enableDemo,
      gameSessionSnapshotId: session.id,
      gameSessionStageConfigSnapshotId: session.stageConfigSnapshot.id,
      currentLevelIndex: 0,
      timeRemaining: timeLimitSeconds,
      startTimeMs,
      endTimeMs: startTimeMs + timeLimitSeconds * 1000,
      matchedPairsByLevel: levels.map(() => []),
      processedMoveIdsByLevel: levels.map(() => []),
      pendingFlipsByLevel: levels.map(() => null),
      completedLevelIndices: [],
      completedAtMsByLevel: levels.map(() => null),
      levels,
      moveHistory: [],
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Error &&
      "code" in error &&
      (error as { code: unknown }).code === "P2002"
    );
  }

  private isGameCompleted(session: ActiveGameSessionState): boolean {
    return session.completedLevelIndices.length === session.levels.length;
  }

  private async persistSessionSnapshot(
    ownerKey: string,
    stageConfig: ResolvedStageConfig,
    levels: SessionLevelSnapshot[],
    startedAtMs: number,
  ): Promise<PersistedGameSessionSnapshot> {
    const createdSession = await this.prisma.gameSession.create({
      data: {
        ownerKey,
        stageId: stageConfig.stageId,
        status: "active",
        timeLimitSeconds: stageConfig.gameTimeLimitSeconds,
        timeRemainingSeconds: stageConfig.gameTimeLimitSeconds,
        currentLevelIndex: 0,
        startedAt: new Date(startedAtMs),
        stageConfigSnapshot: {
          create: {
            sourceStageConfigId: stageConfig.id,
            stageId: stageConfig.stageId,
            gameTimeLimitSeconds: stageConfig.gameTimeLimitSeconds,
            levelCount: stageConfig.levels.length,
            levels: {
              create: levels.map((level) => ({
                sourceLevelId: level.sourceLevelId,
                levelIndex: level.levelIndex,
                name: `Level ${level.levelIndex + 1}`,
                gridRows: level.data.gridRows,
                gridColumns: level.data.gridColumns,
                cardContentType: level.data.cardContentType,
                previewDurationSeconds: level.data.previewDurationSeconds,
                mismatchDisplayDurationSeconds:
                  level.data.mismatchDisplayDurationSeconds,
                contentConfigSnapshot: this.buildContentSnapshot(level.data),
                cards: {
                  create: level.data.cards.map((card, cardIndex) => ({
                    cardId: card.id,
                    pairId: card.pairId,
                    sortOrder: cardIndex,
                    contentType: card.contentType,
                    content: card.content,
                    imageUrl: card.imageUrl,
                    levelIndex: level.levelIndex,
                  })),
                },
              })),
            },
          },
        },
      },
      select: {
        id: true,
      },
    });

    const stageConfigSnapshot =
      await this.prisma.gameSessionStageConfigSnapshot.findUniqueOrThrow({
        where: { gameSessionId: createdSession.id },
        select: {
          id: true,
          levels: {
            select: {
              id: true,
              levelIndex: true,
              sourceLevelId: true,
            },
            orderBy: {
              levelIndex: "asc",
            },
          },
        },
      });

    return {
      gameSessionId: createdSession.id,
      stageConfigSnapshotId: stageConfigSnapshot.id,
      levels: stageConfigSnapshot.levels.map((level) => ({
        gameSessionLevelId: level.id,
        levelIndex: level.levelIndex,
        sourceLevelId: level.sourceLevelId,
      })),
    };
  }

  private async finalizePersistedGameSession(
    session: ActiveGameSessionState,
    result: FinalizedGameResult,
    finalScore: number,
    timeRemaining: number,
    finalizedAtMs: number,
  ): Promise<void> {
    await this.prisma.$transaction(async (transactionClient) => {
      const existingSession = await transactionClient.gameSession.findUnique({
        where: { id: session.gameSessionSnapshotId },
        select: {
          status: true,
        },
      });

      if (
        existingSession &&
        !["active", "result_processing"].includes(existingSession.status)
      ) {
        return;
      }

      await transactionClient.gameSession.update({
        where: { id: session.gameSessionSnapshotId },
        data: {
          status: result === "win" ? "won" : "lost",
          result,
          finalScore,
          timeRemainingSeconds: timeRemaining,
          currentLevelIndex: session.currentLevelIndex,
          endedAt: new Date(finalizedAtMs),
        },
      });

      if (session.moveHistory.length > 0) {
        await transactionClient.gameMove.createMany({
          data: session.moveHistory
            .filter((move) => move.matchedPairId !== null)
            .map((move) => ({
              gameSessionId: session.gameSessionSnapshotId,
              gameSessionLevelId:
                session.levels[move.levelIndex]?.gameSessionLevelId ?? "",
              levelIndex: move.levelIndex,
              moveIndex: move.moveIndex,
              pairId: move.matchedPairId ?? move.pairId,
              timeRemaining: move.timeRemaining,
            })),
          skipDuplicates: true,
        });
      }
    });
  }

  private countCompletedLevels(session: ActiveGameSessionState): number {
    return session.completedLevelIndices.length;
  }

  private buildGameOverResponse(
    session: ActiveGameSessionState,
    finalScore: number,
  ): GameOverResponse {
    return {
      finalScore,
      roundsCompleted: this.countCompletedLevels(session),
      totalRounds: session.levels.length,
    };
  }

  private buildFinalizationOutcome(session: ActiveGameSessionState): {
    result: FinalizedGameResult;
    finalScore: number;
    timeBonus: number;
  } {
    const completedLevels = this.countCompletedLevels(session);
    const allLevelsCompleted = completedLevels === session.levels.length;
    const result: FinalizedGameResult = allLevelsCompleted ? "win" : "lose";
    const timeBonus = allLevelsCompleted
      ? this.getCompletionTimeBonusSeconds(session)
      : 0;

    return {
      result,
      finalScore: completedLevels * 100 + timeBonus,
      timeBonus,
    };
  }

  private getCompletionTimeBonusSeconds(
    session: ActiveGameSessionState,
  ): number {
    if (!this.isGameCompleted(session)) {
      return 0;
    }

    const lastCompletedAtMs = session.completedAtMsByLevel.reduce<
      number | null
    >((latestCompletedAtMs, completedAtMs) => {
      if (completedAtMs === null) {
        return latestCompletedAtMs;
      }
      if (latestCompletedAtMs === null || completedAtMs > latestCompletedAtMs) {
        return completedAtMs;
      }

      return latestCompletedAtMs;
    }, null);

    if (lastCompletedAtMs === null) {
      return 0;
    }

    return this.getServerTimeRemainingSeconds(session, lastCompletedAtMs);
  }

  private detectLevelCompletionFlags(
    session: ActiveGameSessionState,
    levelIndex: number,
  ): Array<{ flagType: number; evidence: Prisma.InputJsonValue }> {
    const level = session.levels[levelIndex];
    if (!level) {
      return [];
    }

    const flags: Array<{ flagType: number; evidence: Prisma.InputJsonValue }> =
      [...this.detectMoveTimingFlags(session, levelIndex)];

    const completedAtMs = session.completedAtMsByLevel[levelIndex];
    if (completedAtMs !== null) {
      const pairCount = this.getExpectedPairIdsForLevel(level.data).length;
      const previewMs = level.data.previewDurationSeconds * 1000;
      const durationMs =
        completedAtMs - this.getLevelStartTimeMs(session, levelIndex);
      const thresholdMs =
        previewMs + pairCount * ANTI_CHEAT_CONFIGS.IMPOSSIBLE_SOLVE_MS_PER_PAIR;

      if (durationMs < thresholdMs) {
        flags.push({
          flagType: CHEAT_FLAG_TYPE.IMPOSSIBLE_SOLVE_TIME,
          evidence: {
            levelIndex,
            durationMs,
            thresholdMs,
            pairCount,
            previewMs,
            previewDurationSeconds: level.data.previewDurationSeconds,
          },
        });
      }
    }

    return flags;
  }

  private detectMoveTimingFlags(
    session: ActiveGameSessionState,
    levelIndex: number,
  ): Array<{ flagType: number; evidence: Prisma.InputJsonValue }> {
    const levelMoves = session.moveHistory
      .filter((move) => move.levelIndex === levelIndex)
      .sort((left, right) => left.moveIndex - right.moveIndex);
    const flags: Array<{ flagType: number; evidence: Prisma.InputJsonValue }> =
      [];

    if (levelMoves.length < 2) {
      return flags;
    }

    const intervals = levelMoves.slice(1).map((move, index) => ({
      fromMoveId: levelMoves[index]?.clientMoveId ?? null,
      toMoveId: move.clientMoveId,
      fromCardId: levelMoves[index]?.cardId ?? null,
      toCardId: move.cardId,
      from: levelMoves[index]?.clickedAt ?? null,
      to: move.clickedAt,
      ms: move.clickedAtMs - levelMoves[index].clickedAtMs,
    }));

    const tooFast = intervals.filter(
      (interval) => interval.ms < ANTI_CHEAT_CONFIGS.CLICK_TOO_FAST_MS,
    );
    if (tooFast.length > 0) {
      flags.push({
        flagType: CHEAT_FLAG_TYPE.CLICK_TOO_FAST,
        evidence: {
          levelIndex,
          thresholdMs: ANTI_CHEAT_CONFIGS.CLICK_TOO_FAST_MS,
          violations: tooFast,
        },
      });
    }

    if (intervals.length >= ANTI_CHEAT_CONFIGS.UNIFORM_TIMING_MIN_INTERVALS) {
      const values = intervals.map((interval) => interval.ms);
      const mean =
        values.reduce((sum, value) => sum + value, 0) / values.length;
      const stddev = Math.sqrt(
        values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
          values.length,
      );
      const cv = mean > 0 ? stddev / mean : 0;

      if (cv < ANTI_CHEAT_CONFIGS.UNIFORM_TIMING_CV_THRESHOLD) {
        flags.push({
          flagType: CHEAT_FLAG_TYPE.UNIFORM_TIMING,
          evidence: {
            levelIndex,
            intervals,
            mean: Math.round(mean),
            stddev: Math.round(stddev),
            cv: +cv.toFixed(4),
          },
        });
      }
    }

    return flags;
  }

  private getLevelStartTimeMs(
    session: ActiveGameSessionState,
    levelIndex: number,
  ): number {
    if (levelIndex <= 0) {
      return session.startTimeMs;
    }

    return session.completedAtMsByLevel[levelIndex - 1] ?? session.startTimeMs;
  }

  private async persistCheatFlags(
    session: ActiveGameSessionState,
    levelIndex: number,
    flags: Array<{ flagType: number; evidence: Prisma.InputJsonValue }>,
  ): Promise<void> {
    if (flags.length === 0) {
      return;
    }

    const level = session.levels[levelIndex];
    if (!level?.gameSessionLevelId) {
      this.logger.warn(
        `Skipping cheat flag persistence for session ${session.sessionId} level ${levelIndex}: missing persisted level id`,
      );
      return;
    }

    try {
      const createdFlags = await this.prisma.cheatFlag.createManyAndReturn({
        data: flags.map((flag) => ({
          gameSessionId: session.gameSessionSnapshotId,
          gameSessionLevelId: level.gameSessionLevelId,
          levelIndex,
          flagType: flag.flagType,
          evidence: flag.evidence,
        })),
        skipDuplicates: true,
        select: {
          id: true,
          flagType: true,
          createdAt: true,
        },
      });

      await Promise.all(
        createdFlags.map((flag) =>
          this.sns.publishCheatFlag({
            referenceId: flag.id,
            userId: session.ownerKey,
            gameType: config.gameType,
            flagType: flag.flagType,
            createdAt: flag.createdAt.toISOString(),
          }),
        ),
      );
    } catch (error) {
      this.logger.error(
        `Failed to persist cheat flags for session ${session.sessionId} level ${levelIndex}: ${(error as Error).message}`,
      );
    }
  }

  private normalizeMovesForProgress(
    payload: SaveProgressDto,
    session: ActiveGameSessionState,
    levelIndex: number,
    nowMs: number,
  ): Array<{
    id: string;
    clickedAt: string;
    clickedAtMs: number;
    moveId: string;
  }> {
    const seenInBatch = new Set<string>();
    const existingIds = new Set(
      session.processedMoveIdsByLevel[levelIndex] ?? [],
    );
    const lastMoveTimestampMs = this.getLastMoveTimestampMs(
      session,
      levelIndex,
    );
    const normalizedMoves = payload.moves
      .filter((move) => {
        if (seenInBatch.has(move.moveId) || existingIds.has(move.moveId)) {
          return false;
        }

        seenInBatch.add(move.moveId);
        return true;
      })
      .map((move) => {
        const clickedAtMs = Date.parse(move.clickedAt);
        if (Number.isNaN(clickedAtMs)) {
          throwTerminalError(
            ERROR_CODES.INVALID_CARD_SUBMISSION,
            `Invalid clickedAt submitted for card ${move.id}`,
            STATUS_CODES.BAD_REQUEST,
          );
        }

        if (
          clickedAtMs >
          nowMs + GAME_CONFIGS.ACTION_TIMESTAMP_FUTURE_SKEW_MS
        ) {
          throwTerminalError(
            ERROR_CODES.FLIP_TIMESTAMP_IN_FUTURE,
            "Move timestamp is too far in the future",
            STATUS_CODES.BAD_REQUEST,
          );
        }

        if (
          clickedAtMs < session.startTimeMs ||
          clickedAtMs > session.endTimeMs
        ) {
          throwTerminalError(
            ERROR_CODES.INVALID_CARD_SUBMISSION,
            `Timestamp for card ${move.id} falls outside the session window`,
            STATUS_CODES.BAD_REQUEST,
          );
        }

        return {
          id: move.id,
          clickedAt: move.clickedAt,
          clickedAtMs,
          moveId: move.moveId,
        };
      })
      .sort((left, right) => left.clickedAtMs - right.clickedAtMs)
      .filter((move) => move.clickedAtMs >= lastMoveTimestampMs);

    return normalizedMoves;
  }

  private getLastMoveTimestampMs(
    session: ActiveGameSessionState,
    levelIndex: number,
  ): number {
    for (let index = session.moveHistory.length - 1; index >= 0; index -= 1) {
      const move = session.moveHistory[index];
      if (move?.levelIndex === levelIndex) {
        return move.clickedAtMs;
      }
    }

    return session.startTimeMs;
  }

  private buildLevelSnapshot(
    level: Level,
    levelIndex: number,
  ): SessionLevelSnapshot {
    return {
      gameSessionLevelId: "",
      levelIndex,
      sourceLevelId: level.id,
      data: this.buildLevelDataFromSourceLevel(level, levelIndex),
    };
  }

  /**
   * Build a client-facing level payload directly from a source level row.
   *
   * @param {Level} level - persisted level value.
   * @param {number} levelIndex - zero-based level index value.
   *
   * @returns {LevelData} The formatted level payload.
   */
  buildLevelDataFromSourceLevel(level: Level, levelIndex: number): LevelData {
    return {
      id: level.id,
      levelIndex,
      gridRows: level.gridRows,
      gridColumns: level.gridColumns,
      cardContentType: level.cardContentType as CardContentType,
      previewDurationSeconds: level.previewDurationSeconds,
      mismatchDisplayDurationSeconds: level.mismatchDisplayDurationSeconds,
      cards: this.buildCardsForLevel(level),
    };
  }

  private buildContentSnapshot(levelData: LevelData): Prisma.InputJsonValue {
    return {
      id: levelData.id,
      levelIndex: levelData.levelIndex,
      gridRows: levelData.gridRows,
      gridColumns: levelData.gridColumns,
      cardContentType: levelData.cardContentType,
      previewDurationSeconds: levelData.previewDurationSeconds,
      mismatchDisplayDurationSeconds: levelData.mismatchDisplayDurationSeconds,
    };
  }

  private buildCardsForLevel(level: Level): LevelCard[] {
    const contentConfig = level.contentConfig as
      | { type: "symbol"; items: string[] }
      | { type: "image"; assetKeys: string[] }
      | { type: "color"; items: string[] }
      | { type: "wordImage"; items: Array<{ word: string; imageKey: string }> };

    if (contentConfig.type === "symbol" || contentConfig.type === "color") {
      return this.shuffle(
        contentConfig.items.flatMap((item, index) =>
          this.createSymmetricPair(
            index,
            level.cardContentType as CardContentType,
            item,
            null,
          ),
        ),
      );
    }

    if (contentConfig.type === "image") {
      return this.shuffle(
        contentConfig.assetKeys.flatMap((assetKey, index) =>
          this.createSymmetricPair(
            index,
            level.cardContentType as CardContentType,
            "",
            assetKey,
          ),
        ),
      );
    }

    return this.shuffle(
      contentConfig.items.flatMap((item, index) => {
        const pairId = `pair-${index}`;

        return [
          {
            id: `${pairId}-a`,
            pairId,
            contentType: "wordImage" as const,
            content: item.word,
            imageUrl: null,
            isTurned: false,
          },
          {
            id: `${pairId}-b`,
            pairId,
            contentType: "wordImage" as const,
            content: "",
            imageUrl: item.imageKey,
            isTurned: false,
          },
        ];
      }),
    );
  }

  private createSymmetricPair(
    pairIndex: number,
    contentType: CardContentType,
    content: string,
    imageUrl: string | null,
  ): LevelCard[] {
    const pairId = `pair-${pairIndex}`;

    return [
      {
        id: `${pairId}-a`,
        pairId,
        contentType,
        content,
        imageUrl,
        isTurned: false,
      },
      {
        id: `${pairId}-b`,
        pairId,
        contentType,
        content,
        imageUrl,
        isTurned: false,
      },
    ];
  }

  private shuffle<T>(items: T[]): T[] {
    const copy = [...items];

    for (let index = copy.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
    }

    return copy;
  }
}
