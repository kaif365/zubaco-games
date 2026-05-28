import { CHEAT_REASONS, GAME_CONFIGS } from '@common/constants';
import { PrismaService } from '@common/prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';

import { SnsService } from '../aws/sns.service';

import { InFlightInput, InFlightSession } from './game-restate-state.types';

// ── Evidence shapes ────────────────────────────────────────────────────────────

interface ClickTooFastViolation {
    prevInputId: string;
    currInputId: string;
    prevTimestamp: string;
    currTimestamp: string;
    intervalMs: number;
}

interface ClickTooFastEvidence {
    thresholdMs: number;
    violations: ClickTooFastViolation[];
}

interface UniformTimingEvidence {
    intervals: number[];
    mean: number;
    stddev: number;
    cv: number;
    threshold: number;
    minimumIntervalCount: number;
}

interface ImpossibleSolveTimeEvidence {
    roundIndex: number;
    expectedStepCount: number;
    actualDurationMs: number;
    minimumAllowedMs: number;
    perStepThresholdMs: number;
    startTimestamp: string;
    endTimestamp: string;
}

interface InvalidEndStateEvidence {
    sessionId: string;
    expectedSuccessfulMoves: number;
    actualSuccessfulMoves: number;
    completedRounds: number;
    totalExpectedRounds: number;
    roundProgress: number;
    description: string;
}

// ── Internal DTO ───────────────────────────────────────────────────────────────

interface CheatFlagRecord {
    userId: string;
    gameSessionId: string;
    inputId: string | null;
    flagType: number;
    evidence: object;
}

// ── Helper ─────────────────────────────────────────────────────────────────────


// ── Service ────────────────────────────────────────────────────────────────────

@Injectable()
export class GameAntiCheatService {
    private readonly logger = new Logger(GameAntiCheatService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly sns: SnsService,
    ) {}

    /**
     * Run all anti-cheat detectors against the finalized session and its inputs.
     * Persists any flags fire-and-forget — never throws, never blocks finalization.
     */
    analyzeAndPersist(session: InFlightSession, inputs: InFlightInput[]): void {
        void this.runAsync(session, inputs);
    }

    private async runAsync(session: InFlightSession, inputs: InFlightInput[]): Promise<void> {
        try {
            const flags = this.analyze(session, inputs);
            if (flags.length === 0) {
                return;
            }

            const createdFlags = await this.prisma.gameCheatFlag.createManyAndReturn({
                data: flags.map((f) => ({
                    userId: f.userId,
                    gameSessionId: f.gameSessionId,
                    inputId: f.inputId,
                    flagType: f.flagType,
                    evidence: f.evidence,
                })),
                skipDuplicates: true,
                select: { id: true, userId: true, flagType: true, createdAt: true },
            });

            await Promise.all(
                createdFlags.map((flag) =>
                    this.sns.publishCheatFlag({
                        referenceId: flag.id,
                        userId: flag.userId,
                        gameType: 2,
                        flagType: flag.flagType,
                        createdAt: flag.createdAt.toISOString(),
                        gameName: 'Sequence Recall',
                    }),
                ),
            );

            this.logger.warn(
                `[${session.userId}] ${flags.length} cheat flag(s) on session ${session.sessionId}: ` +
                    flags
                        .map(
                            (f) =>
                                Object.keys(CHEAT_REASONS).find(
                                    (k) =>
                                        CHEAT_REASONS[k as keyof typeof CHEAT_REASONS] ===
                                        f.flagType,
                                ) ?? f.flagType,
                        )
                        .join(', '),
            );
        } catch (err: unknown) {
            this.logger.error(
                `[${session.userId}] Failed to persist cheat flags: ${err instanceof Error ? err.message : String(err)}`,
            );
        }
    }

    // ── Public pure analysis (testable) ──────────────────────────────────────

    analyze(session: InFlightSession, inputs: InFlightInput[]): CheatFlagRecord[] {
        if (inputs.length < 2) {
            return [];
        }

        const flags: CheatFlagRecord[] = [];

        const tooFast = this.detectClickTooFast(inputs);
        if (tooFast) {
            flags.push({
                userId: session.userId,
                gameSessionId: session.sessionId,
                inputId: null,
                flagType: CHEAT_REASONS.CLICK_TOO_FAST,
                evidence: tooFast,
            });
        }

        const uniform = this.detectUniformTiming(inputs);
        if (uniform) {
            flags.push({
                userId: session.userId,
                gameSessionId: session.sessionId,
                inputId: null,
                flagType: CHEAT_REASONS.UNIFORM_TIMING,
                evidence: uniform,
            });
        }

        const impossibles = this.detectImpossibleSolveTimes(session, inputs);
        for (const ev of impossibles) {
            flags.push({
                userId: session.userId,
                gameSessionId: session.sessionId,
                inputId: null,
                flagType: CHEAT_REASONS.IMPOSSIBLE_SOLVE_TIME,
                evidence: ev,
            });
        }

        const invalid = this.detectInvalidEndState(session, inputs);
        if (invalid) {
            flags.push({
                userId: session.userId,
                gameSessionId: session.sessionId,
                inputId: null,
                flagType: CHEAT_REASONS.INVALID_END_STATE,
                evidence: invalid,
            });
        }

        return flags;
    }

    // ── Detector 1: consecutive moves faster than threshold ───────────────────

