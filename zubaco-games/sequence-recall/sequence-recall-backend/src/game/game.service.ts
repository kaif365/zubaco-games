import * as crypto from 'crypto';

import {
    GAME_SESSION_STATUS,
    TERMINAL_GAME_SESSION_STATUSES,
    WRONG_MOVE_HANDLING,
} from '@common/constants';
import { PrismaService } from '@common/prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';

import { GameAntiCheatService } from './game-anti-cheat.service';
import { GameExpiryService } from './game-expiry.service';
import { InFlightInput, InFlightSession } from './game-restate-state.types';
import type { SessionConfig } from './game-restate-state.types';
import { throwTerminalError } from './restate-errors';

// ── Config shape returned by fetchStageConfig ──────────────────────────────────

export interface StageConfig {
    timeLimit: number;
    minSequence: number;
    maxSequence: number;
    enableDemo: boolean;
    demoMinSequence: number;
    demoMaxSequence: number;
    flashDelay: number;
    levelDelay: number;
    bonusTimeRatio: number;
    scorePerClick: number;
    cellCount: number;
    wrongMoveHandling: number;
}

// ── Response shapes ────────────────────────────────────────────────────────────

export interface StartGameResponse {
    sessionId: string;
    serverSeed: string;
    config: SessionConfig;
    endTime: string | null;
    isResumed: boolean;
    currentRound: number;
    currentActualRound: number;
    roundProgress: number;
    completedRounds: number;
    successfulMoves: number;
    status: number;
    sequence: number[];
    flashDelay: number;
    levelDelay: number;
    startedAtMs: number;
}

@Injectable()
export class GameService {
    private readonly logger = new Logger(GameService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly expiry: GameExpiryService,
        private readonly antiCheat: GameAntiCheatService,
    ) {}

    // ── DB read helpers ────────────────────────────────────────────────────────

    /**
     * Load the game configuration for a stage. Used by startGame handler.
     *
     * @param {string} stageId - stage id value.
     *
     * @returns {Promise<StageConfig>} The stage configuration.
     */
    async fetchStageConfig(stageId: string): Promise<StageConfig> {
        const config = await this.prisma.gameConfiguration.findFirst({
            where: { stageId, deletedAt: null },
        });
        if (!config) {
            throwTerminalError('STAGE_CONFIG_NOT_FOUND', 404);
        }

        return {
            timeLimit: config.timeLimit,
            minSequence: config.minSequence,
            maxSequence: config.maxSequence,
            enableDemo: config.enableDemo,
            demoMinSequence: config.demoMinSequence,
            demoMaxSequence: config.demoMaxSequence,
            flashDelay: config.flashDelay,
            levelDelay: config.levelDelay,
            bonusTimeRatio: config.bonusTimeRatio,
            scorePerClick: config.scorePerClick,
            cellCount: config.cellCount,
            wrongMoveHandling: config.wrongMoveHandling,
        };
    }

    /**
     * Return a finalized (COMPLETED or EXPIRED) session from DB.
     * Used by getStatus handler as fallback when Restate state is cleared.
     *
     * @param {string} userId - user id value.
     * @param {string} stageId - stage id value.
     *
     * @returns {Promise<object | null>} DB session or null.
     */
    async fetchFinalizedSession(userId: string, stageId: string) {
        return this.prisma.gameSession.findFirst({
            where: {
                userId,
                stageId,
                status: { in: [...TERMINAL_GAME_SESSION_STATUSES] },
                deletedAt: null,
            },
        });
    }

    /**
     * Return any session (terminal or open) for userId+stageId — one query replaces
     * the separate fetchFinalizedSession + fetchOpenSession pair in startGame.
     *
     * @param {string} userId - user id value.
     * @param {string} stageId - stage id value.
     *
     * @returns {Promise<{ id: string; status: number } | null>}
     */
    async fetchAnySession(
        userId: string,
        stageId: string,
    ): Promise<{ id: string; status: number } | null> {
        return this.prisma.gameSession.findFirst({
            where: { userId, stageId, deletedAt: null },
            select: { id: true, status: true },
        });
    }

