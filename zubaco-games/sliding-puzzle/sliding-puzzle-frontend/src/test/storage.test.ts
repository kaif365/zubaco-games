import { storage } from '../utils/storage';

describe('storage utility', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('sets and gets items', async () => {
    await storage.set('test', { a: 1 });
    expect(await storage.get('test')).toEqual({ a: 1 });
  });

  it('removes items', async () => {
    await storage.set('test', 1);
    storage.remove('test');
    expect(await storage.get('test')).toBeNull();
  });

  it('handles corrupted JSON', async () => {
    localStorage.setItem('test', 'invalid-json');
    expect(await storage.get('test')).toBeNull();
  });

  it('normalizes older live session records', async () => {
    const board = {
      sessionBoardId: 'session-board-1',
      id: 'board-1',
      roundNumber: 2,
      gridSize: { x: 3, y: 3 },
      fullImageUrl: '/board.png',
      displayTime: 5,
      pieces: [1, 2, 3, 4, 5, 6, 7, -1, 8],
    };

    localStorage.setItem(
      'sp_live_session',
      JSON.stringify({
        expiryAt: '2099-01-01T00:00:00.000Z',
        totalRounds: 3,
        currentRound: 2,
        board,
      }),
    );

    expect(await storage.readLiveSession()).toEqual({
      token: '',
      sessionId: null,
      expiryAt: '2099-01-01T00:00:00.000Z',
      startedAt: null,
      clientStartedAtMs: null,
      capturedAtMs: null,
      totalRounds: 3,
      currentRound: 2,
      board,
      pieces: board.pieces,
      phase: 'memorizing',
      pendingMovesByRound: {},
    });
  });
});