    private detectClickTooFast(inputs: InFlightInput[]): ClickTooFastEvidence | null {
        const violations: ClickTooFastViolation[] = [];

        for (let i = 1; i < inputs.length; i++) {
            const prev = new Date(inputs[i - 1].serverTime).getTime();
            const curr = new Date(inputs[i].serverTime).getTime();
            const intervalMs = curr - prev;

            if (intervalMs < GAME_CONFIGS.CLICK_TOO_FAST_MS) {
                violations.push({
                    prevInputId: inputs[i - 1].id,
                    currInputId: inputs[i].id,
                    prevTimestamp: inputs[i - 1].serverTime,
                    currTimestamp: inputs[i].serverTime,
                    intervalMs,
                });
            }
        }

        if (violations.length === 0) {
            return null;
        }

        return {
            thresholdMs: GAME_CONFIGS.CLICK_TOO_FAST_MS,
            violations,
        };
    }

    // ── Detector 2: suspiciously uniform timing (low CV) ─────────────────────

    private detectUniformTiming(inputs: InFlightInput[]): UniformTimingEvidence | null {
        if (inputs.length < GAME_CONFIGS.UNIFORM_TIMING_MIN_INTERVALS + 1) {
            return null;
        }

        const intervals: number[] = [];
        for (let i = 1; i < inputs.length; i++) {
            const prev = new Date(inputs[i - 1].serverTime).getTime();
            const curr = new Date(inputs[i].serverTime).getTime();
            intervals.push(curr - prev);
        }

        if (intervals.length < GAME_CONFIGS.UNIFORM_TIMING_MIN_INTERVALS) {
            return null;
        }

        const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        if (mean <= 0) {
            return null;
        }

        const variance =
            intervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / intervals.length;
        const stddev = Math.sqrt(variance);
        const cv = stddev / mean;

        if (cv >= GAME_CONFIGS.UNIFORM_TIMING_CV_THRESHOLD) {
            return null;
        }

        return {
            intervals,
            mean: Math.round(mean * 100) / 100,
            stddev: Math.round(stddev * 100) / 100,
            cv: Math.round(cv * 10000) / 10000,
            threshold: GAME_CONFIGS.UNIFORM_TIMING_CV_THRESHOLD,
            minimumIntervalCount: GAME_CONFIGS.UNIFORM_TIMING_MIN_INTERVALS,
        };
    }

    // ── Detector 3: impossible round completion speed ─────────────────────────

    private detectImpossibleSolveTimes(
        session: InFlightSession,
        inputs: InFlightInput[],
    ): ImpossibleSolveTimeEvidence[] {
        const violations: ImpossibleSolveTimeEvidence[] = [];

        const correctByRound = new Map<number, InFlightInput[]>();
        for (const input of inputs) {
            if (!input.isCorrect) {
                continue;
            }
            const ri = input.roundIndex ?? 0;
            const arr = correctByRound.get(ri) ?? [];
            arr.push(input);
            correctByRound.set(ri, arr);
        }

        for (const [roundIndex, correctInputs] of correctByRound.entries()) {
            const seqLength = session.config.minSequence + roundIndex;

            // Skip single-tile rounds and rounds that weren't fully completed
            if (seqLength <= 1 || correctInputs.length < seqLength) {
                continue;
            }

            const sorted = [...correctInputs]
                .sort((a, b) => new Date(a.serverTime).getTime() - new Date(b.serverTime).getTime())
                .slice(0, seqLength);

            const startTimestamp = sorted[0].serverTime;
            const endTimestamp = sorted[seqLength - 1].serverTime;
            const startMs = new Date(startTimestamp).getTime();
            const endMs = new Date(endTimestamp).getTime();
            const actualDurationMs = endMs - startMs;

            // (seqLength - 1) intervals between seqLength tiles
            const minimumAllowedMs = (seqLength - 1) * GAME_CONFIGS.IMPOSSIBLE_SOLVE_PER_STEP_MS;

            if (actualDurationMs < minimumAllowedMs) {
                violations.push({
                    roundIndex,
                    expectedStepCount: seqLength,
                    actualDurationMs,
                    minimumAllowedMs,
                    perStepThresholdMs: GAME_CONFIGS.IMPOSSIBLE_SOLVE_PER_STEP_MS,
                    startTimestamp,
                    endTimestamp,
                });
            }
        }

        return violations;
    }

    // ── Detector 4: successfulMoves mismatch (invalid end state) ─────────────

    private detectInvalidEndState(
        session: InFlightSession,
        inputs: InFlightInput[],
    ): InvalidEndStateEvidence | null {
        const inputsByRound = new Map<number, InFlightInput[]>();
        for (const input of inputs) {
            const ri = input.roundIndex ?? 0;
            const arr = inputsByRound.get(ri) ?? [];
            arr.push(input);
            inputsByRound.set(ri, arr);
        }

        let expectedSuccessfulMoves = 0;
        for (const [roundIndex, roundInputs] of inputsByRound.entries()) {
            const seqLength = session.config.minSequence + roundIndex;

            const sorted = [...roundInputs].sort(
                (a, b) => new Date(a.serverTime).getTime() - new Date(b.serverTime).getTime(),
            );

            let lastWrongIndex = -1;
            for (let i = sorted.length - 1; i >= 0; i--) {
                if (!sorted[i].isCorrect) {
                    lastWrongIndex = i;
                    break;
                }
            }

            const finalAttemptCorrectCount = sorted
                .slice(lastWrongIndex + 1)
                .filter((inp) => inp.isCorrect).length;

            if (finalAttemptCorrectCount === seqLength) {
                expectedSuccessfulMoves += seqLength;
            }
        }

        if (expectedSuccessfulMoves === session.successfulMoves) {
            return null;
        }

        const totalExpectedRounds = session.config.maxSequence - session.config.minSequence + 1;

        return {
            sessionId: session.sessionId,
            expectedSuccessfulMoves,
            actualSuccessfulMoves: session.successfulMoves,
            completedRounds: session.completedRounds,
            totalExpectedRounds,
            roundProgress: session.roundProgress,
            description: 'successfulMoves in session state does not match input record analysis',
        };
    }
}