    /**
     * Return an open (ACTIVE or RESULT_PROCESSING) session from DB.
     * Used in startGame to detect sessions whose Restate state was lost.
     *
     * @param {string} userId - user id value.
     * @param {string} stageId - stage id value.
     *
     * @returns {Promise<{ id: string; status: number } | null>}
     */
    async fetchOpenSession(
        userId: string,
        stageId: string,
    ): Promise<{ id: string; status: number } | null> {
        return this.prisma.gameSession.findFirst({
            where: {
                userId,
                stageId,
                status: { in: [GAME_SESSION_STATUS.ACTIVE, GAME_SESSION_STATUS.RESULT_PROCESSING] },
                deletedAt: null,
            },
            select: { id: true, status: true },
        });
    }

    /**
     * DB-only fallback: mark an open session as EXPIRED when Restate state is missing.
     * Safe to call multiple times — returns false if already terminal or not found.
     *
     * @param {string} sessionId - session id value.
     *
     * @returns {Promise<boolean>} true if the session was marked expired, false otherwise.
     */
    async expireOpenSessionWithoutRestateState(sessionId: string): Promise<boolean> {
        const session = await this.prisma.gameSession.findFirst({
            where: { id: sessionId, deletedAt: null },
            select: { id: true, status: true },
        });
        if (!session) {
            return false;
        }

        if ((TERMINAL_GAME_SESSION_STATUSES as readonly number[]).includes(session.status)) {
            return false;
        }

        const updated = await this.prisma.gameSession.updateMany({
            where: {
                id: sessionId,
                status: { in: [GAME_SESSION_STATUS.ACTIVE, GAME_SESSION_STATUS.RESULT_PROCESSING] },
                deletedAt: null,
            },
            data: {
                status: GAME_SESSION_STATUS.EXPIRED,
                score: 0,
                endedAt: new Date(),
            },
        });

        if (updated.count === 0) {
            return false;
        }

        this.logger.warn(
            `Session ${sessionId} expired via DB fallback — Restate state was unavailable`,
        );
        return true;
    }

    // ── DB write helpers ───────────────────────────────────────────────────────

    /**
     * Create the initial GameSession + GameSessionSnapshot rows in DB.
     * Called once inside ctx.run('create-session', ...) in the Virtual Object.
     *
     * @param {string} userId - user id value.
     * @param {string} stageId - stage id value.
     * @param {StageConfig} stageConfig - stage config value.
     *
     * @returns {Promise<{ sessionId: string; serverSeed: string; startedAtMs: number }>}
     */
    async createGameSession(
        userId: string,
        stageId: string,
        stageConfig: StageConfig,
    ): Promise<{ sessionId: string; serverSeed: string; startedAtMs: number }> {
        const now = new Date();
        const serverSeed = crypto.randomBytes(16).toString('hex');

        try {
            const session = await this.prisma.gameSession.create({
                data: {
                    userId,
                    stageId,
                    status: GAME_SESSION_STATUS.ACTIVE,
                    serverSeed,
                    completedRounds: 0,
                    snapshot: {
                        create: {
                            timeLimit: stageConfig.timeLimit,
                            minSequence: stageConfig.minSequence,
                            maxSequence: stageConfig.maxSequence,
                            enableDemo: stageConfig.enableDemo,
                            demoMinSequence: stageConfig.demoMinSequence,
                            demoMaxSequence: stageConfig.demoMaxSequence,
                            flashDelay: stageConfig.flashDelay,
                            levelDelay: stageConfig.levelDelay,
                            bonusTimeRatio: stageConfig.bonusTimeRatio,
                            scorePerClick: stageConfig.scorePerClick,
                            cellCount: stageConfig.cellCount,
                            wrongMoveHandling: stageConfig.wrongMoveHandling,
                        },
                    },
                },
            });

            return { sessionId: session.id, serverSeed, startedAtMs: now.getTime() };
        } catch (error) {
            // P2002 = unique constraint — a row for this userId+stageId already exists.
            // This can happen when Restate retries ctx.run('create-session') after the DB
            // write succeeded but before the journal entry was committed. Return the
            // existing row so the handler can proceed idempotently.
            if (
                error instanceof Error &&
                'code' in error &&
                (error as { code: string }).code === 'P2002'
            ) {
                const existing = await this.prisma.gameSession.findFirst({
                    where: { userId, stageId },
                    select: { id: true, serverSeed: true, startedAt: true, status: true },
                });
                if (existing) {
                    if (
                        (TERMINAL_GAME_SESSION_STATUSES as readonly number[]).includes(
                            existing.status,
                        )
                    ) {
                        throwTerminalError('STAGE_ALREADY_COMPLETED', 409);
                    }
                    this.logger.warn(
                        `[${userId}] createGameSession P2002 — returning existing session ${existing.id}`,
                    );
                    return {
                        sessionId: existing.id,
                        serverSeed: existing.serverSeed ?? serverSeed,
                        startedAtMs: existing.startedAt.getTime(),
                    };
                }
            }
            throw error;
        }
    }

