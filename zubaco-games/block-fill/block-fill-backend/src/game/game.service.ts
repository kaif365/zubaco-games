import { randomUUID } from 'node:crypto';

import {
    ANTI_CHEAT_CONFIGS,
    CHEAT_FLAG_TYPE,
    GAME_SESSION_STATUS,
    GAME_TYPES,
} from '@common/constants';
import { PrismaService } from '@common/prisma/prisma.service';
import { transactionContext } from '@common/prisma/transaction.context';
import {
    BlockFillBoardShape,
    colorCodeToStorageValue,
    extractPairsFromBoardShape,
    normalizeColorCode,
    storageValueToColorCode,
    toBoardShape,
} from '@common/utils/block-fill-board.util';
import { config } from '@config';
import {
    BadRequestException,
    ConflictException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma';

import { SnsService } from '../aws/sns.service';

import { GameExpiryService } from './game-expiry.service';
import {
    InFlightBoardState,
    InFlightSavedPath,
    InFlightSessionState,
    InFlightSubmissionEvent,
} from './game-restate-state.types';
import {
    BlockFillPairInput,
    BlockFillSavedPath,
    GridPoint,
    clonePoint,
} from './utils/block-fill-helpers';
import {
    validateBlockFillSnapshot,
    validateCompletedBlockFillSolution,
} from './utils/block-fill-validator';
import { formatBlockFillBoard } from './utils/board-formatter';

export interface CompleteBoardResponse {
    sessionId: string;
    stageId: string;
    status: 'ACTIVE' | 'COMPLETED';
    completedRounds: number;
    currentLevelId: string | null;
    totalDemoRounds: number;
    totalActualRounds: number;
    currentDemoRound?: number;
    currentActualRound?: number;
    isDemoRound: boolean;
    isActualRound: boolean;
    board: ReturnType<typeof formatBlockFillBoard> | null;
    startTime?: string;
    endTime?: string;
    finalScore?: number;
}

export interface SessionBoardResponse {
    sessionId: string;
    stageId: string;
    status: 'ACTIVE' | 'COMPLETED';
    previewOnly?: boolean;
    activeSessionBoardId?: string | null;
    completedRounds: number;
    currentLevelId: string | null;
    totalDemoRounds: number;
    totalActualRounds: number;
    currentDemoRound?: number;
    currentActualRound?: number;
    requestedDemoRound?: number;
    requestedActualRound?: number;
    isDemoRound: boolean;
    isActualRound: boolean;
    startTime?: string;
    endTime?: string;
    board: ReturnType<typeof formatBlockFillBoard> | null;
    finalScore?: number;
}

export interface SessionGameConfigResponse {
    stageId: string;
    timeLimit: number;
    enableDemo: boolean;
    totalActualRounds: number;
    totalDemoRounds: number;
    levels: Array<{
        levelId: string;
        boardCount: number;
    }>;
}

export interface SessionTimerState {
    startTimeMs: number | null;
    endTimeMs: number | null;
}

export interface EndGameResponse {
    finalScore: number;
    roundsCompleted: number;
    totalRounds: number;
}

const GAME_END_BASE_SCORE = 20;
const LEVEL_SCORE_WEIGHTS: Record<string, number> = {
    easy: 20,
    medium: 30,
    hard: 40,
};

interface NextBoardInput {
    sessionId: string;
    requestedDemoRound?: number;
    requestedActualRound?: number;
}

interface SaveSnapshotInput {
    sessionId: string;
    board: {
        sessionBoardId?: string;
        paths: Array<{
            moveId: string;
            timeStamp: string;
            color: string;
            path: Array<{ row: number; col: number }>;
        }>;
    };
}

interface SessionContext {
    session: {
        id: string;
        status: number;
        score: number | null;
        completedRounds: number;
        currentLevelId: string | null;
        requestedDemoRound: number | null;
        requestedActualRound: number | null;
        requestedLevelId: string | null;
        gameStartedAt: Date | null;
        gameEndedAt: Date | null;
    };
    stageId: string;
    stageTimeLimit: number;
    enableDemo: boolean;
    totalDemoRounds: number;
    sessionBoardCount: number;
    totalActualRounds: number;
    activeSessionBoardId: string | null;
    sessionBoardRounds: number[];
    sessionBoards: Array<{
        id: string;
        levelId: string;
        roundNumber: number;
        completed: boolean;
    }>;
    sessionBoard: {
        id: string;
        boardId: string;
        levelId: string;
        roundNumber: number;
        version: number;
        completed: boolean;
        gridX: number;
        gridY: number;
        timeLimit: number;
        gameType: string;
    };
    board: {
        id: string;
        levelId: string;
        levelName: string | null;
        name: string | null;
        gridX: number;
        gridY: number;
        pairs: unknown;
    };
    boardShape: BlockFillBoardShape;
    pairs: BlockFillPairInput[];
}

type StageConfigWithBoards = Prisma.StageConfigGetPayload<{
    include: {
        levels: {
            include: {
                level: true;
            };
        };
        demoLevels: {
            include: {
                level: true;
            };
        };
    };
}>;

type BoardSequenceEntry = {
    boardId: string;
    levelId: string;
    levelName: string | null;
    name: string | null;
    roundNumber: number;
    gridX: number;
    gridY: number;
    timeLimit: number;
    pairs: unknown;
};

type StoredGridPoint = {
    x: number;
    y: number;
};

function isStoredGridPoint(value: unknown): value is StoredGridPoint {
    const point = value as Record<string, unknown> | null;
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof point?.x === 'number' &&
        typeof point.y === 'number'
    );
}

@Injectable()
export class GameService {
    private readonly logger = new Logger(GameService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly expiry: GameExpiryService,
        private readonly sns: SnsService,
    ) {}

    /**
     * Schedules session expiry through the expiry service.
     * @param {string} sessionId - The session identifier.
     * @param {number} expiryAtMs - The absolute expiry timestamp in milliseconds.
     * @param {string} userId - The authenticated user identifier.
     * @param {string} stageId - The stage identifier.
     * @param {number} [currentStatus] - The expected current session status.
     * @returns {Promise<void>} A promise that resolves when the expiry is scheduled.
     */
    async scheduleExpiry(
        sessionId: string,
        expiryAtMs: number,
        userId: string,
        stageId: string,
        currentStatus: number = GAME_SESSION_STATUS.ACTIVE,
    ): Promise<void> {
        await this.expiry.schedule(sessionId, expiryAtMs, userId, stageId, currentStatus);
    }

    /**
     * Resolves the stage routing information for a session.
     * @param {string} sessionId - The session identifier.
     * @param {string} userId - The authenticated user identifier.
     * @returns {Promise<{ sessionId: string; stageId: string; status: number }>} The routing information for the session.
     */
    async resolveSessionRoutingInfo(
        sessionId: string,
        userId: string,
    ): Promise<{
        sessionId: string;
        stageId: string;
        status: number;
    }> {
        const session = await this.prisma.gameSession.findFirst({
            where: { id: sessionId, userId, deletedAt: null },
            select: {
                id: true,
                status: true,
                stageConfig: {
                    select: {
                        stageConfig: {
                            select: {
                                stageId: true,
                            },
                        },
                    },
                },
            },
        });

        if (!session?.stageConfig?.stageConfig.stageId) {
            throw new NotFoundException('GAME_SESSION_NOT_FOUND');
        }

        return {
            sessionId: session.id,
            stageId: session.stageConfig.stageConfig.stageId,
            status: session.status,
        };
    }

