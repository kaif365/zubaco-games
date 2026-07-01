import {
  SessionState,
  TERMINAL_STATES,
  isTerminal,
  canTransition,
  assertTransition,
  outcomeForTerminal,
} from './session-lifecycle';

/**
 * Unit tests for the canonical game-session state machine (GAME-001).
 *
 * Pure logic with no infrastructure. This is the single guard every engine
 * uses, so both the legal happy path and the illegal transitions (which stop a
 * client from jumping straight to COMPLETED) are asserted exhaustively, along
 * with terminal detection and the persisted-outcome mapping.
 */
describe('session-lifecycle state machine', () => {
  describe('happy path CREATED -> COMPLETED', () => {
    const path = [
      SessionState.CREATED,
      SessionState.INITIALIZED,
      SessionState.STARTED,
      SessionState.ACTIVE,
      SessionState.RESULT_PROCESSING,
      SessionState.COMPLETED,
    ];

    it('allows every forward step of the authoritative completion path', () => {
      for (let i = 0; i < path.length - 1; i++) {
        expect(canTransition(path[i], path[i + 1])).toBe(true);
      }
    });

    it('never throws while walking the full happy path', () => {
      for (let i = 0; i < path.length - 1; i++) {
        expect(() => assertTransition(path[i], path[i + 1])).not.toThrow();
      }
    });
  });

  describe('illegal transitions', () => {
    it('forbids skipping straight from CREATED to COMPLETED', () => {
      expect(canTransition(SessionState.CREATED, SessionState.COMPLETED)).toBe(false);
      expect(() => assertTransition(SessionState.CREATED, SessionState.COMPLETED)).toThrow(
        /Illegal session transition CREATED -> COMPLETED/,
      );
    });

    it('forbids leaving any terminal state', () => {
      for (const terminal of TERMINAL_STATES) {
        expect(canTransition(terminal, SessionState.ACTIVE)).toBe(false);
      }
    });

    it('forbids moving backwards (ACTIVE -> STARTED)', () => {
      expect(canTransition(SessionState.ACTIVE, SessionState.STARTED)).toBe(false);
    });

    it('only permits COMPLETED or EXPIRED out of RESULT_PROCESSING', () => {
      expect(canTransition(SessionState.RESULT_PROCESSING, SessionState.COMPLETED)).toBe(true);
      expect(canTransition(SessionState.RESULT_PROCESSING, SessionState.EXPIRED)).toBe(true);
      expect(canTransition(SessionState.RESULT_PROCESSING, SessionState.CANCELLED)).toBe(false);
    });
  });

  describe('cancellation and expiry branches', () => {
    it('allows CANCELLED from every non-terminal state', () => {
      const nonTerminal = [
        SessionState.CREATED,
        SessionState.INITIALIZED,
        SessionState.STARTED,
        SessionState.ACTIVE,
      ];
      for (const s of nonTerminal) {
        expect(canTransition(s, SessionState.CANCELLED)).toBe(true);
      }
    });

    it('does not allow EXPIRED directly from CREATED', () => {
      // Expiry only becomes reachable once the session has been initialised.
      expect(canTransition(SessionState.CREATED, SessionState.EXPIRED)).toBe(false);
    });
  });

  describe('isTerminal', () => {
    it.each([SessionState.COMPLETED, SessionState.EXPIRED, SessionState.CANCELLED])(
      'reports %s as terminal',
      (s) => expect(isTerminal(s)).toBe(true),
    );

    it.each([
      SessionState.CREATED,
      SessionState.INITIALIZED,
      SessionState.STARTED,
      SessionState.ACTIVE,
      SessionState.RESULT_PROCESSING,
    ])('reports %s as non-terminal', (s) => expect(isTerminal(s)).toBe(false));
  });

  describe('outcomeForTerminal', () => {
    it('maps terminal states onto their persisted SessionOutcome', () => {
      expect(outcomeForTerminal(SessionState.COMPLETED)).toBe('COMPLETED');
      expect(outcomeForTerminal(SessionState.EXPIRED)).toBe('TIMED_OUT');
      expect(outcomeForTerminal(SessionState.CANCELLED)).toBe('ABANDONED');
    });

    it('throws for a non-terminal state', () => {
      expect(() => outcomeForTerminal(SessionState.ACTIVE)).toThrow(/not terminal/);
    });
  });
});