    /**
     * Schedule durable expiry handlers via Restate. Delegates to GameExpiryService.
     *
     * @param {string} sessionId - session id value.
     * @param {number} expiryAtMs - expiry at ms value.
     * @param {string} userId - user id value.
     * @param {string} stageId - stage id value.
     *
     * @returns {Promise<void>}
     */
    async scheduleExpiry(
        sessionId: string,
        expiryAtMs: number,
        userId: string,
        stageId: string,
    ): Promise<void> {
        await this.expiry.schedule(sessionId, expiryAtMs, userId, stageId);
    }

    // ── Finalization ───────────────────────────────────────────────────────────

    /**
     * Commit the full in-flight game to the DB in one transaction.
     * Called inside ctx.run() in the Virtual Object handlers.
     * Writes are idempotent if called multiple times for the same sessionId.
     *
     * @param {InFlightSession} session - in-flight session value.
     * @param {InFlightInput[]} inputs - all in-flight inputs value.
     * @param {Date} now - current time.
     * @param {number} hintStatus - COMPLETED or EXPIRED.
     * @param {number} timeBonus - time bonus (0 if expired/wrong).
     * @param {number} finalScore - pre-computed final score.
     *
     * @returns {Promise<void>}
     */
    async finalizeAndCommit(
        session: InFlightSession,
        inputs: InFlightInput[],
        now: Date,
        hintStatus: number,
        timeBonus: number = 0,
        finalScore: number = 0,
    ): Promise<void> {
        const actualCompletedRounds = session.completedRounds;

        // Priority: EXPIRED always wins; COMPLETED only if all rounds done; otherwise keep hint
        const totalActual = session.config.maxSequence - session.config.minSequence + 1;
        const allRoundsDone = session.completedRounds >= totalActual;
        const finalStatus =
            hintStatus === GAME_SESSION_STATUS.EXPIRED
                ? GAME_SESSION_STATUS.EXPIRED
                : hintStatus === GAME_SESSION_STATUS.COMPLETED && allRoundsDone
                  ? GAME_SESSION_STATUS.COMPLETED
                  : hintStatus;

        // updateMany returns count=0 when the session is already terminal — no pre-check needed.
        // createMany runs only when the update actually lands, keeping inputs and session atomic.
        const updatedCount = await this.prisma.$transaction(async (tx) => {
            const result = await tx.gameSession.updateMany({
                where: {
                    id: session.sessionId,
                    status: {
                        in: [GAME_SESSION_STATUS.ACTIVE, GAME_SESSION_STATUS.RESULT_PROCESSING],
                    },
                    deletedAt: null,
                },
                data: {
                    status: finalStatus,
                    score: finalScore,
                    completedRounds: actualCompletedRounds,
                    successfulRounds: session.successfulRounds ?? 0,
                    endedAt: now,
                    endTime: session.expiryAtMs ? new Date(session.expiryAtMs) : undefined,
                },
            });

            if (result.count > 0 && inputs.length > 0) {
                await tx.gameInput.createMany({
                    data: inputs.map((input) => ({
                        id: input.id,
                        gameSessionId: session.sessionId,
                        tileId: input.tileId,
                        serverTime: new Date(input.serverTime),
                        isCorrect: input.isCorrect,
                        isDemo: input.isDemo,
                    })),
                    skipDuplicates: true,
                });
            }

            return result.count;
        });

        if (updatedCount === 0) {
            this.logger.warn(
                `[${session.userId}] Session ${session.sessionId} already finalized — skipping duplicate commit`,
            );
            return;
        }

        // Fire-and-forget anti-cheat scan after the main transaction
        this.antiCheat.analyzeAndPersist(session, inputs);

        this.logger.log(
            `Session ${session.sessionId} finalized: status=${finalStatus} score=${finalScore} bonus=${timeBonus}`,
        );
    }

    // ── Pure computation helpers ───────────────────────────────────────────────

