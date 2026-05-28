import { GAME_SESSION_STATUS, ANTI_CHEAT_CONFIGS, CHEAT_FLAG_TYPE } from '@common/constants';
import { PrismaService } from '@common/prisma/prisma.service';
import { config } from '@config';
import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma';
import { TerminalError } from '@restatedev/restate-sdk';

import { SnsService } from '../aws/sns.service';

import { GameExpiryService } from './game-expiry.service';
import { InFlightBoard, InFlightMove, InFlightSession } from './game-restate-state.types';
import { formatBoardResponseFromState, BoardResponse } from './utils/board-formatter';
import { replayMoves, MoveInput } from './utils/move-validator';
import { calculateRoundScore, calculateTimeBonus } from './utils/score.util';
import { countCorrectPieces, isSolved } from './utils/shuffle.util';

// ── Response shapes ───────────────────────────────────────────────────────────

export type { BoardResponse };

export interface ScoreboardRound {
    roundNumber: number;
    score: number | null;
    startedAt: string;
    endedAt: string | null;
}

export interface Scoreboard {
    totalScore: number;
    timeBonus: number;
    rounds: ScoreboardRound[];
}

export interface GameResponse {
    status: number;
    sessionId: string | null;
    startedAt: string | null;
    expiryAt: string | null;
    totalRounds: number;
    board: BoardResponse | null;
    scoreboard: Scoreboard;
}

export type StartGameResponse = GameResponse;

export interface EndBoardResponse {
    gameOver: boolean;
    roundScore: number;
}

const TERMINAL_GAME_SESSION_STATUSES = [
    GAME_SESSION_STATUS.ENDED,
    GAME_SESSION_STATUS.EXPIRED,
    GAME_SESSION_STATUS.MANUALLY_ENDED,
] as const;
const INT32_MIN = -2_147_483_648;
const INT32_MAX = 2_147_483_647;

// ── Raw DB type for pickBoardWithPieces ───────────────────────────────────────

