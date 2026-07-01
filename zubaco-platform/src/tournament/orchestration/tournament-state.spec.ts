import {
  TournamentPhase,
  TOURNAMENT_TERMINAL,
  assertPhaseTransition,
  phaseToSeasonStatus,
  assertStageTransition,
  assertEntryTransition,
} from './tournament-state';

/**
 * Unit tests for the tournament progression state machine (TOURN-003).
 *
 * Pure logic (only Prisma enum *types* are imported). Covers the phase
 * progression guard, the elimination back-edge to STAGE_PROGRESSION, the
 * persisted SeasonStatus mapping, and the stage/entry sub-machines. These
 * guards are what prevent parallel/forged completion, so illegal edges are
 * asserted alongside the legal path.
 */
describe('tournament-state machine', () => {
  describe('phase progression', () => {
    const happyPath = [
      TournamentPhase.CREATED,
      TournamentPhase.REGISTRATION,
      TournamentPhase.PARTICIPANT_VALIDATION,
      TournamentPhase.MATCH_GENERATION,
      TournamentPhase.STAGE_PROGRESSION,
      TournamentPhase.QUALIFICATION,
      TournamentPhase.ELIMINATION,
      TournamentPhase.COMPLETED,
      TournamentPhase.REWARD_ELIGIBILITY,
    ];

    it('walks the full creation-to-reward path without throwing', () => {
      for (let i = 0; i < happyPath.length - 1; i++) {
        expect(() => assertPhaseTransition(happyPath[i], happyPath[i + 1])).not.toThrow();
      }
    });

    it('allows ELIMINATION to loop back to STAGE_PROGRESSION for the next stage', () => {
      expect(() =>
        assertPhaseTransition(TournamentPhase.ELIMINATION, TournamentPhase.STAGE_PROGRESSION),
      ).not.toThrow();
    });

    it('forbids skipping REGISTRATION straight to COMPLETED', () => {
      expect(() =>
        assertPhaseTransition(TournamentPhase.REGISTRATION, TournamentPhase.COMPLETED),
      ).toThrow(/Illegal tournament transition REGISTRATION -> COMPLETED/);
    });

    it('allows cancellation from every pre-completion phase', () => {
      const cancellable = [
        TournamentPhase.CREATED,
        TournamentPhase.REGISTRATION,
        TournamentPhase.PARTICIPANT_VALIDATION,
        TournamentPhase.MATCH_GENERATION,
        TournamentPhase.STAGE_PROGRESSION,
        TournamentPhase.QUALIFICATION,
        TournamentPhase.ELIMINATION,
      ];
      for (const p of cancellable) {
        expect(() => assertPhaseTransition(p, TournamentPhase.CANCELLED)).not.toThrow();
      }
    });

    it('forbids cancelling an already completed tournament', () => {
      expect(() =>
        assertPhaseTransition(TournamentPhase.COMPLETED, TournamentPhase.CANCELLED),
      ).toThrow(/Illegal tournament transition/);
    });

    it('treats REWARD_ELIGIBILITY and CANCELLED as terminal', () => {
      expect(TOURNAMENT_TERMINAL.has(TournamentPhase.REWARD_ELIGIBILITY)).toBe(true);
      expect(TOURNAMENT_TERMINAL.has(TournamentPhase.CANCELLED)).toBe(true);
      expect(TOURNAMENT_TERMINAL.has(TournamentPhase.COMPLETED)).toBe(false);
    });
  });

  describe('phaseToSeasonStatus', () => {
    it('maps lifecycle phases onto the persisted SeasonStatus', () => {
      expect(phaseToSeasonStatus(TournamentPhase.CREATED)).toBe('UPCOMING');
      expect(phaseToSeasonStatus(TournamentPhase.REGISTRATION)).toBe('REGISTRATION');
      expect(phaseToSeasonStatus(TournamentPhase.CANCELLED)).toBe('CANCELLED');
      expect(phaseToSeasonStatus(TournamentPhase.COMPLETED)).toBe('COMPLETED');
      expect(phaseToSeasonStatus(TournamentPhase.REWARD_ELIGIBILITY)).toBe('COMPLETED');
    });

    it('treats every mid-progression phase as ACTIVE', () => {
      for (const p of [
        TournamentPhase.PARTICIPANT_VALIDATION,
        TournamentPhase.MATCH_GENERATION,
        TournamentPhase.STAGE_PROGRESSION,
        TournamentPhase.QUALIFICATION,
        TournamentPhase.ELIMINATION,
      ]) {
        expect(phaseToSeasonStatus(p)).toBe('ACTIVE');
      }
    });
  });

  describe('stage sub-machine', () => {
    it('permits the LOCKED -> OPEN -> CLOSED -> ELIMINATED order', () => {
      expect(() => assertStageTransition('LOCKED', 'OPEN')).not.toThrow();
      expect(() => assertStageTransition('OPEN', 'CLOSED')).not.toThrow();
      expect(() => assertStageTransition('CLOSED', 'ELIMINATED')).not.toThrow();
    });

    it('forbids re-opening a closed stage', () => {
      expect(() => assertStageTransition('CLOSED', 'OPEN')).toThrow(/Illegal stage transition/);
    });

    it('forbids any transition out of ELIMINATED', () => {
      expect(() => assertStageTransition('ELIMINATED', 'OPEN')).toThrow(/Illegal stage transition/);
    });
  });

  describe('entry sub-machine', () => {
    it('allows an ACTIVE entry to be eliminated, won, or withdrawn', () => {
      expect(() => assertEntryTransition('ACTIVE', 'ELIMINATED')).not.toThrow();
      expect(() => assertEntryTransition('ACTIVE', 'WINNER')).not.toThrow();
      expect(() => assertEntryTransition('ACTIVE', 'WITHDRAWN')).not.toThrow();
    });

    it('forbids resurrecting an eliminated entry as WINNER', () => {
      expect(() => assertEntryTransition('ELIMINATED', 'WINNER')).toThrow(
        /Illegal entry transition/,
      );
    });

    it('forbids any transition out of WINNER', () => {
      expect(() => assertEntryTransition('WINNER', 'ELIMINATED')).toThrow(/Illegal entry transition/);
    });
  });
});
