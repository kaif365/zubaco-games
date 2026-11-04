import {
  TournamentLifecycleState,
  LIFECYCLE_ORDERED_SEQUENCE,
  canTransitionLifecycle,
  assertLifecycleTransition,
  getNextLifecycleState,
  isStageLiveState,
  isStageTallyState,
  getStageNumberFromState,
  MANDATORY_INTERMISSION_REST_SECONDS,
} from './stage-lifecycle';

describe('15-State Tournament Lifecycle Machine (Module 5.2)', () => {
  it('should enforce the strict 15-state sequential lifecycle order', () => {
    expect(LIFECYCLE_ORDERED_SEQUENCE).toHaveLength(16); // 16 states including ARCHIVED

    for (let i = 0; i < LIFECYCLE_ORDERED_SEQUENCE.length - 1; i++) {
      const current = LIFECYCLE_ORDERED_SEQUENCE[i];
      const next = LIFECYCLE_ORDERED_SEQUENCE[i + 1];

      expect(canTransitionLifecycle(current, next)).toBe(true);
      expect(() => assertLifecycleTransition(current, next)).not.toThrow();
      expect(getNextLifecycleState(current)).toBe(next);
    }
  });

  it('should reject illegal or out-of-order transitions', () => {
    // Skipping stages
    expect(
      canTransitionLifecycle(
        TournamentLifecycleState.DRAFT,
        TournamentLifecycleState.STAGE_1_LIVE,
      ),
    ).toBe(false);
    expect(() =>
      assertLifecycleTransition(
        TournamentLifecycleState.DRAFT,
        TournamentLifecycleState.STAGE_1_LIVE,
      ),
    ).toThrow('Illegal tournament lifecycle transition');

    // Skipping stage tally
    expect(
      canTransitionLifecycle(
        TournamentLifecycleState.STAGE_1_LIVE,
        TournamentLifecycleState.STAGE_2_LIVE,
      ),
    ).toBe(false);

    // Reverting backward
    expect(
      canTransitionLifecycle(
        TournamentLifecycleState.STAGE_3_LIVE,
        TournamentLifecycleState.STAGE_2_LIVE,
      ),
    ).toBe(false);
  });

  it('should permit cancellation from non-terminal states and reject cancellation from terminal states', () => {
    expect(
      canTransitionLifecycle(
        TournamentLifecycleState.STAGE_2_LIVE,
        TournamentLifecycleState.CANCELLED,
      ),
    ).toBe(true);

    expect(
      canTransitionLifecycle(
        TournamentLifecycleState.ARCHIVED,
        TournamentLifecycleState.CANCELLED,
      ),
    ).toBe(false);
  });

  it('should correctly classify stage live and tally states', () => {
    expect(isStageLiveState(TournamentLifecycleState.STAGE_1_LIVE)).toBe(true);
    expect(isStageLiveState(TournamentLifecycleState.STAGE_1_TALLY)).toBe(false);

    expect(isStageTallyState(TournamentLifecycleState.STAGE_3_TALLY)).toBe(true);
    expect(isStageTallyState(TournamentLifecycleState.STAGE_3_LIVE)).toBe(false);

    expect(getStageNumberFromState(TournamentLifecycleState.STAGE_4_LIVE)).toBe(4);
    expect(getStageNumberFromState(TournamentLifecycleState.STAGE_4_TALLY)).toBe(4);
    expect(getStageNumberFromState(TournamentLifecycleState.ARCHIVED)).toBeNull();
  });

  it('should enforce mandatory 60-second rest period constant', () => {
    expect(MANDATORY_INTERMISSION_REST_SECONDS).toBe(60);
  });
});
