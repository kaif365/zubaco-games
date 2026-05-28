import { GameConfigProvider } from '@/features/sequence-recall/repositories/GameConfigProvider';

describe('GameConfigProvider', () => {
  it('returns mock config and player session', async () => {
    const provider = new GameConfigProvider();
    const config = await provider.getConfig();
    const session = await provider.getPlayerSession();
    expect(config.initialLives).toBeGreaterThan(0);
    expect(session.playerId).toContain('mock');
  });
});
