import type { BlockFillBoardShape } from '@common/utils/block-fill-board.util';

import type { GridPoint, BlockFillPairInput } from './utils/block-fill-helpers';

export interface InFlightSavedPath {
    color: string;
    moveId: string | null;
    timeStamp: string | null;
    path: GridPoint[];
    completed: boolean;
}

export interface InFlightSubmissionEvent {
    moveId: string;
    color: string;
    timeStamp: string;
    pathLength: number;
}

export interface InFlightBoardState {
    sessionBoardId: string;
    boardId: string;
    levelId: string;
    levelName: string | null;
    name: string;
    roundNumber: number;
    startedAtMs: number | null;
    gridX: number;
    gridY: number;
    timeLimit: number;
    boardShape: BlockFillBoardShape;
    pairs: BlockFillPairInput[];
    version: number;
    completed: boolean;
    completedAt: string | null;
    score: number | null;
    paths: InFlightSavedPath[];
    submissions: InFlightSubmissionEvent[];
}

export interface InFlightSessionState {
    sessionId: string;
    userId: string;
    stageId: string;
    status: number;
    score: number;
    completedRounds: number;
    currentRoundNumber: number;
    currentLevelId: string | null;
    requestedDemoRound: number;
    requestedActualRound: number;
    requestedLevelId: string | null;
    totalDemoRounds: number;
    totalActualRounds: number;
    stageTimeLimit: number;
    enableDemo: boolean;
    gameStartedAtMs: number | null;
    gameEndedAtMs: number | null;
}

export interface InFlightTimerState {
    startTimeMs: number | null;
    endTimeMs: number | null;
}

export const STATE_KEY_SESSION = 'session' as const;
export const STATE_KEY_BOARDS = 'boards' as const;
