// ─── @zubaco/game-sdk ───────────────────────────────────────────
// Shared WebView game client SDK for all Zubaco games.
//
// Usage:
//   import { bridge, GameShell, useGameTimer, useMoveQueue, createGameApi } from '@zubaco/game-sdk';
//
// Or tree-shakeable sub-path imports:
//   import { bridge } from '@zubaco/game-sdk/bridge';
//   import { useGameTimer } from '@zubaco/game-sdk/timer';

// Bridge
export { bridge } from './bridge/webview-bridge';
export type { ZubacoContext, GameEvent, GameEventType } from './bridge/webview-bridge';

// API
export { createGameApi, GameApiClient } from './api/client';
export type { ApiClientConfig, ApiResponse, ApiError, StartSessionResponse, SubmitResultResponse, TimeSyncResponse } from './api/client';

// Timer
export { useGameTimer } from './timer/useGameTimer';
export type { UseGameTimerOptions, GameTimerState, GameTimerActions } from './timer/useGameTimer';

// Moves
export { useMoveQueue } from './moves/useMoveQueue';
export type { MoveEntry, UseMoveQueueOptions, MoveQueueState, MoveQueueActions } from './moves/useMoveQueue';

// Shell
export { GameShell } from './shell/GameShell';
export { TimerDisplay } from './shell/TimerDisplay';
export { RulesScreen, getGameRules, GAME_RULES } from './shell/RulesScreen';
export type { GameShellProps, GameRenderProps, ResultScreenProps, GamePhase } from './shell/GameShell';
export type { TimerDisplayProps } from './shell/TimerDisplay';
export type { RulesScreenProps, GameRules, DemoVariant } from './shell/RulesScreen';

// Encryption
export { encrypt, decrypt } from './encryption/crypto';
