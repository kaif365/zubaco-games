import { describe, expect, it } from 'bun:test';

import { MOVE_STATUS } from '@common/constants';

import { GameController } from './game.controller';

describe('GameController.validateGame', () => {
    it('returns finalScore for completed games so bonus points are preserved', async () => {
        const controller = new GameController(
            {
                validateRound: async () => ({
                    status: MOVE_STATUS.GAME_COMPLETE,
                    currentScore: 120,
                    finalScore: 165,
                }),
            } as never,
            {} as never,
            {
                getStageIdForSession: async () => 'stage-1',
            } as never,
        );

        const result = await controller.validateGame(
            {
                gameSessionId: 'session-1',
                roundNumber: 3,
                playerSequence: [1, 2, 3],
                sequenceEvents: [],
                timestamp: new Date().toISOString(),
                isCorrect: true,
            },
            { id: 'user-1' } as never,
        );

        expect(result.status).toBe(MOVE_STATUS.GAME_COMPLETE);
        expect(result.score).toBe(165);
    });

    it('keeps using currentScore for non-terminal round validation', async () => {
        let calls = 0;
        const controller = new GameController(
            {
                validateRound: async () => {
                    calls += 1;
                    return { status: MOVE_STATUS.ROUND_SUCCESS, currentScore: 80 + calls - 1 };
                },
            } as never,
            {} as never,
            {
                getStageIdForSession: async () => 'stage-1',
            } as never,
        );

        const result = await controller.validateGame(
            {
                gameSessionId: 'session-1',
                roundNumber: 2,
                playerSequence: [1, 2],
                sequenceEvents: [],
                timestamp: new Date().toISOString(),
                isCorrect: true,
            },
            { id: 'user-1' } as never,
        );

        expect(result.status).toBe(MOVE_STATUS.ROUND_SUCCESS);
        expect(result.score).toBe(80);
    });
});
