import { defaultGameConfig } from '@/config/gameConfig';
import { GameRepository } from '@/features/sequence-recall/repositories/GameRepository';

describe('GameRepository', () => {
  it('starts game and transitions playback lifecycle', async () => {
    const repo = new GameRepository(defaultGameConfig);
    const initial = await repo.getInitialState();
    expect(initial.phase).toBe('ready');

    const started = await repo.startGame();
    expect(started.phase).toBe('showing-sequence');

    const playable = await repo.finishPlayback();
    expect(playable.phase).toBe('awaiting-input');
  });

  it('replays and restarts round', async () => {
    const repo = new GameRepository(defaultGameConfig);
    await repo.startGame();
    const replayed = await repo.replayCurrentRound();
    expect(replayed.phase).toBe('showing-sequence');

    const restarted = await repo.restartGame();
    expect(restarted.phase).toBe('ready');
    expect(restarted.score).toBe(0);
  });

  it('returns submit move response shape', async () => {
    const repo = new GameRepository(defaultGameConfig);
    await repo.startGame();
    const playable = await repo.finishPlayback();

    let result = await repo.submitMove({ tileId: playable.revealedSequence[0] });
    for (let i = 1; i < playable.revealedSequence.length; i++) {
      result = await repo.submitMove({ tileId: playable.revealedSequence[i] });
    }

    expect(result.completedRound).toBe(true);
    expect(result.state.round).toBeGreaterThanOrEqual(1);
  });
});
