import type {
  EndBoardResponse,
  EndGameResponse,
  GameApiEnvelope,
  GameMove,
  GameScoreboard,
  GameSession,
  GameStatusResponse,
  SubmitMovesResponse,
} from '@/types/logic-reflector';
import { GameStatus } from '@/types/logic-reflector';
import { LEVELS } from '../data/levels';

const TOTAL_LEVELS = LEVELS.length;
// Mock session duration — swap with real expiryAt from backend when ready
const SESSION_DURATION_MS = 3 * 60 * 1000; // 3 minutes

// ── In-memory mock state ──────────────────────────────────────────────────────
let _currentLevelIndex = 0;
let _levelScores: { levelNumber: number; score: number | null }[] = [];
let _sessionActive = false;
let _sessionId: string | null = null;

function ok<T>(data: T): GameApiEnvelope<T> {
  return { success: true, statusCode: 200, data };
}

async function delay(ms = 220): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

function makeSession(levelIndex: number): GameSession {
  const level = LEVELS[levelIndex]!;
  const now = new Date();
  return {
    sessionId: _sessionId,
    stageId: 'logic-reflector',
    status: GameStatus.STARTED,
    startedAt: now.toISOString(),
    expiryAt: new Date(now.getTime() + SESSION_DURATION_MS).toISOString(),
    totalLevels: TOTAL_LEVELS,
    currentLevel: level,
  };
}

// ── Mock API functions ────────────────────────────────────────────────────────

export async function mockGameStart(): Promise<GameApiEnvelope<GameSession>> {
  await delay();
  _currentLevelIndex = 0;
  _levelScores = [];
  _sessionActive = true;
  _sessionId = `mock-session-${Date.now().toString(36)}`;
  return ok(makeSession(0));
}

export async function mockSubmitMoves(
  moves: GameMove[],
): Promise<GameApiEnvelope<SubmitMovesResponse>> {
  await delay(100);
  return ok({ accepted: moves.length });
}

export async function mockEndBoard(): Promise<GameApiEnvelope<EndBoardResponse>> {
  await delay(200);
  const levelNumber = LEVELS[_currentLevelIndex]!.levelNumber;
  const score = Math.floor(Math.random() * 500) + 300;
  _levelScores.push({ levelNumber, score });

  const isLastLevel = _currentLevelIndex >= TOTAL_LEVELS - 1;
  if (isLastLevel) _sessionActive = false;

  return ok({ levelScore: score, gameOver: isLastLevel });
}

export async function mockGetNextLevel(): Promise<GameApiEnvelope<GameSession>> {
  await delay(250);
  _currentLevelIndex = Math.min(_currentLevelIndex + 1, TOTAL_LEVELS - 1);
  return ok(makeSession(_currentLevelIndex));
}

export async function mockEndGame(): Promise<GameApiEnvelope<EndGameResponse>> {
  await delay(150);
  _sessionActive = false;
  return ok({ status: GameStatus.MANUALLY_ENDED });
}

export async function mockGetGameStatus(): Promise<GameApiEnvelope<GameStatusResponse>> {
  await delay(150);
  if (!_sessionActive && _levelScores.length === 0) {
    return ok({ status: GameStatus.ENDED, scoreboard: undefined });
  }

  const scoreboard: GameScoreboard = {
    levels: _levelScores.map((s) => ({ levelNumber: s.levelNumber, score: s.score })),
    totalScore: _levelScores.reduce((sum, s) => sum + (s.score ?? 0), 0),
  };

  const status = _sessionActive ? GameStatus.STARTED : GameStatus.ENDED;
  return ok({ status, scoreboard, sessionId: _sessionId });
}
