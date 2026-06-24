# @zubaco/game-sdk

Shared WebView game client SDK for all Zubaco games. Provides a standardized interface between games (running in WebView) and the host mobile app/web lobby.

## Installation

In any game's `package.json`:

```json
{
  "dependencies": {
    "@zubaco/game-sdk": "file:../../packages/game-sdk"
  }
}
```

Then in `vite.config.ts`, add the path alias:

```ts
resolve: {
  alias: {
    '@zubaco/game-sdk': path.resolve(__dirname, '../../packages/game-sdk/src'),
  },
}
```

## Quick Start — Full Game Integration

```tsx
import { GameShell, useGameTimer, useMoveQueue, TimerDisplay } from '@zubaco/game-sdk';

function App() {
  return (
    <GameShell
      apiConfig={{ baseUrl: 'https://api.zubaco.com' }}
      gameType="block-fill"
    >
      {(props) => <MyGame {...props} />}
    </GameShell>
  );
}

function MyGame({ session, api, onComplete, onFail }: GameRenderProps) {
  // Server-authoritative timer
  const [timer, timerActions] = useGameTimer({
    durationMs: 120_000, // 2 minutes
    serverStartTime: new Date(session.expiresAt).getTime() - 120_000,
    syncFn: () => api.timeSync(session.sessionId),
    onExpired: () => onFail('time_up'),
  });

  // Move queue with batching + crash recovery
  const [moves, moveActions] = useMoveQueue({
    sessionId: session.sessionId,
    submitFn: (batch) => api.submitMoves(session.sessionId, batch),
  });

  const handlePlayerMove = (x: number, y: number) => {
    moveActions.push('tap', { x, y });
  };

  const handleGameWin = (score: number) => {
    onComplete(score, moveActions.getPending());
  };

  return (
    <div>
      <TimerDisplay timer={timer} />
      {/* Your game UI here */}
    </div>
  );
}
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│            Mobile App (React Native)            │
│  ┌───────────────────────────────────────────┐  │
│  │           React Native WebView            │  │
│  │  window.__ZUBACO__ = { token, sessionId } │  │
│  │         ↕ postMessage bridge ↕            │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │       @zubaco/game-sdk              │  │  │
│  │  │  ┌─────────┐  ┌──────────────────┐ │  │  │
│  │  │  │ Bridge  │  │  API Client      │ │  │  │
│  │  │  └─────────┘  └──────────────────┘ │  │  │
│  │  │  ┌─────────┐  ┌──────────────────┐ │  │  │
│  │  │  │ Timer   │  │  Move Queue      │ │  │  │
│  │  │  └─────────┘  └──────────────────┘ │  │  │
│  │  │  ┌───────────────────────────────┐  │  │  │
│  │  │  │        GameShell              │  │  │  │
│  │  │  │  init→load→play→result        │  │  │  │
│  │  │  └───────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  │          ↕ HTTPS (AES-GCM)                │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                       │
              ┌────────▼─────────┐
              │  Zubaco Platform  │
              │  (NestJS Backend) │
              └──────────────────┘
```

## API Reference

### Bridge

| Method | Description |
|--------|-------------|
| `bridge.init()` | Initialize — reads `window.__ZUBACO__` context |
| `bridge.getContext()` | Get current context (token, sessionId, platform) |
| `bridge.emit(type, payload)` | Send event to host app |
| `bridge.gameCompleted(score)` | Signal game completion |
| `bridge.gameFailed(reason)` | Signal game failure |
| `bridge.requestExit()` | Request exit from host |
| `bridge.on(type, callback)` | Listen for host events |
| `bridge.destroy()` | Cleanup listeners |

### Timer — `useGameTimer(options)`

Server-authoritative countdown timer with warning threshold.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `durationMs` | number | required | Total game time |
| `serverStartTime` | number | required | Epoch ms when session started |
| `syncFn` | function | - | Server time-sync endpoint |
| `syncInterval` | number | 10000 | How often to sync |
| `warningThreshold` | number | 30000 | Red warning zone |
| `onExpired` | function | - | Called when time's up |
| `onWarning` | function | - | Called entering warning |

### Move Queue — `useMoveQueue(options)`

Batched move submission with localStorage crash recovery.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `sessionId` | string | required | For localStorage key |
| `submitFn` | function | required | Server submission endpoint |
| `batchSize` | number | 10 | Auto-flush threshold |
| `flushInterval` | number | 5000 | Time-based flush (ms) |
| `persist` | boolean | true | Enable crash recovery |

### GameShell

Lifecycle wrapper that handles: `init → loading → instructions → countdown → playing → submitting → result`

Provides `renderLoading`, `renderInstructions`, `renderCountdown`, `renderResult`, `renderError` customization slots.

## Events Sent to Host

| Event | When | Payload |
|-------|------|---------|
| `GAME_READY` | SDK initialized | `{ gameSessionId }` |
| `GAME_STARTED` | Session started | `{ sessionId }` |
| `GAME_COMPLETED` | Player won | `{ score, breakdown }` |
| `GAME_FAILED` | Player lost | `{ reason }` |
| `GAME_ERROR` | Fatal error | `{ error, code }` |
| `GAME_EXIT` | User wants out | - |
| `GAME_PAUSED` | Game paused | - |
| `GAME_RESUMED` | Game resumed | - |

## Events Received from Host

| Event | Description |
|-------|-------------|
| `PAUSE_GAME` | Host requests pause (app backgrounded) |
| `RESUME_GAME` | Host requests resume (app foregrounded) |
| `FORCE_EXIT` | Force quit (e.g., account banned) |