    /**
     * Fetches the latest finalized session for a user and stage.
     * @param {string} userId - The authenticated user identifier.
     * @param {string} stageId - The stage identifier.
     * @returns {Promise<{ sessionId: string; } | null>} The finalized session reference or null when none exists.
     */
    async fetchFinalizedSession(
        userId: string,
        stageId: string,
    ): Promise<{
        sessionId: string;
    } | null> {
        const session = await this.prisma.gameSession.findFirst({
            where: {
                userId,
                deletedAt: null,
                status: {
                    in: [
                        GAME_SESSION_STATUS.COMPLETED,
                        GAME_SESSION_STATUS.EXPIRED,
                        GAME_SESSION_STATUS.MANUALLY_ENDED,
                    ],
                },
                stageConfig: {
                    stageConfig: {
                        stageId,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
            },
        });

        if (!session) {
            return null;
        }

        return {
            sessionId: session.id,
        };
    }

    /**
     * Fetches the latest open session for a user and stage.
     * @param {string} userId - The authenticated user identifier.
     * @param {string} stageId - The stage identifier.
     * @returns {Promise<{ sessionId: string; status: number; } | null>} The open session reference or null when none exists.
     */
    async fetchOpenSession(
        userId: string,
        stageId: string,
    ): Promise<{
        sessionId: string;
        status: number;
    } | null> {
        const session = await this.prisma.gameSession.findFirst({
            where: {
                userId,
                deletedAt: null,
                status: {
                    in: [GAME_SESSION_STATUS.ACTIVE, GAME_SESSION_STATUS.RESULT_PROCESSING],
                },
                stageConfig: {
                    stageConfig: {
                        stageId,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                status: true,
            },
        });

        if (!session) {
            return null;
        }

        return {
            sessionId: session.id,
            status: session.status,
        };
    }

    /**
     * Fetches the stage game configuration used to build a playable session.
     * @param {string} stageId - The stage identifier.
     * @returns {Promise<SessionGameConfigResponse>} The stage game configuration.
     */
    async getGameConfig(stageId: string): Promise<SessionGameConfigResponse> {
        const stageConfig = await this.prisma.stageConfig.findFirst({
            where: {
                deletedAt: null,
                stageId,
            },
            select: {
                stageId: true,
                timeLimit: true,
                enableDemo: true,
                totalActualRounds: true,
                totalDemoRounds: true,
                levels: {
                    where: { deletedAt: null },
                    orderBy: { order: 'asc' },
                    select: {
                        levelId: true,
                        boardCount: true,
                    },
                },
            },
        });

        if (!stageConfig) {
            throw new NotFoundException('STAGE_CONFIG_NOT_FOUND');
        }

        return {
            ...stageConfig,
            totalDemoRounds: 0,
        };
    }

    /**
     * Creates the in-memory session and board state used by the Restate workflow.
     * @param {string} userId - The authenticated user identifier.
     * @param {string} stageId - The stage identifier.
     * @returns {Promise<{ session: InFlightSessionState; boards: InFlightBoardState[]; response: SessionBoardResponse; }>} The initialized in-flight state and first response.
     */
    async createInFlightSession(
        userId: string,
        stageId: string,
    ): Promise<{
        session: InFlightSessionState;
        boards: InFlightBoardState[];
        response: SessionBoardResponse;
    }> {
        const stageConfig = await this.prisma.stageConfig.findFirst({
            where: { stageId, deletedAt: null },
            include: {
                levels: {
                    where: { deletedAt: null },
                    include: { level: true },
                    orderBy: { order: 'asc' },
                },
                demoLevels: {
                    where: { deletedAt: null },
                    include: { level: true },
                    orderBy: { order: 'asc' },
                },
            },
        });

        if (!stageConfig) {
            throw new NotFoundException('STAGE_CONFIG_NOT_FOUND');
        }

        if (stageConfig.levels.length === 0) {
            throw new BadRequestException('STAGE_CONFIG_HAS_NO_LEVELS');
        }

        const sequence = await this.buildBoardSequence(userId, stageConfig);
        const effectiveEnableDemo = false;
        const effectiveTotalDemoRounds = 0;
        const isActualStart = true;
        const nowMs = Date.now();
        let session: {
            id: string;
            status: number;
            score: number | null;
            completedRounds: number;
            currentRoundNumber: number;
            currentLevelId: string | null;
            requestedDemoRound: number | null;
            requestedActualRound: number | null;
            requestedLevelId: string | null;
            gameStartedAt: Date | null;
            gameEndedAt: Date | null;
        };
        try {
            session = await this.prisma.gameSession.create({
                data: {
                    userId,
                    stageId,
                    status: GAME_SESSION_STATUS.ACTIVE,
                    score: 0,
                    completedRounds: 0,
                    currentRoundNumber: 1,
                    currentLevelId: sequence[0]?.levelId ?? null,
                    ...this.getRoundProgressUpdate(1, effectiveTotalDemoRounds),
                    ...(isActualStart
                        ? {
                              gameStartedAt: new Date(nowMs),
                              gameEndedAt: new Date(nowMs + stageConfig.timeLimit * 1000),
                          }
                        : {}),
                },
                select: {
                    id: true,
                    status: true,
                    score: true,
                    completedRounds: true,
                    currentRoundNumber: true,
                    currentLevelId: true,
                    requestedDemoRound: true,
                    requestedActualRound: true,
                    requestedLevelId: true,
                    gameStartedAt: true,
                    gameEndedAt: true,
                },
            });
        } catch (error) {
            if (this.isUniqueConstraintError(error)) {
                const existing = await this.prisma.gameSession.findFirst({
                    where: {
                        userId,
                        stageId,
                        deletedAt: null,
                        status: {
                            in: [GAME_SESSION_STATUS.ACTIVE, GAME_SESSION_STATUS.RESULT_PROCESSING],
                        },
                    },
                    select: {
                        id: true,
                        status: true,
                        score: true,
                        completedRounds: true,
                        currentRoundNumber: true,
                        currentLevelId: true,
                        requestedDemoRound: true,
                        requestedActualRound: true,
                        requestedLevelId: true,
                        gameStartedAt: true,
                        gameEndedAt: true,
                    },
                });

                if (existing) {
                    this.logger.warn(
                        `[${userId}] createInFlightSession retry reused ${existing.id}`,
                    );
                    session = existing;
                } else {
                    throw error;
                }
            } else {
                throw error;
            }
        }

        await this.prisma.gameSessionStageConfig.upsert({
            where: {
                sessionId: session.id,
            },
            update: {
                timeLimit: stageConfig.timeLimit,
                enableDemo: effectiveEnableDemo,
                totalDemoRounds: effectiveTotalDemoRounds,
            },
            create: {
                sessionId: session.id,
                stageConfigId: stageConfig.id,
                timeLimit: stageConfig.timeLimit,
                enableDemo: effectiveEnableDemo,
                totalDemoRounds: effectiveTotalDemoRounds,
            },
        });

        const boards = sequence.map((entry) => {
            const boardShape = toBoardShape({
                name: entry.name,
                gridX: entry.gridX,
                gridY: entry.gridY,
                rawPairs: entry.pairs,
            });
            const pairs = extractPairsFromBoardShape(boardShape);

            return {
                sessionBoardId: randomUUID(),
                boardId: entry.boardId,
                levelId: entry.levelId,
                levelName: entry.levelName,
                name: boardShape.name,
                roundNumber: entry.roundNumber,
                startedAtMs: entry.roundNumber === 1 ? nowMs : null,
                gridX: entry.gridX,
                gridY: entry.gridY,
                timeLimit: entry.timeLimit,
                boardShape,
                pairs,
                version: 0,
                completed: false,
                completedAt: null,
                score: null,
                paths: pairs.map((pair) => ({
                    color: pair.color,
                    moveId: null,
                    timeStamp: null,
                    path: [],
                    completed: false,
                })),
                submissions: [],
            } satisfies InFlightBoardState;
        });

        const inFlightSession: InFlightSessionState = {
            sessionId: session.id,
            userId,
            stageId,
            status: session.status,
            score: session.score ?? 0,
            completedRounds: session.completedRounds,
            currentRoundNumber: session.currentRoundNumber,
            currentLevelId: session.currentLevelId ?? boards[0]?.levelId ?? null,
            requestedDemoRound: session.requestedDemoRound ?? 0,
            requestedActualRound: session.requestedActualRound ?? 1,
            requestedLevelId: session.requestedLevelId ?? boards[0]?.levelId ?? null,
            totalDemoRounds: effectiveTotalDemoRounds,
            totalActualRounds: stageConfig.totalActualRounds,
            stageTimeLimit: stageConfig.timeLimit,
            enableDemo: effectiveEnableDemo,
            gameStartedAtMs: session.gameStartedAt?.getTime() ?? (isActualStart ? nowMs : null),
            gameEndedAtMs:
                session.gameEndedAt?.getTime() ??
                (isActualStart ? nowMs + stageConfig.timeLimit * 1000 : null),
        };

        return {
            session: inFlightSession,
            boards,
            response: this.buildSessionBoardResponseFromState(inFlightSession, boards),
        };
    }

    /**
     * Saves incremental progress into the in-flight session state.
     * @param {InFlightSessionState} session - The in-flight session state.
     * @param {InFlightBoardState[]} boards - The in-flight board list.
     * @param {SaveSnapshotInput} input - The progress payload to apply.
     * @returns {Promise<{ saved: boolean; ignored: boolean }>} The save result.
     */
    saveProgressInState(
        session: InFlightSessionState,
        boards: InFlightBoardState[],
        input: SaveSnapshotInput,
    ): Promise<{ saved: boolean; ignored: boolean }> {
        const board = this.assertActiveBoardState(session, boards, input.board.sessionBoardId);
        const incomingByColor = new Map(
            input.board.paths.map((path) => [normalizeColorCode(path.color), path]),
        );

        const nextPaths: InFlightSavedPath[] = board.paths.map((existing) => {
            const incoming = incomingByColor.get(existing.color);
            return {
                ...existing,
                path: incoming
                    ? this.cloneSnapshotPath(incoming.path)
                    : existing.path.map((point) => clonePoint(point)),
                moveId: incoming ? incoming.moveId : existing.moveId,
                timeStamp: incoming ? incoming.timeStamp : existing.timeStamp,
            };
        });

        if (
            session.gameEndedAtMs &&
            nextPaths.some(
                (path) =>
                    path.timeStamp !== null &&
                    new Date(path.timeStamp).getTime() >
                        (session.gameEndedAtMs ?? Number.MAX_SAFE_INTEGER),
            )
        ) {
            throw new ConflictException('GAME_SESSION_TIMEOUT');
        }

        const validation = validateBlockFillSnapshot({
            gridX: board.gridX,
            gridY: board.gridY,
            pairs: board.pairs,
            paths: nextPaths.map((path) => ({
                color: path.color,
                path: path.path,
            })),
        });

        const changed = board.paths.some((existing) => {
            const incoming = incomingByColor.get(existing.color);
            return incoming ? incoming.moveId !== existing.moveId : false;
        });

        if (!changed) {
            return Promise.resolve({ saved: false, ignored: true });
        }

        const previousMoveIds = new Set(board.paths.map((path) => path.moveId).filter(Boolean));
        const completedColorSet = new Set(validation.completedColors);
        board.paths = nextPaths.map((path) => ({
            ...path,
            completed: completedColorSet.has(path.color),
        }));
        const newSubmissionEvents = input.board.paths
            .filter((path) => !previousMoveIds.has(path.moveId))
            .map(
                (path) =>
                    ({
                        moveId: path.moveId,
                        color: normalizeColorCode(path.color),
                        timeStamp: path.timeStamp,
                        pathLength: path.path.length,
                    }) satisfies InFlightSubmissionEvent,
            );
        if (newSubmissionEvents.length > 0) {
            board.submissions = [...board.submissions, ...newSubmissionEvents].sort((a, b) =>
                a.timeStamp.localeCompare(b.timeStamp),
            );
        }
        board.version += 1;

        return Promise.resolve({ saved: true, ignored: false });
    }

    /**
     * Completes the active board inside the in-flight session state.
     * @param {InFlightSessionState} session - The in-flight session state.
     * @param {InFlightBoardState[]} boards - The in-flight board list.
     * @param {SaveSnapshotInput} input - The completion payload to apply.
     * @returns {{ response: CompleteBoardResponse; expiryAtMs: number | null; }} The completion response and next expiry timestamp.
     */
    completeBoardInState(
        session: InFlightSessionState,
        boards: InFlightBoardState[],
        input: SaveSnapshotInput,
    ): {
        response: CompleteBoardResponse;
        expiryAtMs: number | null;
    } {
        const board = this.assertActiveBoardState(session, boards, input.board.sessionBoardId);
        const incomingByColor = new Map(
            input.board.paths.map((path) => [normalizeColorCode(path.color), path]),
        );

        const mergedPaths: InFlightSavedPath[] = board.paths.map((existing) => {
            const incoming = incomingByColor.get(existing.color);
            return {
                ...existing,
                path: incoming
                    ? this.cloneSnapshotPath(incoming.path)
                    : existing.path.map((point) => clonePoint(point)),
                moveId: incoming ? incoming.moveId : existing.moveId,
                timeStamp: incoming ? incoming.timeStamp : existing.timeStamp,
            };
        });

        validateCompletedBlockFillSolution({
            gridX: board.gridX,
            gridY: board.gridY,
            pairs: board.pairs,
            paths: mergedPaths.map((path) => ({
                color: path.color,
                path: path.path,
            })),
        });

        const previousMoveIds = new Set(board.paths.map((path) => path.moveId).filter(Boolean));
        board.paths = mergedPaths.map((path) => ({
            ...path,
            completed: true,
        }));
        const completionEvents = input.board.paths
            .filter((path) => !previousMoveIds.has(path.moveId))
            .map(
                (path) =>
                    ({
                        moveId: path.moveId,
                        color: normalizeColorCode(path.color),
                        timeStamp: path.timeStamp,
                        pathLength: path.path.length,
                    }) satisfies InFlightSubmissionEvent,
            );
        if (completionEvents.length > 0) {
            board.submissions = [...board.submissions, ...completionEvents].sort((a, b) =>
                a.timeStamp.localeCompare(b.timeStamp),
            );
        }
        board.completed = true;
        board.completedAt = new Date().toISOString();
        board.version += 1;

        const isActualBoard = !session.enableDemo || board.roundNumber > session.totalDemoRounds;
        const boardScore = isActualBoard
            ? this.calculateBoardScoreFromLevelName(board.levelName)
            : 0;
        board.score = boardScore;
        session.score += boardScore;
        session.completedRounds += isActualBoard ? 1 : 0;

        const nextBoard = boards.find((item) => !item.completed) ?? null;

        if (!nextBoard) {
            session.score = this.calculateGameEndScoreFromState(session, Date.now());
            session.status = GAME_SESSION_STATUS.COMPLETED;
            session.currentLevelId = null;
            session.requestedLevelId = null;
            session.requestedDemoRound = 0;
            session.requestedActualRound = 0;
            session.currentRoundNumber = boards.length;

            return {
                expiryAtMs: null,
                response: {
                    sessionId: session.sessionId,
                    stageId: session.stageId,
                    status: 'COMPLETED',
                    completedRounds: session.completedRounds,
                    currentLevelId: null,
                    totalDemoRounds: session.totalDemoRounds,
                    totalActualRounds: session.totalActualRounds,
                    currentDemoRound: 0,
                    currentActualRound: 0,
                    isDemoRound: false,
                    isActualRound: false,
                    board: null,
                    startTime: session.gameStartedAtMs
                        ? new Date(session.gameStartedAtMs).toISOString()
                        : undefined,
                    endTime: session.gameEndedAtMs
                        ? new Date(session.gameEndedAtMs).toISOString()
                        : undefined,
                    finalScore: session.score,
                },
            };
        }

        session.currentRoundNumber = nextBoard.roundNumber;
        session.currentLevelId = nextBoard.levelId;
        session.requestedLevelId = nextBoard.levelId;
        const roundProgress = this.getRoundProgressUpdate(
            nextBoard.roundNumber,
            session.totalDemoRounds,
        );
        session.requestedDemoRound = roundProgress.requestedDemoRound;
        session.requestedActualRound = roundProgress.requestedActualRound;

        let expiryAtMs: number | null = null;
        const firstActualBoard =
            session.enableDemo &&
            nextBoard.roundNumber === session.totalDemoRounds + 1 &&
            session.gameStartedAtMs === null;
        if (firstActualBoard) {
            const nowMs = Date.now();
            nextBoard.startedAtMs = nowMs;
            session.gameStartedAtMs = nowMs;
            session.gameEndedAtMs = nowMs + session.stageTimeLimit * 1000;
            expiryAtMs = session.gameEndedAtMs;
        } else if (nextBoard.startedAtMs === null) {
            nextBoard.startedAtMs = Date.now();
        }

        return {
            expiryAtMs,
            response: this.buildSessionBoardResponseFromState(session, boards),
        };
    }

    /**
     * Builds a board response for a requested round from in-flight state.
     * @param {InFlightSessionState} session - The in-flight session state.
     * @param {InFlightBoardState[]} boards - The in-flight board list.
     * @param {NextBoardInput} input - The requested round payload.
     * @returns {SessionBoardResponse} The requested board response.
     */
    getNextBoardFromState(
        session: InFlightSessionState,
        boards: InFlightBoardState[],
        input: NextBoardInput,
    ): SessionBoardResponse {
        if (this.isSessionTerminal(session) || !boards.some((board) => !board.completed)) {
            return this.buildCompletedSessionResponseFromState(session);
        }

        const requestedActualRound = input.requestedActualRound ?? 0;
        const requestedDemoRound = input.requestedDemoRound ?? 0;

        if (requestedDemoRound > 0 && requestedActualRound > 0) {
            throw new BadRequestException('ONLY_ONE_REQUESTED_ROUND_TYPE_ALLOWED');
        }

        if (requestedDemoRound > session.totalDemoRounds) {
            throw new BadRequestException('REQUESTED_DEMO_ROUND_OUT_OF_RANGE');
        }

        if (requestedActualRound > session.totalActualRounds) {
            throw new BadRequestException('REQUESTED_ACTUAL_ROUND_OUT_OF_RANGE');
        }

        if (requestedDemoRound === 0 && requestedActualRound === 0) {
            throw new BadRequestException('REQUESTED_ROUND_REQUIRED');
        }

        const requestedRoundNumber =
            requestedDemoRound > 0
                ? requestedDemoRound
                : session.totalDemoRounds + requestedActualRound;

        const requestedBoard = boards.find((board) => board.roundNumber === requestedRoundNumber);
        if (!requestedBoard) {
            throw new BadRequestException('REQUESTED_BOARD_NOT_FOUND');
        }

        session.requestedDemoRound = requestedDemoRound;
        session.requestedActualRound = requestedActualRound;
        session.requestedLevelId = requestedBoard.levelId;

        return this.buildSessionBoardResponseFromState(session, boards, {
            targetBoard: requestedBoard,
            includeActiveSessionBoardId: false,
            includeCurrentRoundFields: false,
            requestedRoundFields: {
                requestedDemoRound,
                requestedActualRound,
            },
        });
    }

    /**
     * Builds the current board response from in-flight state.
     * @param {InFlightSessionState} session - The in-flight session state.
     * @param {InFlightBoardState[]} boards - The in-flight board list.
     * @returns {SessionBoardResponse} The current board response.
     */
    getCurrentBoardFromState(
        session: InFlightSessionState,
        boards: InFlightBoardState[],
    ): SessionBoardResponse {
        if (this.isSessionTerminal(session) || !boards.some((board) => !board.completed)) {
            return this.buildCompletedSessionResponseFromState(session);
        }

        return this.buildSessionBoardResponseFromState(session, boards);
    }

    /**
     * Returns timer information from the in-flight session state.
     * @param {InFlightSessionState} session - The in-flight session state.
     * @returns {SessionTimerState} The session timer state.
     */
    getTimerStateFromState(session: InFlightSessionState): SessionTimerState {
        return {
            startTimeMs: session.gameStartedAtMs,
            endTimeMs: session.gameEndedAtMs,
        };
    }

    /**
     * Ends an in-flight session and computes the final score.
     * @param {InFlightSessionState} session - The in-flight session state.
     * @param {InFlightBoardState[]} boards - The in-flight board list.
     * @returns {EndGameResponse} The final game result payload.
     */
    endGameInState(session: InFlightSessionState, boards: InFlightBoardState[]): EndGameResponse {
        void boards;
        if (this.isSessionTerminal(session)) {
            return this.buildEndGameResponseFromState(session);
        }

        const endedAtMs = Date.now();
        session.score = this.calculateGameEndScoreFromState(session, endedAtMs);
        session.status = GAME_SESSION_STATUS.MANUALLY_ENDED;
        session.currentLevelId = null;
        session.requestedLevelId = null;

        return this.buildEndGameResponseFromState(session);
    }

    /**
     * Persists finalized in-flight session state back to the database.
     * @param {InFlightSessionState} session - The in-flight session state.
     * @param {InFlightBoardState[]} boards - The in-flight board list.
     * @param {number} finalStatus - The final session status to persist.
     * @returns {Promise<void>} A promise that resolves when the state is finalized.
     */
    async finalizeStateSession(
        session: InFlightSessionState,
        boards: InFlightBoardState[],
        finalStatus: number,
    ): Promise<void> {
        const endedAt = new Date();
        const finalizedScore = session.score;

        await this.prisma.$transaction(async (tx) => {
            await tx.gameSessionPath.deleteMany({ where: { sessionId: session.sessionId } });
            await tx.gameSessionBoard.deleteMany({ where: { sessionId: session.sessionId } });

            if (boards.length > 0) {
                await tx.gameSessionBoard.createMany({
                    data: boards.map((board) => ({
                        id: board.sessionBoardId,
                        sessionId: session.sessionId,
                        boardId: board.boardId,
                        levelId: board.levelId,
                        roundNumber: board.roundNumber,
                        version: board.version,
                        completed: board.completed,
                        completedAt: board.completedAt ? new Date(board.completedAt) : null,
                        score: board.score,
                        gameType: GAME_TYPES.BLOCK_FILL,
                        gridX: board.gridX,
                        gridY: board.gridY,
                        timeLimit: board.timeLimit,
                    })),
                });

                const paths = boards.flatMap((board) =>
                    board.paths.map((path) => ({
                        id: randomUUID(),
                        sessionId: session.sessionId,
                        sessionBoardId: board.sessionBoardId,
                        color: colorCodeToStorageValue(path.color),
                        moveId: path.moveId,
                        timestamp: path.timeStamp ? new Date(path.timeStamp) : null,
                        path: path.path as unknown as Prisma.InputJsonValue,
                        completed: path.completed,
                    })),
                );

                if (paths.length > 0) {
                    await tx.gameSessionPath.createMany({ data: paths });
                }
            }

            await tx.gameSession.update({
                where: { id: session.sessionId },
                data: {
                    status: finalStatus,
                    score: finalizedScore,
                    completedRounds: session.completedRounds,
                    currentRoundNumber: session.currentRoundNumber,
                    requestedDemoRound: session.requestedDemoRound,
                    requestedActualRound: session.requestedActualRound,
                    requestedLevelId: session.requestedLevelId,
                    currentLevelId:
                        finalStatus === GAME_SESSION_STATUS.ACTIVE ? session.currentLevelId : null,
                    endedAt,
                    gameStartedAt: session.gameStartedAtMs
                        ? new Date(session.gameStartedAtMs)
                        : null,
                    gameEndedAt: session.gameEndedAtMs ? new Date(session.gameEndedAtMs) : null,
                },
            });
        });

        this.runAntiCheatOnFinalize(session, boards);

        session.score = finalizedScore;
        session.status = finalStatus;
    }

    /**
     * Starts a persisted game session in the database-driven flow.
     * @param {string} userId - The authenticated user identifier.
     * @param {string} stageId - The stage identifier.
     * @returns {Promise<SessionBoardResponse>} The first board response for the session.
     */
    async startSession(userId: string, stageId: string): Promise<SessionBoardResponse> {
        const stageConfig = await this.prisma.stageConfig.findFirst({
            where: { stageId, deletedAt: null },
            include: {
                levels: {
                    where: { deletedAt: null },
                    include: { level: true },
                    orderBy: { order: 'asc' },
                },
                demoLevels: {
                    where: { deletedAt: null },
                    include: { level: true },
                    orderBy: { order: 'asc' },
                },
            },
        });

        if (!stageConfig) {
            throw new NotFoundException('STAGE_CONFIG_NOT_FOUND');
        }

        if (stageConfig.levels.length === 0) {
            throw new BadRequestException('STAGE_CONFIG_HAS_NO_LEVELS');
        }

        const sequence = await this.buildBoardSequence(userId, stageConfig);
        const effectiveEnableDemo = false;
        const effectiveTotalDemoRounds = 0;
        const isActualStart = true;
        const now = new Date();
        const gameStartedAt = now;
        const gameEndedAt = new Date(now.getTime() + stageConfig.timeLimit * 1000);

        const session = await this.prisma.gameSession.create({
            data: {
                userId,
                status: GAME_SESSION_STATUS.ACTIVE,
                completedRounds: 0,
                currentLevelId: sequence[0]?.levelId ?? null,
                ...this.getRoundProgressUpdate(1, effectiveTotalDemoRounds),
                ...(isActualStart ? { gameStartedAt, gameEndedAt } : {}),
            },
        });

        await this.prisma.gameSessionStageConfig.create({
            data: {
                sessionId: session.id,
                stageConfigId: stageConfig.id,
                timeLimit: stageConfig.timeLimit,
                enableDemo: effectiveEnableDemo,
                totalDemoRounds: effectiveTotalDemoRounds,
            },
        });

        await this.prisma.gameSessionBoard.createMany({
            data: sequence.map((entry) => ({
                sessionId: session.id,
                boardId: entry.boardId,
                levelId: entry.levelId,
                roundNumber: entry.roundNumber,
                gameType: GAME_TYPES.BLOCK_FILL,
                gridX: entry.gridX,
                gridY: entry.gridY,
                timeLimit: entry.timeLimit,
            })),
        });

        return this.getCurrentBoard(session.id, userId);
    }

    private async pickBoardsForLevel(options: {
        userId: string;
        levelId: string;
        boardCount: number;
        insufficientBoardsMessage: string;
        excludeBoardIds?: string[];
    }) {
        const availableBoards = await this.prisma.board.findMany({
            where: {
                levelId: options.levelId,
                deletedAt: null,
                gameType: GAME_TYPES.BLOCK_FILL,
            },
            select: {
                id: true,
                levelId: true,
                name: true,
                gridX: true,
                gridY: true,
                timeLimit: true,
                pairs: true,
                level: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        if (availableBoards.length < options.boardCount) {
            throw new ConflictException(options.insufficientBoardsMessage);
        }

        return this.pickBoardsForSession({
            userId: options.userId,
            levelId: options.levelId,
            boardCount: options.boardCount,
            excludeBoardIds: options.excludeBoardIds ?? [],
            availableBoards: availableBoards.map((board) => ({
                id: board.id,
                levelId: board.levelId,
                name: board.name,
                levelName: board.level?.name ?? null,
                gridX: board.gridX,
                gridY: board.gridY,
                timeLimit: board.timeLimit,
                pairs: board.pairs,
            })),
        });
    }

    private async pickBoardsForSession(options: {
        userId: string;
        levelId: string;
        boardCount: number;
        excludeBoardIds: string[];
        availableBoards: Array<{
            id: string;
            levelId: string;
            name: string | null;
            levelName: string | null;
            gridX: number;
            gridY: number;
            timeLimit: number;
            pairs: unknown;
        }>;
    }) {
        const { userId, levelId, boardCount, availableBoards, excludeBoardIds } = options;
        const excluded = new Set(excludeBoardIds);
        const candidateBoards = availableBoards.filter((board) => !excluded.has(board.id));

        if (candidateBoards.length < boardCount) {
            throw new ConflictException('INSUFFICIENT_DISTINCT_BOARDS_FOR_SESSION_SEQUENCE');
        }

        const playedBoards = await this.prisma.gameSessionBoard.findMany({
            where: {
                levelId,
                deletedAt: null,
                boardId: { in: candidateBoards.map((b) => b.id) },
                session: { userId, deletedAt: null },
            },
            orderBy: { createdAt: 'desc' },
            select: { boardId: true },
        });

        const lastPlayedOrder = new Map<string, number>();
        for (const item of playedBoards) {
            if (!lastPlayedOrder.has(item.boardId)) {
                lastPlayedOrder.set(item.boardId, lastPlayedOrder.size);
            }
        }

        const sorted = [...candidateBoards].sort((a, b) => {
            const aOrder = lastPlayedOrder.get(a.id) ?? -1;
            const bOrder = lastPlayedOrder.get(b.id) ?? -1;
            return aOrder - bOrder;
        });

        const neverPlayed = sorted.filter((b) => !lastPlayedOrder.has(b.id));
        const alreadyPlayed = sorted.filter((b) => lastPlayedOrder.has(b.id));

        const pool =
            boardCount <= neverPlayed.length
                ? shuffle(neverPlayed).slice(0, boardCount)
                : [...shuffle(neverPlayed), ...alreadyPlayed].slice(0, boardCount);

        return pool;
    }

    /**
     * Fetches the current board for a persisted session.
     * @param {string} sessionId - The session identifier.
     * @param {string} userId - The authenticated user identifier.
     * @returns {Promise<SessionBoardResponse>} The current board response.
     */
    async getCurrentBoard(sessionId: string, userId: string): Promise<SessionBoardResponse> {
        const current = await this.getSessionContext(sessionId, userId);
        if (
            current.session.status !== GAME_SESSION_STATUS.ACTIVE &&
            current.session.status !== GAME_SESSION_STATUS.RESULT_PROCESSING
        ) {
            return this.buildCompletedSessionResponse(current);
        }

        if (!current.activeSessionBoardId) {
            return this.buildCompletedSessionResponse(current);
        }

        this.assertSessionNotTimedOut(current);
        return this.buildSessionBoardResponse(current);
    }

    /**
     * Fetches timer information for a session owned by the user.
     * @param {string} sessionId - The session identifier.
     * @param {string} userId - The authenticated user identifier.
     * @returns {Promise<SessionTimerState | null>} The timer state or null when the session does not exist.
     */
    async getOwnedSessionTimer(
        sessionId: string,
        userId: string,
    ): Promise<SessionTimerState | null> {
        const session = await this.prisma.gameSession.findFirst({
            where: {
                id: sessionId,
                userId,
                deletedAt: null,
            },
            select: {
                gameStartedAt: true,
                gameEndedAt: true,
            },
        });

        if (!session) {
            return null;
        }

        return {
            startTimeMs: session.gameStartedAt ? session.gameStartedAt.getTime() : null,
            endTimeMs: session.gameEndedAt ? session.gameEndedAt.getTime() : null,
        };
    }

    /**
     * Ends a persisted session and returns the final score.
     * @param {string} sessionId - The session identifier.
     * @param {string} userId - The authenticated user identifier.
     * @returns {Promise<EndGameResponse>} The final game result payload.
     */
    async endGame(sessionId: string, userId: string): Promise<EndGameResponse> {
        const context = await this.getSessionContext(sessionId, userId);

        if (
            context.session.status === GAME_SESSION_STATUS.COMPLETED ||
            context.session.status === GAME_SESSION_STATUS.EXPIRED ||
            context.session.status === GAME_SESSION_STATUS.MANUALLY_ENDED
        ) {
            return this.buildEndGameResponseFromContext(context, context.session.score ?? 0);
        }

        const endedAt = new Date();
        const finalScore = this.calculateGameEndScore(context, endedAt);

        await this.prisma.gameSession.update({
            where: { id: sessionId },
            data: {
                status: GAME_SESSION_STATUS.COMPLETED,
                score: finalScore,
                currentLevelId: null,
                endedAt,
            },
        });

        return this.buildEndGameResponseFromContext(context, finalScore);
    }

    /**
     * Marks an open session as expired.
     * @param {string} sessionId - The session identifier.
     * @returns {Promise<boolean>} Whether an expiration update was applied.
     */
    async finalizeExpiredSession(sessionId: string): Promise<boolean> {
        const session = await this.prisma.gameSession.findUnique({
            where: { id: sessionId },
            select: {
                id: true,
                status: true,
                score: true,
            },
        });

        if (!session) {
            return false;
        }

        if (
            session.status === GAME_SESSION_STATUS.COMPLETED ||
            session.status === GAME_SESSION_STATUS.EXPIRED ||
            session.status === GAME_SESSION_STATUS.MANUALLY_ENDED
        ) {
            return false;
        }

        await this.prisma.gameSession.update({
            where: { id: sessionId },
            data: {
                status: GAME_SESSION_STATUS.EXPIRED,
                currentLevelId: null,
                endedAt: new Date(),
                score: session.score ?? 0,
            },
        });

        return true;
    }

    /**
     * Expires an open session when no Restate state is available.
     * @param {string} sessionId - The session identifier.
     * @returns {Promise<boolean>} Whether an expiration update was applied.
     */
    async expireOpenSessionWithoutRestateState(sessionId: string): Promise<boolean> {
        return this.finalizeExpiredSession(sessionId);
    }

    /**
     * Saves incremental board progress for a persisted session.
     * @param {SaveSnapshotInput} input - The progress payload to store.
     * @param {string} userId - The authenticated user identifier.
     * @returns {Promise<{ saved: boolean; ignored: boolean }>} The save result.
     */
    async saveProgress(input: SaveSnapshotInput, userId: string) {
        const context = await this.getSessionContext(
            input.sessionId,
            userId,
            input.board.sessionBoardId,
        );
        this.assertBoardIsCurrent(context);

        // Batch-fetch stored moveIds to check idempotency per color
        const existingPaths = await this.prisma.gameSessionPath.findMany({
            where: { sessionBoardId: context.sessionBoard.id, deletedAt: null },
            select: { color: true, moveId: true },
        });
        const storedMoveIdByColor = new Map(
            existingPaths.map((p) => [storageValueToColorCode(p.color), p.moveId]),
        );

        // Only process paths whose moveId is not yet stored
        const newPaths = input.board.paths.filter((p) => {
            const normalizedColor = normalizeColorCode(p.color);
            return storedMoveIdByColor.get(normalizedColor) !== p.moveId;
        });

        if (newPaths.length === 0) {
            return { saved: false, ignored: true };
        }

        if (
            context.session.gameEndedAt &&
            newPaths.some((path) => new Date(path.timeStamp) > context.session.gameEndedAt!)
        ) {
            throw new ConflictException('GAME_SESSION_TIMEOUT');
        }

        // Validate the full board state to derive completedColors across all paths
        const allNormalized = this.normalizePaths(context.pairs, input.board.paths);
        const validation = validateBlockFillSnapshot({
            gridX: context.sessionBoard.gridX,
            gridY: context.sessionBoard.gridY,
            pairs: context.pairs,
            paths: allNormalized,
        });

        // Persist each changed path individually with its own moveId + timestamp.
        // Sorting here is critical: persistSnapshot only sees one color at a time in
        // save-progress, so the request-level loop must also use a stable lock order
        // to prevent red->blue vs blue->red deadlocks across concurrent requests.
        const orderedNewPaths = [...newPaths].sort((a, b) =>
            normalizeColorCode(a.color).localeCompare(normalizeColorCode(b.color)),
        );
        const newColorSet = new Set(orderedNewPaths.map((p) => normalizeColorCode(p.color)));
        for (const newPath of orderedNewPaths) {
            const normalized = allNormalized.filter((p) => p.color === newPath.color);
            await this.persistSnapshot(
                context,
                normalized,
                validation.completedColors,
                newPath.moveId,
                new Date(newPath.timeStamp),
            );
        }

        // Increment version once for the whole save-progress request
        if (newColorSet.size > 0) {
            await this.prisma.gameSessionBoard.update({
                where: { id: context.sessionBoard.id },
                data: { version: { increment: 1 } },
            });
        }

        return { saved: true, ignored: false };
    }

    /**
     * Completes the active board for a persisted session.
     * @param {SaveSnapshotInput} input - The board completion payload.
     * @param {string} userId - The authenticated user identifier.
     * @returns {Promise<CompleteBoardResponse>} The board completion response.
     */
    async completeBoard(input: SaveSnapshotInput, userId: string): Promise<CompleteBoardResponse> {
        await this.lockSession(input.sessionId, userId);
        const context = await this.getSessionContext(
            input.sessionId,
            userId,
            input.board.sessionBoardId,
        );

        const normalizedPaths = this.normalizePaths(context.pairs, input.board.paths);

        if (context.sessionBoard.completed) {
            validateCompletedBlockFillSolution({
                gridX: context.sessionBoard.gridX,
                gridY: context.sessionBoard.gridY,
                pairs: context.pairs,
                paths: normalizedPaths,
            });

            if (
                context.session.status === GAME_SESSION_STATUS.COMPLETED ||
                !context.activeSessionBoardId
            ) {
                return this.buildCompletedSessionResponse(context);
            }

            return this.buildSessionBoardResponse(
                await this.getSessionContext(input.sessionId, userId),
            );
        }

        this.assertBoardIsCurrent(context);

        validateCompletedBlockFillSolution({
            gridX: context.sessionBoard.gridX,
            gridY: context.sessionBoard.gridY,
            pairs: context.pairs,
            paths: normalizedPaths,
        });

        await this.persistSnapshot(
            context,
            normalizedPaths,
            context.pairs.map((pair) => pair.color),
        );

        const isActualBoard =
            !context.enableDemo || context.sessionBoard.roundNumber > context.totalDemoRounds;
        const boardScore = isActualBoard ? this.calculateBoardScore(context) : 0;
        const completedScore = (context.session.score ?? 0) + boardScore;

        const completedAt = new Date();

        await this.prisma.gameSessionBoard.update({
            where: { id: context.sessionBoard.id },
            data: {
                completed: true,
                completedAt,
                score: boardScore,
                version: { increment: 1 },
            },
        });

        const nextBoard = await this.prisma.gameSessionBoard.findFirst({
            where: {
                sessionId: input.sessionId,
                deletedAt: null,
                completed: false,
            },
            orderBy: { roundNumber: 'asc' },
            select: { id: true, roundNumber: true, levelId: true },
        });

        const completedRoundsIncrement = isActualBoard ? 1 : 0;
        const newCompletedRounds = context.session.completedRounds + completedRoundsIncrement;

        if (!nextBoard) {
            const finalScore = this.calculateGameEndScore(context, completedAt, completedScore);

            await this.prisma.gameSession.update({
                where: { id: input.sessionId },
                data: {
                    status: GAME_SESSION_STATUS.COMPLETED,
                    score: finalScore,
                    completedRounds: { increment: completedRoundsIncrement },
                    currentLevelId: null,
                    endedAt: completedAt,
                },
            });

            return {
                sessionId: input.sessionId,
                stageId: context.stageId,
                status: 'COMPLETED',
                completedRounds: newCompletedRounds,
                currentLevelId: null,
                totalDemoRounds: context.totalDemoRounds,
                totalActualRounds: context.totalActualRounds,
                currentDemoRound: 0,
                currentActualRound: 0,
                isDemoRound: false,
                isActualRound: false,
                board: null,
                startTime: context.session.gameStartedAt?.toISOString(),
                endTime: context.session.gameEndedAt?.toISOString(),
                finalScore,
            };
        }

        const isFirstActualBoard =
            context.enableDemo &&
            nextBoard.roundNumber === context.totalDemoRounds + 1 &&
            !context.session.gameStartedAt;

        let gameStartedAt = context.session.gameStartedAt;
        let gameEndedAt = context.session.gameEndedAt;

        const sessionUpdate: Record<string, unknown> = {
            score: completedScore,
            completedRounds: { increment: completedRoundsIncrement },
            currentLevelId: nextBoard.levelId,
            ...this.getRoundProgressUpdate(nextBoard.roundNumber, context.totalDemoRounds),
        };

        if (isFirstActualBoard) {
            const now = new Date();
            gameStartedAt = now;
            gameEndedAt = new Date(now.getTime() + context.stageTimeLimit * 1000);
            sessionUpdate.gameStartedAt = gameStartedAt;
            sessionUpdate.gameEndedAt = gameEndedAt;
        }

        const nextContext = await this.getSessionContext(input.sessionId, userId, nextBoard.id);
        const boardResponse = await this.buildSessionBoardResponse({
            ...nextContext,
            session: {
                ...nextContext.session,
                score: completedScore,
                completedRounds: newCompletedRounds,
                currentLevelId: nextBoard.levelId,
                gameStartedAt,
                gameEndedAt,
            },
        });

        await this.prisma.gameSession.update({
            where: { id: input.sessionId },
            data: sessionUpdate,
        });

        return boardResponse;
    }

    /**
     * Fetches a specific board response for a persisted session.
     * @param {NextBoardInput} input - The requested round payload.
     * @param {string} userId - The authenticated user identifier.
     * @returns {Promise<SessionBoardResponse>} The requested board response.
     */
    async getNextBoard(input: NextBoardInput, userId: string): Promise<SessionBoardResponse> {
        const context = await this.getSessionContext(input.sessionId, userId);

        if (
            context.session.status === GAME_SESSION_STATUS.COMPLETED ||
            !context.activeSessionBoardId
        ) {
            return this.buildCompletedSessionResponse(context);
        }

        this.assertSessionNotTimedOut(context);

        const requestedActualRound = input.requestedActualRound ?? 0;
        const requestedDemoRound = input.requestedDemoRound ?? 0;

        if (requestedDemoRound > 0 && requestedActualRound > 0) {
            throw new BadRequestException('ONLY_ONE_REQUESTED_ROUND_TYPE_ALLOWED');
        }

        const requestedRoundNumber =
            requestedDemoRound > 0
                ? requestedDemoRound
                : requestedActualRound > 0
                  ? context.totalDemoRounds + requestedActualRound
                  : context.sessionBoard.roundNumber;

        if (requestedDemoRound > context.totalDemoRounds) {
            throw new BadRequestException('REQUESTED_DEMO_ROUND_OUT_OF_RANGE');
        }

        if (requestedActualRound > context.totalActualRounds) {
            throw new BadRequestException('REQUESTED_ACTUAL_ROUND_OUT_OF_RANGE');
        }

        if (requestedDemoRound === 0 && requestedActualRound === 0) {
            throw new BadRequestException('REQUESTED_ROUND_REQUIRED');
        }

        const requestedBoard = context.sessionBoards.find(
            (board) => board.roundNumber === requestedRoundNumber,
        );

        if (!requestedBoard) {
            throw new BadRequestException('REQUESTED_BOARD_NOT_FOUND');
        }

        await this.prisma.gameSession.update({
            where: { id: input.sessionId },
            data: {
                requestedDemoRound,
                requestedActualRound,
                requestedLevelId: requestedBoard.levelId,
            },
        });

        const requestedContext = await this.getSessionContext(
            input.sessionId,
            userId,
            requestedBoard.id,
        );

        return this.buildSessionBoardResponse(requestedContext, {
            includeActiveSessionBoardId: false,
            includeCurrentRoundFields: false,
            requestedRoundFields: {
                requestedDemoRound,
                requestedActualRound,
            },
        });
    }

    /**
     * Handles disconnect events for compatibility with the session API.
     * @returns {void} Nothing.
     */
    disconnectSession(): void {
        return;
    }

    private async getSessionContext(
        sessionId: string,
        userId: string,
        sessionBoardId?: string,
    ): Promise<SessionContext> {
        const [session, sessionBoards] = await Promise.all([
            this.prisma.gameSession.findFirst({
                where: { id: sessionId, userId, deletedAt: null },
                select: {
                    id: true,
                    status: true,
                    score: true,
                    completedRounds: true,
                    currentLevelId: true,
                    requestedDemoRound: true,
                    requestedActualRound: true,
                    requestedLevelId: true,
                    gameStartedAt: true,
                    gameEndedAt: true,
                    stageConfig: {
                        select: {
                            timeLimit: true,
                            enableDemo: true,
                            totalDemoRounds: true,
                            stageConfig: {
                                select: {
                                    stageId: true,
                                    totalActualRounds: true,
                                },
                            },
                        },
                    },
                },
            }),
            this.prisma.gameSessionBoard.findMany({
                where: { sessionId, deletedAt: null },
                orderBy: { roundNumber: 'asc' },
                select: {
                    id: true,
                    boardId: true,
                    levelId: true,
                    roundNumber: true,
                    version: true,
                    completed: true,
                    gridX: true,
                    gridY: true,
                    timeLimit: true,
                    gameType: true,
                },
            }),
        ]);

        if (!session) {
            throw new NotFoundException('GAME_SESSION_NOT_FOUND');
        }

        if (!session.stageConfig?.stageConfig.stageId) {
            throw new NotFoundException('GAME_SESSION_STAGE_CONFIG_NOT_FOUND');
        }

        const activeSessionBoard = sessionBoards.find((board) => !board.completed) ?? null;
        const sessionBoard = sessionBoardId
            ? (sessionBoards.find((board) => board.id === sessionBoardId) ?? null)
            : (activeSessionBoard ?? sessionBoards[sessionBoards.length - 1] ?? null);

        if (!sessionBoard) {
            throw new NotFoundException('GAME_SESSION_BOARD_NOT_FOUND');
        }

        const board = await this.prisma.board.findFirst({
            where: { id: sessionBoard.boardId, deletedAt: null },
            select: {
                id: true,
                levelId: true,
                level: {
                    select: {
                        name: true,
                    },
                },
                name: true,
                gridX: true,
                gridY: true,
                pairs: true,
            },
        });

        if (!board) {
            throw new NotFoundException('BOARD_NOT_FOUND');
        }

        return {
            session: {
                id: session.id,
                status: session.status,
                score: session.score,
                completedRounds: session.completedRounds,
                currentLevelId: session.currentLevelId,
                requestedDemoRound: session.requestedDemoRound,
                requestedActualRound: session.requestedActualRound,
                requestedLevelId: session.requestedLevelId,
                gameStartedAt: session.gameStartedAt,
                gameEndedAt: session.gameEndedAt,
            },
            stageId: session.stageConfig.stageConfig.stageId,
            stageTimeLimit: session.stageConfig.timeLimit,
            enableDemo: session.stageConfig.enableDemo,
            totalDemoRounds: session.stageConfig.totalDemoRounds,
            sessionBoardCount: sessionBoards.length,
            totalActualRounds: session.stageConfig.stageConfig.totalActualRounds,
            activeSessionBoardId: activeSessionBoard?.id ?? null,
            sessionBoardRounds: sessionBoards.map((board) => board.roundNumber),
            sessionBoards: sessionBoards.map((board) => ({
                id: board.id,
                levelId: board.levelId,
                roundNumber: board.roundNumber,
                completed: board.completed,
            })),
            sessionBoard,
            board: {
                ...board,
                levelName: board.level?.name ?? null,
            },
            boardShape: toBoardShape({
                name: board.name,
                gridX: board.gridX,
                gridY: board.gridY,
                rawPairs: board.pairs,
            }),
            pairs: this.parsePairs(board.pairs),
        };
    }

    private assertBoardIsCurrent(context: SessionContext) {
        if (
            context.session.status !== GAME_SESSION_STATUS.ACTIVE &&
            context.session.status !== GAME_SESSION_STATUS.RESULT_PROCESSING
        ) {
            throw new ConflictException('GAME_SESSION_NOT_ACTIVE');
        }

        if (
            !context.activeSessionBoardId ||
            context.sessionBoard.id !== context.activeSessionBoardId
        ) {
            throw new ConflictException('GAME_SESSION_BOARD_NOT_ACTIVE');
        }

        if (context.sessionBoard.completed) {
            throw new ConflictException('GAME_SESSION_BOARD_ALREADY_COMPLETED');
        }
    }

    private assertSessionNotTimedOut(context: SessionContext) {
        if (context.session.gameEndedAt && new Date() > context.session.gameEndedAt) {
            throw new ConflictException('GAME_SESSION_TIMEOUT');
        }
    }

    private async buildSessionBoardResponse(
        context: SessionContext,
        options: {
            previewOnly?: boolean;
            includeActiveSessionBoardId?: boolean;
            includeCurrentRoundFields?: boolean;
            requestedRoundFields?: {
                requestedDemoRound: number;
                requestedActualRound: number;
            };
        } = {},
    ): Promise<SessionBoardResponse> {
        await this.ensureSessionPaths(context);

        const savedPaths = await this.prisma.gameSessionPath.findMany({
            where: {
                sessionId: context.session.id,
                sessionBoardId: context.sessionBoard.id,
                deletedAt: null,
            },
            orderBy: { color: 'asc' },
            select: {
                color: true,
                path: true,
                completed: true,
            },
        });

        const boardRoundNumber = context.sessionBoard.roundNumber;
        const isDemoRound = context.enableDemo && boardRoundNumber <= context.totalDemoRounds;
        const isActualRound = !isDemoRound;
        const startTime =
            isActualRound && context.session.gameStartedAt
                ? context.session.gameStartedAt.toISOString()
                : undefined;
        const endTime =
            isActualRound && context.session.gameEndedAt
                ? context.session.gameEndedAt.toISOString()
                : undefined;

        const currentDemoRound = isDemoRound ? boardRoundNumber : 0;
        const currentActualRound = isActualRound ? boardRoundNumber - context.totalDemoRounds : 0;
        const derivedRequestedRoundFields = options.requestedRoundFields ?? {
            requestedDemoRound: isDemoRound ? boardRoundNumber : 0,
            requestedActualRound: isActualRound ? boardRoundNumber - context.totalDemoRounds : 0,
        };

        return {
            sessionId: context.session.id,
            stageId: context.stageId,
            status: 'ACTIVE',
            previewOnly: options.previewOnly ?? false,
            ...((options.includeActiveSessionBoardId ?? true)
                ? { activeSessionBoardId: context.activeSessionBoardId }
                : {}),
            completedRounds: context.session.completedRounds,
            currentLevelId: context.sessionBoard.levelId,
            totalDemoRounds: context.totalDemoRounds,
            totalActualRounds: context.totalActualRounds,
            ...((options.includeCurrentRoundFields ?? true)
                ? {
                      currentDemoRound,
                      currentActualRound,
                  }
                : {}),
            ...derivedRequestedRoundFields,
            isDemoRound,
            isActualRound,
            startTime,
            endTime,
            board: formatBlockFillBoard({
                sessionBoardId: context.sessionBoard.id,
                board: context.board,
                boardShape: context.boardShape,
                version: context.sessionBoard.version,
                paths: savedPaths.map((path) => ({
                    color: storageValueToColorCode(path.color),
                    path: this.parseStoredPath(path.path),
                    completed: path.completed,
                })),
            }),
        };
    }

    private buildCompletedSessionResponse(context: SessionContext): SessionBoardResponse {
        return {
            sessionId: context.session.id,
            stageId: context.stageId,
            status: 'COMPLETED',
            previewOnly: false,
            activeSessionBoardId: null,
            completedRounds: context.session.completedRounds,
            currentLevelId: null,
            totalDemoRounds: context.totalDemoRounds,
            totalActualRounds: context.totalActualRounds,
            currentDemoRound: 0,
            currentActualRound: 0,
            isDemoRound: false,
            isActualRound: false,
            startTime: context.session.gameStartedAt?.toISOString(),
            endTime: context.session.gameEndedAt?.toISOString(),
            board: null,
            finalScore: context.session.score ?? 0,
        };
    }

    private async ensureSessionPaths(context: SessionContext) {
        const existingPaths = await this.prisma.gameSessionPath.findMany({
            where: {
                sessionId: context.session.id,
                sessionBoardId: context.sessionBoard.id,
                deletedAt: null,
            },
            select: { color: true },
        });

        const existingColors = new Set(
            existingPaths.map((path) => storageValueToColorCode(path.color)),
        );
        const missing = context.pairs.filter((pair) => !existingColors.has(pair.color));
        if (missing.length === 0) {
            return;
        }

        await this.prisma.gameSessionPath.createMany({
            data: missing.map((pair) => ({
                sessionId: context.session.id,
                sessionBoardId: context.sessionBoard.id,
                color: colorCodeToStorageValue(pair.color),
                path: [],
                completed: false,
            })),
            skipDuplicates: true,
        });
    }

    private async persistSnapshot(
        context: SessionContext,
        paths: BlockFillSavedPath[],
        completedColors: string[],
        moveId?: string,
        timestamp?: Date,
    ) {
        await this.ensureSessionPaths(context);
        const completedColorSet = new Set(completedColors);

        // Sort by color so concurrent transactions always acquire row locks in the same order,
        // preventing deadlocks when save-progress and complete-board run simultaneously.
        const sortedPaths = [...paths].sort((a, b) => a.color.localeCompare(b.color));

        for (const path of sortedPaths) {
            await this.prisma.gameSessionPath.upsert({
                where: {
                    sessionBoardId_color: {
                        sessionBoardId: context.sessionBoard.id,
                        color: colorCodeToStorageValue(path.color),
                    },
                },
                update: {
                    path: path.path as unknown as Prisma.InputJsonValue,
                    completed: completedColorSet.has(path.color),
                    deletedAt: null,
                    ...(moveId !== undefined && { moveId, timestamp }),
                },
                create: {
                    sessionId: context.session.id,
                    sessionBoardId: context.sessionBoard.id,
                    color: colorCodeToStorageValue(path.color),
                    path: path.path as unknown as Prisma.InputJsonValue,
                    completed: completedColorSet.has(path.color),
                    ...(moveId !== undefined && { moveId, timestamp }),
                },
            });
        }
    }

    private normalizePaths(
        pairs: BlockFillPairInput[],
        paths: Array<{
            color: string;
            path: Array<{ row: number; col: number }>;
        }>,
    ): BlockFillSavedPath[] {
        const incomingByColor = new Map(
            paths.map((path) => [normalizeColorCode(path.color), path]),
        );
        return pairs.map((pair) => ({
            color: pair.color,
            path: this.cloneSnapshotPath(incomingByColor.get(pair.color)?.path ?? []),
        }));
    }

    private parsePairs(rawPairs: unknown): BlockFillPairInput[] {
        const boardShape = toBoardShape({
            name: 'game-board',
            gridX: 0,
            gridY: 0,
            rawPairs,
        });

        return extractPairsFromBoardShape(boardShape);
    }

    private cloneSnapshotPath(path: Array<{ row: number; col: number }>): GridPoint[] {
        return path.map((point) => ({ x: point.col, y: point.row }));
    }

    private async lockSession(sessionId: string, userId: string): Promise<void> {
        const queryClient = transactionContext.getStore() ?? this.prisma;
        const rows = await queryClient.$queryRaw<Array<{ id: string }>>(Prisma.sql`
            SELECT id
            FROM game_sessions
            WHERE id = ${sessionId}
              AND user_id = ${userId}
              AND deleted_at IS NULL
            FOR UPDATE
        `);

        if (rows.length === 0) {
            throw new NotFoundException('GAME_SESSION_NOT_FOUND');
        }
    }

    private parseStoredPath(path: unknown): GridPoint[] {
        if (!Array.isArray(path)) {
            return [];
        }

        return path.flatMap((point) => {
            if (!isStoredGridPoint(point)) {
                return [];
            }

            return [{ x: point.x, y: point.y }];
        });
    }

    private calculateBoardScore(context: SessionContext): number {
        const normalizedLevelName = context.board.levelName?.trim().toLowerCase() ?? '';
        return LEVEL_SCORE_WEIGHTS[normalizedLevelName] ?? GAME_END_BASE_SCORE;
    }

    private calculateGameEndScore(
        context: SessionContext,
        endedAt: Date,
        accumulatedScore = context.session.score ?? 0,
    ): number {
        if (!context.session.gameStartedAt || !context.session.gameEndedAt) {
            return accumulatedScore;
        }

        const timeTakenSeconds = Math.max(
            0,
            Math.floor((endedAt.getTime() - context.session.gameStartedAt.getTime()) / 1000),
        );
        const timeWindowSeconds = Math.max(
            0,
            Math.floor(
                (context.session.gameEndedAt.getTime() - context.session.gameStartedAt.getTime()) /
                    1000,
            ),
        );
        const timeRemainingScore = Math.max(0, timeWindowSeconds - timeTakenSeconds);

        return accumulatedScore + timeRemainingScore;
    }

    private isUniqueConstraintError(error: unknown): boolean {
        return (
            error instanceof Error &&
            'code' in error &&
            (error as { code: unknown }).code === 'P2002'
        );
    }

    private buildEndGameResponseFromState(session: InFlightSessionState): EndGameResponse {
        return {
            finalScore: session.score,
            roundsCompleted: session.completedRounds,
            totalRounds: session.totalActualRounds,
        };
    }

    private buildEndGameResponseFromContext(
        context: SessionContext,
        finalScore: number,
    ): EndGameResponse {
        return {
            finalScore,
            roundsCompleted: context.session.completedRounds,
            totalRounds: context.totalActualRounds,
        };
    }

    private getRoundProgressUpdate(
        roundNumber: number,
        totalDemoRounds: number,
    ): {
        requestedDemoRound: number;
        requestedActualRound: number;
    } {
        if (roundNumber <= totalDemoRounds) {
            return {
                requestedDemoRound: roundNumber,
                requestedActualRound: 0,
            };
        }

        return {
            requestedDemoRound: totalDemoRounds,
            requestedActualRound: roundNumber - totalDemoRounds,
        };
    }

    private async buildBoardSequence(
        userId: string,
        stageConfig: StageConfigWithBoards,
    ): Promise<BoardSequenceEntry[]> {
        const sequence: BoardSequenceEntry[] = [];
        const usedBoardIds = new Set<string>();

        let roundNumber = 1;
        for (const levelConfig of stageConfig.levels) {
            const chosenBoards = await this.pickBoardsForLevel({
                userId,
                levelId: levelConfig.levelId,
                boardCount: levelConfig.boardCount,
                insufficientBoardsMessage: 'INSUFFICIENT_BOARDS_FOR_STAGE_LEVEL',
                excludeBoardIds: [...usedBoardIds],
            });

            for (const board of chosenBoards) {
                usedBoardIds.add(board.id);
                sequence.push({
                    boardId: board.id,
                    levelId: board.levelId,
                    levelName: board.levelName,
                    name: board.name,
                    roundNumber,
                    gridX: board.gridX,
                    gridY: board.gridY,
                    timeLimit: board.timeLimit,
                    pairs: board.pairs,
                });
                roundNumber += 1;
            }
        }

        return sequence;
    }

    private isSessionTerminal(session: InFlightSessionState): boolean {
        return (
            session.status === GAME_SESSION_STATUS.COMPLETED ||
            session.status === GAME_SESSION_STATUS.EXPIRED ||
            session.status === GAME_SESSION_STATUS.MANUALLY_ENDED
        );
    }

    private assertActiveBoardState(
        session: InFlightSessionState,
        boards: InFlightBoardState[],
        sessionBoardId?: string,
    ): InFlightBoardState {
        if (
            session.status !== GAME_SESSION_STATUS.ACTIVE &&
            session.status !== GAME_SESSION_STATUS.RESULT_PROCESSING
        ) {
            throw new ConflictException('GAME_SESSION_NOT_ACTIVE');
        }

        const activeBoard = boards.find((board) => !board.completed) ?? null;
        if (!activeBoard) {
            throw new ConflictException('GAME_SESSION_BOARD_NOT_ACTIVE');
        }

        if (sessionBoardId && sessionBoardId !== activeBoard.sessionBoardId) {
            throw new ConflictException('GAME_SESSION_BOARD_NOT_ACTIVE');
        }

        return activeBoard;
    }

    private buildSessionBoardResponseFromState(
        session: InFlightSessionState,
        boards: InFlightBoardState[],
        options: {
            targetBoard?: InFlightBoardState;
            previewOnly?: boolean;
            includeActiveSessionBoardId?: boolean;
            includeCurrentRoundFields?: boolean;
            requestedRoundFields?: {
                requestedDemoRound: number;
                requestedActualRound: number;
            };
        } = {},
    ): SessionBoardResponse {
        const activeBoard = boards.find((board) => !board.completed) ?? null;
        const board = options.targetBoard ?? activeBoard ?? boards[boards.length - 1];
        if (!board) {
            return this.buildCompletedSessionResponseFromState(session);
        }

        const isDemoRound = session.enableDemo && board.roundNumber <= session.totalDemoRounds;
        const isActualRound = !isDemoRound;
        const currentDemoRound = activeBoard
            ? session.enableDemo && activeBoard.roundNumber <= session.totalDemoRounds
                ? activeBoard.roundNumber
                : 0
            : 0;
        const currentActualRound = activeBoard
            ? session.enableDemo && activeBoard.roundNumber <= session.totalDemoRounds
                ? 0
                : activeBoard.roundNumber - session.totalDemoRounds
            : 0;
        const derivedRequestedRoundFields = options.requestedRoundFields ?? {
            requestedDemoRound: isDemoRound ? board.roundNumber : 0,
            requestedActualRound: isActualRound ? board.roundNumber - session.totalDemoRounds : 0,
        };

        return {
            sessionId: session.sessionId,
            stageId: session.stageId,
            status: 'ACTIVE',
            previewOnly: options.previewOnly ?? false,
            ...((options.includeActiveSessionBoardId ?? true)
                ? { activeSessionBoardId: activeBoard?.sessionBoardId ?? null }
                : {}),
            completedRounds: session.completedRounds,
            currentLevelId: board.levelId,
            totalDemoRounds: session.totalDemoRounds,
            totalActualRounds: session.totalActualRounds,
            ...((options.includeCurrentRoundFields ?? true)
                ? {
                      currentDemoRound,
                      currentActualRound,
                  }
                : {}),
            ...derivedRequestedRoundFields,
            isDemoRound,
            isActualRound,
            startTime:
                isActualRound && session.gameStartedAtMs
                    ? new Date(session.gameStartedAtMs).toISOString()
                    : undefined,
            endTime:
                isActualRound && session.gameEndedAtMs
                    ? new Date(session.gameEndedAtMs).toISOString()
                    : undefined,
            board: formatBlockFillBoard({
                sessionBoardId: board.sessionBoardId,
                board: {
                    id: board.boardId,
                    levelId: board.levelId,
                },
                boardShape: board.boardShape,
                version: board.version,
                paths: board.paths.map((path) => ({
                    color: path.color,
                    path: path.path,
                    completed: path.completed,
                })),
            }),
        };
    }

    private buildCompletedSessionResponseFromState(
        session: InFlightSessionState,
    ): SessionBoardResponse {
        return {
            sessionId: session.sessionId,
            stageId: session.stageId,
            status: 'COMPLETED',
            previewOnly: false,
            activeSessionBoardId: null,
            completedRounds: session.completedRounds,
            currentLevelId: null,
            totalDemoRounds: session.totalDemoRounds,
            totalActualRounds: session.totalActualRounds,
            currentDemoRound: 0,
            currentActualRound: 0,
            isDemoRound: false,
            isActualRound: false,
            startTime: session.gameStartedAtMs
                ? new Date(session.gameStartedAtMs).toISOString()
                : undefined,
            endTime: session.gameEndedAtMs
                ? new Date(session.gameEndedAtMs).toISOString()
                : undefined,
            board: null,
            finalScore: session.score,
        };
    }

    private calculateBoardScoreFromLevelName(levelName: string | null): number {
        const normalizedLevelName = levelName?.trim().toLowerCase() ?? '';
        return LEVEL_SCORE_WEIGHTS[normalizedLevelName] ?? GAME_END_BASE_SCORE;
    }

    private calculateGameEndScoreFromState(
        session: InFlightSessionState,
        endedAtMs: number,
    ): number {
        const accumulatedScore = session.score;
        if (!session.gameStartedAtMs || !session.gameEndedAtMs) {
            return accumulatedScore;
        }

        const timeTakenSeconds = Math.max(
            0,
            Math.floor((endedAtMs - session.gameStartedAtMs) / 1000),
        );
        const timeWindowSeconds = Math.max(
            0,
            Math.floor((session.gameEndedAtMs - session.gameStartedAtMs) / 1000),
        );
        const timeRemainingScore = Math.max(0, timeWindowSeconds - timeTakenSeconds);

        return accumulatedScore + timeRemainingScore;
    }

    private runAntiCheatOnFinalize(
        session: InFlightSessionState,
        boards: InFlightBoardState[],
    ): void {
        for (const board of boards) {
            if (board.submissions.length > 0) {
                const submitFlags = this.detectSubmitMoveFlags(board.submissions);
                this.saveCheatFlags(submitFlags, {
                    userId: session.userId,
                    sessionId: session.sessionId,
                    sessionBoardId: board.sessionBoardId,
                });
            }

            if (board.completedAt) {
                const endFlags = this.detectEndBoardFlagsFromState(board);
                this.saveCheatFlags(endFlags, {
                    userId: session.userId,
                    sessionId: session.sessionId,
                    sessionBoardId: board.sessionBoardId,
                });
            }
        }
    }

    private saveCheatFlags(
        flags: { flagType: number; evidence: object }[],
        ctx: { userId: string; sessionId: string; sessionBoardId: string },
    ): void {
        if (flags.length === 0) {
            return;
        }

        this.persistAndPublishCheatFlags(flags, ctx).catch((err: unknown) =>
            this.logger.error('[anti-cheat] fire-and-forget rejected', {
                err: err instanceof Error ? err.message : String(err),
                userId: ctx.userId,
                sessionId: ctx.sessionId,
                sessionBoardId: ctx.sessionBoardId,
            }),
        );
    }

    private async persistAndPublishCheatFlags(
        flags: { flagType: number; evidence: object }[],
        ctx: { userId: string; sessionId: string; sessionBoardId: string },
    ): Promise<void> {
        try {
            const createdFlags = await this.prisma.cheatFlag.createManyAndReturn({
                data: flags.map((flag) => ({
                    userId: ctx.userId,
                    sessionId: ctx.sessionId,
                    sessionBoardId: ctx.sessionBoardId,
                    flagType: flag.flagType,
                    evidence: flag.evidence,
                })),
                select: {
                    id: true,
                    userId: true,
                    flagType: true,
                    createdAt: true,
                },
            });

            await Promise.all(
                createdFlags.map((flag) =>
                    this.sns.publishCheatFlag({
                        referenceId: flag.id,
                        userId: flag.userId,
                        gameType: config.gameType,
                        flagType: flag.flagType,
                        createdAt: flag.createdAt.toISOString(),
                    }),
                ),
            );
        } catch (err) {
            this.logger.error(
                `[${ctx.userId}] Failed to save cheat flags: ${(err as Error).message}`,
            );
        }
    }

    private detectSubmitMoveFlags(
        submissions: InFlightSubmissionEvent[],
    ): { flagType: number; evidence: object }[] {
        const flags: { flagType: number; evidence: object }[] = [];
        const sorted = [...submissions].sort((a, b) => a.timeStamp.localeCompare(b.timeStamp));
        const allIntervals: {
            fromMoveId: string | null;
            toMoveId: string;
            from: string;
            to: string;
            ms: number;
        }[] = [];

        for (let index = 1; index < sorted.length; index += 1) {
            const prev = sorted[index - 1];
            const current = sorted[index];
            allIntervals.push({
                fromMoveId: prev.moveId,
                toMoveId: current.moveId,
                from: prev.timeStamp,
                to: current.timeStamp,
                ms: new Date(current.timeStamp).getTime() - new Date(prev.timeStamp).getTime(),
            });
        }

        const tooFast = allIntervals.filter(
            (interval) => interval.ms < ANTI_CHEAT_CONFIGS.CLICK_TOO_FAST_MS,
        );
        if (tooFast.length > 0) {
            flags.push({
                flagType: CHEAT_FLAG_TYPE.CLICK_TOO_FAST,
                evidence: {
                    thresholdMs: ANTI_CHEAT_CONFIGS.CLICK_TOO_FAST_MS,
                    violations: tooFast,
                },
            });
        }

        if (allIntervals.length >= ANTI_CHEAT_CONFIGS.UNIFORM_TIMING_MIN_INTERVALS) {
            const values = allIntervals.map((interval) => interval.ms);
            const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
            const stddev = Math.sqrt(
                values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length,
            );
            const cv = mean > 0 ? stddev / mean : 0;

            if (cv < ANTI_CHEAT_CONFIGS.UNIFORM_TIMING_CV_THRESHOLD) {
                flags.push({
                    flagType: CHEAT_FLAG_TYPE.UNIFORM_TIMING,
                    evidence: {
                        intervals: allIntervals,
                        mean: Math.round(mean),
                        stddev: Math.round(stddev),
                        cv: +cv.toFixed(4),
                    },
                });
            }
        }

        return flags;
    }

    private detectEndBoardFlagsFromState(
        board: InFlightBoardState,
    ): { flagType: number; evidence: object }[] {
        const flags: { flagType: number; evidence: object }[] = [];
        const completedCount = board.paths.filter((path) => path.completed).length;
        const total = board.paths.length;

        if (completedCount < total) {
            flags.push({
                flagType: CHEAT_FLAG_TYPE.REMAINING_MOVES_AT_END,
                evidence: {
                    completedCount,
                    totalCount: total,
                },
            });
        }

        if (board.completedAt && board.startedAtMs !== null) {
            const durationMs = new Date(board.completedAt).getTime() - board.startedAtMs;
            const thresholdMs = total * ANTI_CHEAT_CONFIGS.IMPOSSIBLE_SOLVE_MS_PER_ARROW;
            if (completedCount > 0 && durationMs < thresholdMs) {
                flags.push({
                    flagType: CHEAT_FLAG_TYPE.IMPOSSIBLE_SOLVE_TIME,
                    evidence: {
                        durationMs,
                        thresholdMs,
                        pathCount: total,
                        completedCount,
                    },
                });
            }
        }

        return flags;
    }
}

function shuffle<T>(items: T[]): T[] {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }

    return copy;
}
