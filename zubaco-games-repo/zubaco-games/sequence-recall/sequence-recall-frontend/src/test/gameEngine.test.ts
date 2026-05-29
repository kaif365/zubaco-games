import { defaultGameConfig } from '@/config/gameConfig';
import {
  applyMove,
  applySessionTimeout,
  createInitialGameState,
  finishPlayback,
  restartGame,
  startRound,
} from '@/features/sequence-recall/engine/gameEngine';

describe('gameEngine', () => {
  it('creates initial state from config', () => {
    const state = createInitialGameState(defaultGameConfig);
    expect(state.lives).toBe(defaultGameConfig.initialLives);
    expect(state.revealedSequence).toHaveLength(1);
    expect(state.sequence.length).toBeGreaterThan(1);
  });

  it('marks game over when session times out', () => {
    const state = finishPlayback(startRound(createInitialGameState(defaultGameConfig)));
    const gameOver = applySessionTimeout(state);
    expect(gameOver.phase).toBe('game-over');
  });

  it('does not end game on wrong input — round-failure only', () => {
    let state = finishPlayback(startRound(createInitialGameState(defaultGameConfig)));
    const first = state.revealedSequence[0];
    const wrongTile = (first === 4 ? 1 : first + 1) as 1 | 2 | 3 | 4;
    state = applyMove(state, defaultGameConfig, wrongTile);
    expect(state.phase).toBe('round-failure');
    expect(state.lives).toBe(defaultGameConfig.initialLives);
  });

  it('progresses round and scores on correct move', () => {
    let state = finishPlayback(startRound(createInitialGameState(defaultGameConfig)));
    state = applyMove(state, defaultGameConfig, state.revealedSequence[0]);
    expect(state.phase).toBe('round-success');
    expect(state.score).toBeGreaterThan(0);
    expect(state.round).toBe(2);
    expect(state.revealedSequence).toHaveLength(2);
  });

  it('keeps high score when restarting', () => {
    const state = restartGame(defaultGameConfig, 200);
    expect(state.highScore).toBe(200);
    expect(state.score).toBe(0);
  });
});
