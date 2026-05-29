import { generateSequence, isMoveCorrect } from '@/features/sequence-recall/engine/sequence';
import { GAME_PHASE } from '@/types/game';
import type { DifficultyConfig, GameConfig, GameState, TileId } from '@/types/game';

const BASE_STATE: Omit<GameState, 'sequence' | 'revealedSequence' | 'lives'> = {
  phase: GAME_PHASE.READY,
  score: 0,
  level: 1,
  round: 1,
  streak: 0,
  highScore: 0,
  playerInput: [],
  activeTile: null,
  feedback: 'game.feedback.startWhenReady',
  won: false,
};

function getDifficulty(config: GameConfig, level: number): DifficultyConfig {
  return config.difficultyByLevel[level] ?? config.difficultyByLevel[1];
}

export function createInitialGameState(config: GameConfig, startLen = 1): GameState {
  const difficulty = getDifficulty(config, 1);
  const sequence = generateSequence(difficulty.maxSequenceLength, config.boxCount);
  const clamped = startLen < 1 ? 1 : startLen > sequence.length ? sequence.length : startLen;
  return {
    ...BASE_STATE,
    lives: config.initialLives,
    sequence,
    revealedSequence: sequence.slice(0, clamped),
  };
}

export function startRound(state: GameState): GameState {
  return {
    ...state,
    phase: GAME_PHASE.SHOWING_SEQUENCE,
    playerInput: [],
    // Component reads revealedSequence.length for interpolation at display time
    feedback: 'game.feedback.watchPattern',
  };
}

export function finishPlayback(state: GameState): GameState {
  return {
    ...state,
    phase: GAME_PHASE.AWAITING_INPUT,
    activeTile: null,
    feedback: 'game.feedback.yourTurn',
  };
}

export function applyMove(state: GameState, config: GameConfig, tileId: TileId): GameState {
  if (state.phase !== GAME_PHASE.AWAITING_INPUT) return state;

  const correct = isMoveCorrect(state.revealedSequence, state.playerInput, tileId);
  if (!correct) {
    return {
      ...state,
      phase: GAME_PHASE.ROUND_FAILURE,
      playerInput: [],
      streak: 0,
      feedback: 'game.feedback.wrongTryAgain',
    };
  }

  const nextInput = [...state.playerInput, tileId];
  if (nextInput.length < state.revealedSequence.length) {
    return {
      ...state,
      playerInput: nextInput,
      activeTile: tileId,
      feedback: 'game.feedback.niceKeepGoing',
    };
  }

  const pointsPerSound =
    config.baseScorePerSound || getDifficulty(config, state.level).pointsPerStep || 10;
  const nextScore = state.score + state.revealedSequence.length * pointsPerSound;
  const atSequenceCap = state.revealedSequence.length >= state.sequence.length;
  const nextRevealedSequence = atSequenceCap
    ? state.revealedSequence
    : [...state.revealedSequence, state.sequence[state.revealedSequence.length]];
  const nextRound = nextRevealedSequence.length;

  const turnLimitReached =
    config.turnLimit > 0 && state.revealedSequence.length >= config.turnLimit;

  if (turnLimitReached || atSequenceCap) {
    return {
      ...state,
      score: nextScore,
      highScore: Math.max(state.highScore, nextScore),
      round: nextRound,
      streak: state.streak + 1,
      phase: turnLimitReached ? GAME_PHASE.SESSION_COMPLETE : GAME_PHASE.ROUND_SUCCESS,
      playerInput: [],
      revealedSequence: nextRevealedSequence,
      won: turnLimitReached,
      feedback: turnLimitReached ? 'game.feedback.sessionComplete' : 'game.feedback.maxSequence',
    };
  }

  return {
    ...state,
    score: nextScore,
    highScore: Math.max(state.highScore, nextScore),
    round: nextRound,
    level: 1,
    streak: state.streak + 1,
    phase: GAME_PHASE.ROUND_SUCCESS,
    playerInput: [],
    revealedSequence: nextRevealedSequence,
    feedback: 'game.feedback.correctNext',
  };
}

export function applySessionTimeout(state: GameState): GameState {
  return {
    ...state,
    phase: GAME_PHASE.GAME_OVER,
    playerInput: [],
    activeTile: null,
    streak: 0,
    feedback: 'game.feedback.timeUpEnded',
  };
}

export function restartGame(
  config: GameConfig,
  previousHighScore: number,
  startLen = 1,
): GameState {
  const next = createInitialGameState(config, startLen);
  return { ...next, highScore: previousHighScore };
}
