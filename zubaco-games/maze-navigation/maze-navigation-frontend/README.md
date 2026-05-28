# Maze Navigation Frontend

Vite + React Router SPA for the Maze Navigation game. Layout and config follow the shared ZUBACO pattern used in Arrow Game and Sequence Recall (`src/app/config`, `src/app/providers`, `src/app/router`).

## Getting Started

```bash
npm install
cp .env.example .env.local
# Set VITE_API_BASE_URL, VITE_STAGE_ID, and VITE_STAGE_NUMBER in .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script               | Description                             |
| -------------------- | --------------------------------------- |
| `npm run dev`        | Vite dev server (port 3000)             |
| `npm run build`      | Typecheck (`tsc -b`) + production build |
| `npm run preview`    | Preview production build                |
| `npm test`           | Unit tests (Vitest)                     |
| `npm run test:watch` | Vitest watch mode                       |
| `npm run test:e2e`   | Playwright e2e                          |

## Environment

Copy `.env.example` to `.env.local`. All public vars use the `VITE_` prefix.

| Variable                       | Required | Description                                                     |
| ------------------------------ | -------- | --------------------------------------------------------------- |
| `VITE_API_BASE_URL`            | Yes      | Game backend base URL                                           |
| `VITE_STAGE_ID`                | Yes      | API stage UUID                                                  |
| `VITE_STAGE_NUMBER`            | Yes      | UI stage theme `1`–`4`                                          |
| `VITE_MOCK_USER_SESSION_URL`   | No       | Dev mock-user session endpoint (dev-session token)              |
| `VITE_ADMIN_API_BASE_URL`      | No       | Admin API for stage instruction content                         |
| `VITE_STAGE_CONTENT_GAME_TYPE` | No       | Defaults to `MAZE_NAVIGATION`                                   |
| `VITE_ENCRYPTION_ENABLED`      | No       | Encrypt game API request/response bodies when `true`            |
| `VITE_ENCRYPTION_KEY`          | No       | 64-char hex AES key for API + optional at-rest token encryption |

**Stage ID is env-only** — do not pass `stage-id` in URLs, redirects, or navigation.

**Language:** `/?lang=en` or `/?lang=hi` (persisted in the `mn_lang` cookie). i18n lives under `src/lib/i18n` with locales in `src/locales/`.

### Encryption notes

- Game API payloads use AES-GCM when `VITE_ENCRYPTION_ENABLED=true` and a valid key is set (see `src/utils/crypto.ts`).
- The session JWT in `localStorage` (`maze-navigation:token`) is encrypted at rest when a 64-character `VITE_ENCRYPTION_KEY` is present, independent of `VITE_ENCRYPTION_ENABLED`.
- Stored shape is flat `{ iv, ciphertext, tag }`; legacy wrapped payloads are still read on load.

## Routes

Defined in `src/app/router/routes.ts` (`paths` export):

| Path      | Page   | Purpose                                      |
| --------- | ------ | -------------------------------------------- |
| `/`       | Home   | Instructions + Play Now / Learn (demo)       |
| `/demo`   | Demo   | Practice maze (no live session)              |
| `/game`   | Game   | Live session (status bootstrap on entry)     |
| `/result` | Result | Score summary after live end / expiry / loss |

## Authentication

Aligned with Sequence Recall / Arrow Game:

| Piece           | Location                           | Role                                                                  |
| --------------- | ---------------------------------- | --------------------------------------------------------------------- |
| Dev-session API | `src/services/authService.ts`      | `fetchDevSession(stageId)` — mock-user token in dev                   |
| App bootstrap   | `src/hooks/useDevAuth.ts`          | Hydrate token from storage; fetch dev-session only when token missing |
| Token helpers   | `src/lib/auth/index.ts`            | In-memory cache, encrypt/decrypt, `clearAuthStorage`                  |
| HTTP            | `src/services/axios.ts`            | Bearer from cache; 401 → refresh dev-session + retry once             |
| Stage bootstrap | `src/hooks/use-stage-bootstrap.ts` | Instruction content from Admin API                                    |

**401 handling:** No user-facing toast; silent dev-session refresh and request retry.

**Result Continue / Start Fresh (live):** Clear auth storage, reset settings bootstrap listeners, refetch dev-session, then navigate (see `useRequestDevAuthRefresh`).

**Demo Done:** Exit to home with skeleton first; **does not** clear the token or refetch dev-session.

## Live game bootstrap (`/game`)

On `/game` load or refresh:

1. Show `LiveGameRouteSkeleton` with interactive HUD (level/time chips use pulse skeletons, not placeholder `01` / `2:00`).
2. Call `GET /game/status` **once** (guarded by in-flight + finished refs in `src/section/maze/maze-section.tsx`).
3. Apply session to HUD (`startLivePlaying`) and render the Pixi maze when `phase === PLAYING`.
4. Terminal status → `/result`; no session → home.

Reloading `/game` must not spam the status API or stay stuck on the loading shell after a successful response.

## Gameplay & settings

- **Movement:** Pixi canvas in `src/components/custom/maze/`; live moves batched via `submit-moves` when the player stops (junction dwell / idle flush), not per keystroke.
- **Sound effects toggle** (settings): When off, all Howl instances stop; when turned back on, BGM resumes for `PLAYING` without leaving the route.
- **Turn SFX:** `pickSide` plays when the ball changes direction (junction choice, corner on auto-path, or mid-roll redirect) — not on every cell in a straight run.
- **Goal SFX:** `win` plays on portal reach **over** looping BGM (BGM is not stopped or delayed). Dispatched from `handleGoalReached` via `maze-audio-goal-reached`.
- **Start Fresh** (settings, live): End game early (no status refresh), clear live session, refresh dev-session, navigate home. Labeled as testing in the UI.
- **Demo Done:** Skeleton exit → home; token preserved.

## Project structure

```
src/
├── App.tsx                 # Root shell (providers + router)
├── main.tsx                # Vite entry
├── app/
│   ├── config/appConfig.ts # Typed env (import.meta.env)
│   ├── providers/AppProviders.tsx
│   └── router/
│       ├── AppRouter.tsx   # Per-route Suspense skeletons
│       └── routes.ts       # paths + AppRoute type
├── pages/                  # Route-level screens
├── section/                # instructions, maze, results
├── components/
├── hooks/                  # useDevAuth, use-maze-audio, use-maze-timer, …
├── store/                  # demo, live, settings (Zustand)
├── services/               # axios, game API, authService
├── lib/                    # auth, i18n, audio, maze canvas
├── locales/                # en / hi
├── constants/              # audio, maze, storage, game-session-status
├── styles/globals.css
└── types/
tests/
├── unit/                   # Vitest
└── e2e/                    # Playwright
```

## Path aliases

| Alias    | Resolves to |
| -------- | ----------- |
| `@/*`    | `src/*`     |
| `@app/*` | `src/app/*` |

## Testing

Unit tests run with Vitest (`tests/unit/**/*.test.ts`). Vitest resolves the same `@` and `@app` aliases as Vite.

- Mock env-backed config with `vi.mock("@app/config/appConfig", () => ({ appConfig: { ... } }))` — see `tests/unit/stage-utils.test.ts`.
- In React components, destructure store values/actions from hooks; use `useXStore.getState()` in tests or non-React code.

E2e tests use env-configured stage, not URL query params.

## Audio

See `public/audio/README.md` and `src/constants/audio.ts`. Controlled by `useMazeAudio` and window events in `src/types/maze-audio-events.ts`.

## Cross-game parity

For shared conventions (layout, encryption, result flows, skeleton-on-exit), see repo root `AGENTS.md`, `arrows/arrows-frontend`, Sequence Recall frontend, and this package’s `AGENTS.md`.
