import { EliminationService } from './elimination.service';

/**
 * Unit tests for EliminationService — the season-stage cut logic.
 * Prisma is mocked. We verify surviveCount = ceil(n × (1 − pct)), per-bucket vs
 * unified pooling, eliminated marking, the faster-wins tiebreaker ordering, and
 * the empty-field short-circuit.
 */
describe('EliminationService', () => {
  let service: EliminationService;
  let prisma: any;

  const makeEntry = (n: number, cohort: string) => ({
    id: `e${n}`,
    season_entry_id: `se${n}`,
    season_entry: { cohort_id: cohort },
    total_score: 1000 - n,
    total_time_ms: n * 100,
  });

  const setup = (opts: {
    stageNumber: number;
    eliminationPct: number;
    bucketingStage?: number;
    entries: any[];
  }) => {
    prisma = {
      seasonStage: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'stage-1',
          stage_number: opts.stageNumber,
          elimination_pct: opts.eliminationPct,
          season: { bucketing_stage: opts.bucketingStage ?? 3 },
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      stageEntry: {
        findMany: jest.fn().mockResolvedValue(opts.entries),
        update: jest.fn().mockImplementation((args) => args),
      },
      seasonEntry: { updateMany: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    service = new EliminationService(prisma as any);
  };

  const eliminatedFlags = () =>
    prisma.stageEntry.update.mock.calls.map((c: any[]) => c[0].data.eliminated);

  it('eliminates the bottom X% of a single unified pool after bucketing', async () => {
    const entries = Array.from({ length: 10 }, (_, i) => makeEntry(i + 1, 'ignored'));
    setup({ stageNumber: 5, eliminationPct: 30, entries });

    const result = await service.runElimination('stage-1');

    expect(result.mode).toBe('unified');
    expect(result.pools).toBe(1);
    expect(result.survived).toBe(7); // ceil(10 × 0.7)
    expect(result.eliminated).toBe(3);
    // Ranks 8,9,10 eliminated.
    expect(eliminatedFlags().filter(Boolean)).toHaveLength(3);
    expect(prisma.seasonEntry.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'ELIMINATED' } }),
    );
    expect(prisma.seasonStage.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'CLOSED' } }),
    );
  });

  it('eliminates within each weekly bucket before the bucketing stage', async () => {
    const entries = [
      ...Array.from({ length: 4 }, (_, i) => makeEntry(i + 1, 'A')),
      ...Array.from({ length: 6 }, (_, i) => makeEntry(i + 5, 'B')),
    ];
    setup({ stageNumber: 1, eliminationPct: 50, bucketingStage: 3, entries });

    const result = await service.runElimination('stage-1');

    expect(result.mode).toBe('per-bucket');
    expect(result.pools).toBe(2);
    // Pool A: ceil(4×0.5)=2 survive; Pool B: ceil(6×0.5)=3 survive => 5 total.
    expect(result.survived).toBe(5);
    expect(result.eliminated).toBe(5);
  });

  it('rounds the survivor count up (ceil) so ties favour survival', async () => {
    const entries = Array.from({ length: 3 }, (_, i) => makeEntry(i + 1, 'x'));
    setup({ stageNumber: 5, eliminationPct: 50, entries });

    const result = await service.runElimination('stage-1');
    expect(result.survived).toBe(2); // ceil(3 × 0.5) = 2
    expect(result.eliminated).toBe(1);
  });

  it('orders entries by score desc then time asc (faster wins tiebreak)', async () => {
    setup({ stageNumber: 5, eliminationPct: 10, entries: [makeEntry(1, 'x')] });
    await service.runElimination('stage-1');
    expect(prisma.stageEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ total_score: 'desc' }, { total_time_ms: 'asc' }],
      }),
    );
  });

  it('short-circuits when there are no completed entries', async () => {
    setup({ stageNumber: 5, eliminationPct: 30, entries: [] });
    const result = await service.runElimination('stage-1');
    expect(result).toEqual({ eliminated: 0, survived: 0 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.seasonStage.update).not.toHaveBeenCalled();
  });

  it('throws when the stage does not exist', async () => {
    setup({ stageNumber: 5, eliminationPct: 30, entries: [] });
    prisma.seasonStage.findUnique.mockResolvedValue(null);
    await expect(service.runElimination('missing')).rejects.toThrow('Stage not found');
  });
});