    /**
     * Calculate final score = successfulMoves * scorePerClick + timeBonus.
     *
     * @param {number} successfulMoves - successful moves value.
     * @param {number} scorePerClick - score per click value.
     * @param {number} timeBonus - time bonus value.
     *
     * @returns {number} The final score.
     */
    calculateFinalScore(successfulMoves: number, scorePerClick: number, timeBonus: number): number {
        return successfulMoves * scorePerClick + timeBonus;
    }

    /**
     * Determine if the player is eligible for a time bonus.
     *
     * @param {boolean} hasAnyPreviousWrong - has any previous wrong value.
     * @param {number} wrongMoveHandling - wrong move handling value.
     *
     * @returns {boolean}
     */
    isBonusEligible(hasAnyPreviousWrong: boolean, wrongMoveHandling: number): boolean {
        return (
            wrongMoveHandling === WRONG_MOVE_HANDLING.PLAY_AGAIN ||
            wrongMoveHandling === WRONG_MOVE_HANDLING.PREV_SEQUENCE ||
            !hasAnyPreviousWrong
        );
    }

    /**
     * Deterministic tile-sequence generator (SHA-256 hash chain).
     * Produces the same sequence for the same (seed, length, cellCount) arguments.
     *
     * @param {string} seed - server seed value.
     * @param {number} length - sequence length value.
     * @param {number} cellCount - cell count value.
     *
     * @returns {number[]} Array of tile IDs (1 to cellCount).
     */
    generateSequence(seed: string, length: number, cellCount: number): number[] {
        const sequence: number[] = [];
        let currentHash = crypto.createHash('sha256').update(seed).digest('hex');

        for (let i = 0; i < length; i++) {
            const val = parseInt(currentHash.substring(0, 8), 16);
            sequence.push((val % cellCount) + 1);
            currentHash = crypto.createHash('sha256').update(currentHash).digest('hex');
        }
        return sequence;
    }

    // ── Response builders ──────────────────────────────────────────────────────

    /**
     * Build the response returned from startGame / getStatus for an active session.
     *
     * @param {InFlightSession} session - in-flight session value.
     * @param {InFlightInput[]} inputs - in-flight inputs value.
     *
     * @returns {StartGameResponse}
     */
    buildStartGameResponse(session: InFlightSession, inputs: InFlightInput[]): StartGameResponse {
        const seqLength = session.config.minSequence + session.completedRounds;
        const sequence = session.cachedSequence
            ? session.cachedSequence.slice(0, seqLength)
            : this.generateSequence(session.serverSeed, seqLength, session.config.cellCount);
        const currentActualRound = Math.max(1, session.completedRounds + 1);

        return {
            sessionId: session.sessionId,
            serverSeed: session.serverSeed,
            config: session.config,
            endTime: new Date(session.expiryAtMs).toISOString(),
            isResumed: inputs.length > 0,
            currentRound: currentActualRound,
            currentActualRound,
            roundProgress: session.roundProgress,
            completedRounds: session.completedRounds,
            successfulMoves: session.successfulMoves,
            status: session.status,
            sequence,
            flashDelay: session.config.flashDelay,
            levelDelay: session.config.levelDelay,
            startedAtMs: session.startedAtMs,
        };
    }

    /**
     * Build a minimal response from a finalized DB session (used by getStatus fallback).
     *
     * @param {object} dbSession - DB session row.
     *
     * @returns {object}
     */
    buildResponseFromDb(
        dbSession: NonNullable<Awaited<ReturnType<typeof this.fetchFinalizedSession>>>,
    ) {
        const endTime =
            dbSession.endTime instanceof Date
                ? dbSession.endTime.toISOString()
                : typeof dbSession.endTime === 'string'
                  ? new Date(dbSession.endTime).toISOString()
                  : null;

        return {
            sessionId: dbSession.id,
            status: dbSession.status,
            endTime,
            finalScore: dbSession.score ?? 0,
            completedRounds: dbSession.completedRounds,
            isFinalized: true,
        };
    }

    async fetchStageIdBySessionId(sessionId: string, userId: string): Promise<string | null> {
        const session = await this.prisma.gameSession.findFirst({
            where: { id: sessionId, userId, deletedAt: null },
            select: { stageId: true },
        });
        return session?.stageId ?? null;
    }

    async getStageIdForSession(sessionId: string, userId: string): Promise<string | null> {
        return this.fetchStageIdBySessionId(sessionId, userId);
    }

}