export interface PickedBoard {
    boardId: string;
    levelId: string;
    gridX: number;
    gridY: number;
    fullImageUrl: string;
    pieces: number[];
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class GameService {
    private readonly logger = new Logger(GameService.name);

    /**
     * Create a new instance.
     *
     * @param {PrismaService} prisma - prisma service value.
     * @param {GameExpiryService} expiry - game expiry service value.
     * @param {SnsService} sns - sns service value.
     */
    constructor(
        private readonly prisma: PrismaService,
        private readonly expiry: GameExpiryService,
        private readonly sns: SnsService,
    ) {}

    // ── DB read helpers ───────────────────────────────────────────────────────

    /**
     * Fetch the active stage configuration for a stage.
     *
     * @param {string} stageId - stage id value.
     *
     * @returns {Promise<object>} The asynchronous result.
     */
    async fetchStageConfig(stageId: string) {
        const stageConfig = await this.prisma.stageConfig.findFirst({
            where: { stageId, deletedAt: null },
            include: {
                levels: {
                    where: { deletedAt: null },
                    orderBy: { order: 'asc' },
                    include: { level: { select: { id: true, name: true } } },
                },
            },
        });
        if (!stageConfig || !stageConfig.isEnabled) {
            throw new TerminalError('STAGE_CONFIG_NOT_FOUND', { errorCode: 404 });
        }
        if (stageConfig.levels.length === 0) {
            throw new TerminalError('STAGE_CONFIG_HAS_NO_LEVELS', { errorCode: 422 });
        }
        return stageConfig;
    }

    /**
     * Fetch a finalized session for a user and stage.
     *
     * @param {string} userId - user id value.
     * @param {string} stageId - stage id value.
     *
     * @returns {Promise<object | null>} The asynchronous result.
     */
    async fetchFinalizedSession(userId: string, stageId: string) {
        return this.prisma.gameSession.findFirst({
            where: {
                userId,
                stageId,
                status: { in: [...TERMINAL_GAME_SESSION_STATUSES] },
            },
            include: {
                sessionBoards: { where: { deletedAt: null }, orderBy: { roundNumber: 'asc' } },
                stageConfigSnapshot: { include: { levelConfigs: true } },
            },
        });
    }

    /**
     * Fetch an open DB session when Restate state is unavailable.
     *
     * @param {string} userId - user id value.
     * @param {string} stageId - stage id value.
     *
     * @returns {Promise<{ id: string; status: number } | null>} The asynchronous result.
     */
    async fetchOpenSession(userId: string, stageId: string) {
        return this.prisma.gameSession.findFirst({
            where: {
                userId,
                stageId,
                status: {
                    in: [GAME_SESSION_STATUS.STARTED, GAME_SESSION_STATUS.RESULT_PROCESSING],
                },
            },
            select: { id: true, status: true },
        });
    }

    // ── DB write helpers ──────────────────────────────────────────────────────

    /**
     * Create the DB session shell and stage config snapshot for a game.
     *
     * @param {string} userId - user id value.
     * @param {string} stageId - stage id value.
     * @param {Awaited<ReturnType<GameService['fetchStageConfig']>>} stageConfig - stage config value.
     *
     * @returns {Promise<{ sessionId: string; expiryAtMs: number; startedAtMs: number }>} The asynchronous result.
     */
    async createGameSession(
        userId: string,
        stageId: string,
        stageConfig: Awaited<ReturnType<typeof this.fetchStageConfig>>,
    ): Promise<{ sessionId: string; expiryAtMs: number; startedAtMs: number }> {
        const now = new Date();
        const expiryAt = new Date(now.getTime() + stageConfig.timeLimit * 1_000);

        const existing = await this.prisma.gameSession.findFirst({
            where: { userId, stageId, status: GAME_SESSION_STATUS.STARTED },
            select: { id: true, expiryAt: true, startedAt: true },
        });
        if (existing) {
            return {
                sessionId: existing.id,
                expiryAtMs: existing.expiryAt.getTime(),
                startedAtMs: existing.startedAt.getTime(),
            };
        }

        const session = await this.prisma.gameSession.create({
            data: {
                userId,
                stageId,
                expiryAt,
                startedAt: now,
                status: GAME_SESSION_STATUS.STARTED,
                stageConfigSnapshot: {
                    create: {
                        stageId,
                        timeLimit: stageConfig.timeLimit,
                        maxTimeBonus: stageConfig.maxTimeBonus,
                        enableNumbers: stageConfig.enableNumbers,
                        levelConfigs: {
                            createMany: {
                                data: stageConfig.levels.map((level) => ({
                                    levelId: level.levelId,
                                    levelName: level.level.name,
                                    boardCount: level.boardCount,
                                    displayTime: level.displayTime,
                                    order: level.order,
                                    maxScore: level.maxScore,
                                })),
                            },
                        },
                    },
                },
            },
            select: { id: true, expiryAt: true, startedAt: true },
        });

        return {
            sessionId: session.id,
            expiryAtMs: session.expiryAt.getTime(),
            startedAtMs: session.startedAt.getTime(),
        };
    }

    /**
     * Schedule durable Restate expiry handlers for a session.
     *
     * @param {string} sessionId - session id value.
     * @param {number} expiryAtMs - expiry at ms value.
     * @param {string} userId - user id value.
     * @param {string} stageId - stage id value.
     *
     * @returns {Promise<void>} Resolves when handlers are scheduled.
     */
    async scheduleExpiry(
        sessionId: string,
        expiryAtMs: number,
        userId: string,
        stageId: string,
    ): Promise<void> {
        await this.expiry.schedule(sessionId, expiryAtMs, userId, stageId);
    }

    /**
     * Return demo board ids already snapshotted for the user and stage.
     *
     * @param {string} userId - user id value.
     * @param {string} stageId - stage id value.
     *
     * @returns {Promise<string[]>} The asynchronous result.
     */
    async fetchDemoBoardIds(userId: string, stageId: string): Promise<string[]> {
        const rows = await this.prisma.userStageDemoBoard.findMany({
            where: { userId, stageId },
            select: { boardId: true },
        });
        return rows.map((r) => r.boardId);
    }

    /**
     * Pick a random board for the given level in one raw SQL round trip.
     * Excludes previously used board IDs.
     *
     * @param {string} levelId - level id value.
     * @param {string[]} excludeIds - board ids to exclude.
     *
     * @returns {Promise<PickedBoard>} The asynchronous result.
     */
    async pickBoardWithPieces(levelId: string, excludeIds: string[]): Promise<PickedBoard> {
        type RawRow = {
            id: string;
            level_id: string;
            grid_x: number;
            grid_y: number;
            full_image_url: string;
            pieces: number[];
        };

        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (excludeIds.some((id) => !UUID_RE.test(id))) {
            throw new TerminalError('INVALID_EXCLUDE_BOARD_IDS', { errorCode: 500 });
        }
        const excludeClause =
            excludeIds.length > 0
                ? Prisma.sql`AND b.id NOT IN (${Prisma.raw(excludeIds.map((id) => `'${id}'`).join(','))})`
                : Prisma.empty;

        const boardCount = await this.prisma.board.count({
            where: {
                levelId,
                deletedAt: null,
                ...(excludeIds.length > 0 && { id: { notIn: excludeIds } }),
            },
        });
        if (boardCount === 0) {
            throw new TerminalError('NO_BOARDS_AVAILABLE_FOR_LEVEL', { errorCode: 404 });
        }
        const offset = Math.floor(Math.random() * boardCount);

        const buildQuery = (queryOffset: number) => Prisma.sql`
            SELECT
                b.id,
                b.level_id,
                b.grid_x,
                b.grid_y,
                b.full_image_url,
                bs.pieces
            FROM boards b
            CROSS JOIN LATERAL (
                SELECT pieces
                FROM board_shuffles bs2
                WHERE bs2.board_id = b.id
                  AND bs2.deleted_at IS NULL
                OFFSET floor(random() * (
                    SELECT count(*) FROM board_shuffles bs3
                    WHERE bs3.board_id = b.id AND bs3.deleted_at IS NULL
                ))
                LIMIT 1
            ) bs
            WHERE b.level_id = ${levelId}
              AND b.deleted_at IS NULL
              ${excludeClause}
            LIMIT 1 OFFSET ${queryOffset}
        `;

        let rows = await this.prisma.$queryRaw<RawRow[]>(buildQuery(offset));
        if (rows.length === 0) {
            // Concurrent delete narrowed the pool — fall back to offset 0
            rows = await this.prisma.$queryRaw<RawRow[]>(buildQuery(0));
        }

        if (rows.length === 0) {
            throw new TerminalError('NO_BOARDS_AVAILABLE_FOR_LEVEL', { errorCode: 404 });
        }
        const row = rows[0];
        return {
            boardId: row.id,
            levelId: row.level_id,
            gridX: row.grid_x,
            gridY: row.grid_y,
            fullImageUrl: row.full_image_url,
            pieces: row.pieces,
        };
    }

    /**
     * Build an InFlightBoard from a DB-picked board.
     *
     * @param {PickedBoard} picked - picked board value.
     * @param {number} roundNumber - round number value.
     * @param {number} displayTime - display time value.
     * @param {boolean} enableNumbers - whether FE should show tile numbers.
     *
     * @returns {InFlightBoard} The in-flight board state.
     */
    buildInFlightBoard(
        picked: PickedBoard,
        roundNumber: number,
        displayTime: number,
        enableNumbers: boolean,
    ): InFlightBoard {
        const now = new Date().toISOString();
        return {
            id: crypto.randomUUID(),
            boardId: picked.boardId,
            levelId: picked.levelId,
            gridX: picked.gridX,
            gridY: picked.gridY,
            fullImageUrl: picked.fullImageUrl,
            displayTime,
            enableNumbers,
            roundNumber,
            startedAt: now,
            endedAt: null,
            score: null,
            pieces: [...picked.pieces],
            initialPieces: [...picked.pieces],
            moves: [],
        };
    }

    // ── Finalization ──────────────────────────────────────────────────────────

    /**
     * Commit the full in-flight game to the DB in a single transaction.
     * Called from within ctx.run() so the @Transactional interceptor is not
     * active — we use prisma.$transaction() directly.
     *
     * @param {InFlightSession} session - session state value.
     * @param {InFlightBoard[]} boards - board state values.
     * @param {Date} now - current date value.
     * @param {number} hintStatus - fallback final status value.
     *
     * @returns {Promise<{ status: number; totalScore: number; timeBonus: number }>} The asynchronous result.
     */
    async finalizeAndCommit(
        session: InFlightSession,
        boards: InFlightBoard[],
        now: Date,
        hintStatus: number,
    ): Promise<{ status: number; totalScore: number; timeBonus: number }> {
        const maxScoreByLevel = new Map(
            session.levelConfigs.map((lc) => [lc.levelId, lc.maxScore]),
        );

        const scoredBoards: InFlightBoard[] = boards.map((board) => {
            if (board.score !== null) {
                return board;
            }
            const correct = countCorrectPieces(board.pieces);
            const total = board.pieces.length;
            const maxScore = maxScoreByLevel.get(board.levelId) ?? 1000;
            return {
                ...board,
                score: calculateRoundScore(isSolved(board.pieces), correct, total, maxScore),
                endedAt: board.endedAt ?? now.toISOString(),
            };
        });

        const allRoundsDone =
            scoredBoards.filter((b) => b.endedAt !== null).length >= session.totalRounds;
        const allSolved = allRoundsDone && scoredBoards.every((b) => isSolved(b.pieces));

        const finalStatus =
            hintStatus === GAME_SESSION_STATUS.EXPIRED
                ? GAME_SESSION_STATUS.EXPIRED
                : allSolved
                  ? GAME_SESSION_STATUS.ENDED
                  : GAME_SESSION_STATUS.MANUALLY_ENDED;

        const bonusReferenceMs = session.lastMoveAt
            ? new Date(session.lastMoveAt).getTime()
            : now.getTime();
        const timeBonus =
            finalStatus === GAME_SESSION_STATUS.ENDED
                ? calculateTimeBonus(
                      session.expiryAtMs - bonusReferenceMs,
                      session.timeLimitSeconds,
                      session.maxTimeBonus ?? 1000,
                  )
                : 0;

        const roundsScore = scoredBoards.reduce((sum, b) => sum + (b.score ?? 0), 0);
        const totalScore = roundsScore + timeBonus;
        this.assertPersistableInt('gameSession.status', finalStatus);
        this.assertPersistableInt('gameSession.score', totalScore);
        this.assertPersistableInt('gameSession.timeBonus', timeBonus);
        this.assertPersistableSnapshotInts(scoredBoards);
        let existingFinalizeResult: {
            status: number;
            totalScore: number;
            timeBonus: number;
        } | null = null;

        await this.prisma.$transaction(async (tx) => {
            const existingSession = await tx.gameSession.findUnique({
                where: { id: session.sessionId },
                select: { status: true, score: true, timeBonus: true },
            });
            if (
                existingSession &&
                TERMINAL_GAME_SESSION_STATUSES.includes(
                    existingSession.status as (typeof TERMINAL_GAME_SESSION_STATUSES)[number],
                )
            ) {
                existingFinalizeResult = {
                    status: existingSession.status,
                    totalScore: existingSession.score ?? 0,
                    timeBonus: existingSession.timeBonus ?? 0,
                };
                return;
            }

            await tx.gameSessionBoard.createMany({
                data: scoredBoards.map((board) => ({
                    id: board.id,
                    sessionId: session.sessionId,
                    roundNumber: board.roundNumber,
                    boardId: board.boardId,
                    levelId: board.levelId,
                    gridX: board.gridX,
                    gridY: board.gridY,
                    fullImageUrl: board.fullImageUrl,
                    score: board.score,
                    initialPieces: board.initialPieces,
                    startedAt: new Date(board.startedAt),
                    endedAt: board.endedAt ? new Date(board.endedAt) : now,
                })),
                skipDuplicates: true,
            });

            if (scoredBoards.some((b) => b.moves.length > 0)) {
                await tx.gameMove.createMany({
                    data: scoredBoards.flatMap((board) =>
                        board.moves.map((move) => ({
                            id: move.id,
                            sessionId: session.sessionId,
                            sessionBoardId: board.id,
                            clientMoveId: move.clientMoveId,
                            fromSlot: move.fromSlot,
                            toSlot: move.toSlot,
                            pieceIndex: move.pieceIndex ?? -1,
                            success: move.success,
                            clickedAt: new Date(move.clickedAt),
                        })),
                    ),
                    skipDuplicates: true,
                });
            }

            await tx.gameSession.update({
                where: { id: session.sessionId },
                data: { status: finalStatus, endedAt: now, score: totalScore, timeBonus },
            });
        });

        if (existingFinalizeResult) {
            return existingFinalizeResult;
        }

        await this.verifyFinalizedSnapshotCounts(
            session.sessionId,
            scoredBoards.length,
            scoredBoards.reduce((sum, b) => sum + b.moves.length, 0),
        );

        this.runAntiCheatOnFinalize(session, scoredBoards);

        this.logger.log(
            `Session ${session.sessionId} finalized: status=${finalStatus} score=${totalScore} timeBonus=${timeBonus}`,
        );

        return { status: finalStatus, totalScore, timeBonus };
    }

    /**
     * Assert that a numeric value fits Prisma integer storage.
     *
     * @param {string} field - field name value.
     * @param {number | null | undefined} value - numeric value.
     *
     * @returns {void} Resolves when the value is valid.
     */
    private assertPersistableInt(field: string, value: number | null | undefined): void {
        if (value === null || value === undefined) {
            return;
        }

        if (!Number.isInteger(value) || value < INT32_MIN || value > INT32_MAX) {
            this.logger.warn(`Rejected out-of-range integer for ${field}: ${String(value)}`);
            throw new TerminalError('INVALID_INTEGER_RANGE', { errorCode: 400 });
        }
    }

    /**
     * Assert that board and move snapshot integers fit Prisma integer storage.
     *
     * @param {InFlightBoard[]} boards - board values.
     *
     * @returns {void} Resolves when all integers are valid.
     */
    private assertPersistableSnapshotInts(boards: InFlightBoard[]): void {
        for (const board of boards) {
            this.assertPersistableInt('gameSessionBoard.roundNumber', board.roundNumber);
            this.assertPersistableInt('gameSessionBoard.gridX', board.gridX);
            this.assertPersistableInt('gameSessionBoard.gridY', board.gridY);
            this.assertPersistableInt('gameSessionBoard.score', board.score);

            for (const piece of board.initialPieces) {
                this.assertPersistableInt('gameSessionBoard.initialPieces[]', piece);
            }

            for (const piece of board.pieces) {
                this.assertPersistableInt('gameSessionBoard.pieces[]', piece);
            }

            for (const move of board.moves) {
                this.assertPersistableInt('gameMove.fromSlot', move.fromSlot);
                this.assertPersistableInt('gameMove.toSlot', move.toSlot);
                this.assertPersistableInt('gameMove.pieceIndex', move.pieceIndex);
            }
        }
    }

    /**
     * Verify finalized snapshot row counts after an idempotent commit.
     *
     * @param {string} sessionId - session id value.
     * @param {number} expectedBoards - expected board count value.
     * @param {number} expectedMoves - expected move count value.
     *
     * @returns {Promise<void>} Resolves when verification completes.
     */
    private async verifyFinalizedSnapshotCounts(
        sessionId: string,
        expectedBoards: number,
        expectedMoves: number,
    ): Promise<void> {
        const [actualBoards, actualMoves] = await Promise.all([
            this.prisma.gameSessionBoard.count({ where: { sessionId, deletedAt: null } }),
            this.prisma.gameMove.count({ where: { sessionId } }),
        ]);

        if (actualBoards !== expectedBoards || actualMoves !== expectedMoves) {
            this.logger.error(`Session ${sessionId} finalized snapshot count mismatch`, {
                expected: { boards: expectedBoards, moves: expectedMoves },
                actual: { boards: actualBoards, moves: actualMoves },
            });
            return;
        }

        this.logger.debug(
            `Session ${sessionId} finalized snapshot counts verified: boards=${actualBoards} moves=${actualMoves}`,
        );
    }

    /**
     * Expire an open DB session when its Restate state is unavailable.
     *
     * @param {string} sessionId - session id value.
     *
     * @returns {Promise<boolean>} Whether an open session was expired.
     */
    async expireOpenSessionWithoutRestateState(sessionId: string): Promise<boolean> {
        const session = await this.prisma.gameSession.findUnique({
            where: { id: sessionId },
            select: { status: true },
        });
        if (!session) {
            return false;
        }
        if (
            session.status === GAME_SESSION_STATUS.ENDED ||
            session.status === GAME_SESSION_STATUS.EXPIRED ||
            session.status === GAME_SESSION_STATUS.MANUALLY_ENDED
        ) {
            return false;
        }

        await this.prisma.gameSession.update({
            where: { id: sessionId },
            data: {
                status: GAME_SESSION_STATUS.EXPIRED,
                endedAt: new Date(),
                score: 0,
                timeBonus: 0,
            },
        });
        this.logger.warn(
            `Session ${sessionId} expired without Restate state; score defaulted to 0`,
        );
        return true;
    }

    /**
     * Build a finalize response without writing to the database.
     *
     * @param {InFlightSession} session - session state value.
     * @param {InFlightBoard[]} boards - board state values.
     * @param {Date} now - current date value.
     * @param {number} hintStatus - fallback final status value.
     *
     * @returns {{ status: number; totalScore: number; timeBonus: number }} The finalize result.
     */
    buildFinalizeResult(
        session: InFlightSession,
        boards: InFlightBoard[],
        now: Date,
        hintStatus: number,
    ): { status: number; totalScore: number; timeBonus: number } {
        const allRoundsDone =
            boards.filter((b) => b.endedAt !== null).length >= session.totalRounds;
        const allSolved = allRoundsDone && boards.every((b) => isSolved(b.pieces));
        const finalStatus =
            hintStatus === GAME_SESSION_STATUS.EXPIRED
                ? GAME_SESSION_STATUS.EXPIRED
                : allSolved
                  ? GAME_SESSION_STATUS.ENDED
                  : GAME_SESSION_STATUS.MANUALLY_ENDED;
        const bonusReferenceMs2 = session.lastMoveAt
            ? new Date(session.lastMoveAt).getTime()
            : now.getTime();
        const timeBonus =
            finalStatus === GAME_SESSION_STATUS.ENDED
                ? calculateTimeBonus(
                      session.expiryAtMs - bonusReferenceMs2,
                      session.timeLimitSeconds,
                      session.maxTimeBonus ?? 1000,
                  )
                : 0;
        const totalScore = boards.reduce((sum, b) => sum + (b.score ?? 0), 0) + timeBonus;
        return { status: finalStatus, totalScore, timeBonus };
    }

    // ── Response builders ─────────────────────────────────────────────────────

    /**
     * Format an in-flight board as a client board response.
     *
     * @param {InFlightBoard} board - board state value.
     *
     * @returns {BoardResponse} The board response.
     */
    formatBoardResponseFromState(board: InFlightBoard): BoardResponse {
        return formatBoardResponseFromState(board);
    }

    /**
     * Build a game response from Restate in-flight state.
     *
     * @param {InFlightSession} session - session state value.
     * @param {InFlightBoard[]} boards - board state values.
     *
     * @returns {GameResponse} The game response.
     */
    buildGameResponseFromState(session: InFlightSession, boards: InFlightBoard[]): GameResponse {
        const currentBoard = boards.find((b) => b.roundNumber === session.currentRound);
        const rounds: ScoreboardRound[] = boards
            .filter((b) => b.endedAt !== null)
            .map((b) => ({
                roundNumber: b.roundNumber,
                score: b.score,
                startedAt: b.startedAt,
                endedAt: b.endedAt,
            }));
        const totalScore = rounds.reduce((sum, r) => sum + (r.score ?? 0), 0);

        return {
            status: session.status,
            sessionId: session.sessionId,
            startedAt: session.startedAt,
            expiryAt: new Date(session.expiryAtMs).toISOString(),
            totalRounds: session.totalRounds,
            board: currentBoard ? this.formatBoardResponseFromState(currentBoard) : null,
            scoreboard: { totalScore, timeBonus: 0, rounds },
        };
    }

    /**
     * Build a game response from a finalized DB session.
     *
     * @param {NonNullable<Awaited<ReturnType<GameService['fetchFinalizedSession']>>>} dbSession - db session value.
     *
     * @returns {GameResponse} The game response.
     */
    buildGameResponseFromDb(
        dbSession: NonNullable<Awaited<ReturnType<typeof this.fetchFinalizedSession>>>,
    ): GameResponse {
        const rounds: ScoreboardRound[] = dbSession.sessionBoards.map((board) => ({
            roundNumber: board.roundNumber,
            score: board.score,
            startedAt: board.startedAt.toISOString(),
            endedAt: board.endedAt?.toISOString() ?? null,
        }));
        const totalScore =
            dbSession.score ??
            rounds.reduce((sum, r) => sum + (r.score ?? 0), 0) + (dbSession.timeBonus ?? 0);
        return {
            status: dbSession.status,
            sessionId: dbSession.id,
            startedAt: dbSession.startedAt?.toISOString() ?? null,
            expiryAt: dbSession.expiryAt?.toISOString() ?? null,
            totalRounds:
                dbSession.stageConfigSnapshot?.levelConfigs.reduce(
                    (sum, l) => sum + l.boardCount,
                    0,
                ) ?? dbSession.sessionBoards.length,
            board: null,
            scoreboard: { totalScore, timeBonus: dbSession.timeBonus ?? 0, rounds },
        };
    }

    // ── Move replay ───────────────────────────────────────────────────────────

    /**
     * Replay moves against a board state copy.
     *
     * @param {MoveInput[]} moves - move values.
     * @param {InFlightBoard} board - board state value.
     *
     * @returns {ReturnType<typeof replayMoves>} The replay result.
     */
    replayMovesAgainstState(moves: MoveInput[], board: InFlightBoard) {
        return replayMoves(moves, board.pieces, board.gridX);
    }

    // ── Pure utilities ────────────────────────────────────────────────────────

    /**
     * Calculate score for a single board.
     *
     * @param {boolean} completed - whether the puzzle was fully solved.
     * @param {number} correctPieces - number of correctly placed pieces.
     * @param {number} totalPieces - total pieces on the board.
     * @param {number} maxScore - maximum score awarded for a perfect solve (admin-configured per level).
     *
     * @returns {number} The round score.
     */
    calculateRoundScore(
        completed: boolean,
        correctPieces: number,
        totalPieces: number,
        maxScore: number,
    ): number {
        return calculateRoundScore(completed, correctPieces, totalPieces, maxScore);
    }

    /**
     * Resolve the level id for a round using the stage level config.
     *
     * @param {number} roundNumber - round number value.
     * @param {{ levelId: string; boardCount: number; order: number }[]} levelConfigs - level config values.
     *
     * @returns {string} The level id.
     */
    getLevelForRound(
        roundNumber: number,
        levelConfigs: { levelId: string; boardCount: number; order: number }[],
    ): string {
        const sorted = [...levelConfigs].sort((a, b) => a.order - b.order);
        let remaining = roundNumber;
        for (const lc of sorted) {
            if (remaining <= lc.boardCount) {
                return lc.levelId;
            }
            remaining -= lc.boardCount;
        }
        throw new TerminalError('ROUND_NUMBER_EXCEEDS_TOTAL_ROUNDS', { errorCode: 422 });
    }

    // ── Anti-cheat ────────────────────────────────────────────────────────────

    /**
     * Run anti-cheat checks after finalization.
     *
     * @param {InFlightSession} session - session state value.
     * @param {InFlightBoard[]} boards - board state values.
     */
    private runAntiCheatOnFinalize(session: InFlightSession, boards: InFlightBoard[]): void {
        for (const board of boards) {
            if (board.moves.length > 0) {
                const moveInputs: MoveInput[] = board.moves.map((move: InFlightMove) => ({
                    slot: move.fromSlot,
                    clickedAt: new Date(move.clickedAt),
                    clientMoveId: move.clientMoveId,
                }));
                const submitFlags = this.detectSubmitMoveFlags(
                    moveInputs,
                    board.moves.map((move) => move.id),
                );
                this.saveCheatFlags(submitFlags, {
                    userId: session.userId,
                    sessionId: session.sessionId,
                    sessionBoardId: board.id,
                });
            }

            if (board.endedAt) {
                const endFlags = this.detectEndBoardFlagsFromState(board, session.status);
                this.saveCheatFlags(endFlags, {
                    userId: session.userId,
                    sessionId: session.sessionId,
                    sessionBoardId: board.id,
                });
            }
        }
    }

    /**
     * Save anti-cheat flags.
     *
     * @param {{ flagType: number; evidence: object }[]} flags - flag values.
     * @param {{ userId: string; sessionId: string; sessionBoardId: string }} ctx - cheat flag context value.
     */
    private saveCheatFlags(
        flags: { flagType: number; evidence: object }[],
        ctx: { userId: string; sessionId: string; sessionBoardId: string },
    ): void {
        if (flags.length === 0) {
            return;
        }
        this.persistAndPublishCheatFlags(flags, ctx).catch((err: unknown) =>
            this.logger.error('[anti-cheat] fire-and-forget rejected', {
                err,
                userId: ctx.userId,
                sessionId: ctx.sessionId,
                sessionBoardId: ctx.sessionBoardId,
            }),
        );
    }

    /**
     * Persist anti-cheat flags, then publish each created row to SNS.
     *
     * @param {{ flagType: number; evidence: object }[]} flags - flag values.
     * @param {{ userId: string; sessionId: string; sessionBoardId: string }} ctx - cheat flag context value.
     */
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

    /**
     * Detect anti-cheat flags from submitted moves.
     *
     * @param {MoveInput[]} moves - move values.
     * @param {string[]} moveIds - move id values.
     *
     * @returns {{ flagType: number; evidence: object }[]} The detected flags.
     */
    private detectSubmitMoveFlags(
        moves: MoveInput[],
        moveIds: string[],
    ): { flagType: number; evidence: object }[] {
        const flags: { flagType: number; evidence: object }[] = [];
        const timestamps = moves.map((move) => move.clickedAt.getTime());
        const allIntervals: {
            fromMoveId: string | null;
            toMoveId: string;
            from: string;
            to: string;
            ms: number;
        }[] = [];

        for (let i = 1; i < moves.length; i++) {
            allIntervals.push({
                fromMoveId: moveIds[i - 1],
                toMoveId: moveIds[i],
                from: moves[i - 1].clickedAt.toISOString(),
                to: moves[i].clickedAt.toISOString(),
                ms: timestamps[i] - timestamps[i - 1],
            });
        }

        const tooFast = allIntervals.filter((iv) => iv.ms < ANTI_CHEAT_CONFIGS.CLICK_TOO_FAST_MS);
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
            const vals = allIntervals.map((iv) => iv.ms);
            const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
            const stddev = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);
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

    /**
     * Detect anti-cheat flags from end-board state.
     *
     * @param {InFlightBoard} board - board state value.
     * @param {number} sessionStatus - in-flight session status at finalization.
     *
     * @returns {{ flagType: number; evidence: object }[]} The detected flags.
     */
    private detectEndBoardFlagsFromState(
        board: InFlightBoard,
        sessionStatus: number,
    ): { flagType: number; evidence: object }[] {
        const flags: { flagType: number; evidence: object }[] = [];
        const totalPieces = board.pieces.length;
        const correctPieces = countCorrectPieces(board.pieces);

        // REMAINING_PIECES_AT_END: endBoard called when puzzle isn't solved
        if (sessionStatus === GAME_SESSION_STATUS.STARTED && !isSolved(board.pieces)) {
            flags.push({
                flagType: CHEAT_FLAG_TYPE.REMAINING_PIECES_AT_END,
                evidence: {
                    correctPieces,
                    totalPieces,
                    remainingPieces: totalPieces - correctPieces,
                },
            });
        }

        if (board.endedAt) {
            const durationMs =
                new Date(board.endedAt).getTime() - new Date(board.startedAt).getTime();
            const thresholdMs = totalPieces * ANTI_CHEAT_CONFIGS.IMPOSSIBLE_SOLVE_MS_PER_PIECE;
            if (isSolved(board.pieces) && durationMs < thresholdMs) {
                flags.push({
                    flagType: CHEAT_FLAG_TYPE.IMPOSSIBLE_SOLVE_TIME,
                    evidence: { durationMs, thresholdMs, totalPieces },
                });
            }
        }

        return flags;
    }
}
