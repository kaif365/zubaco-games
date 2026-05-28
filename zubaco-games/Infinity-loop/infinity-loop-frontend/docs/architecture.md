# Architecture

## High-Level Overview

Infinity Loop is a client-rendered game built on Next.js App Router. Gameplay is phase-routed: instructions (`/`), demo (`/demo`), live (`/game`), and result (`/result`).

## Main Modules

- `src/app/layout.tsx`
  - Boots global providers: i18n, TanStack `QueryProvider`, `Suspense`, `UserProvider`, `SocketProvider`, and bottom-center Sonner toasts (close button; error toasts use an info icon).
- `src/app/page.tsx`, `src/app/demo/page.tsx`, `src/app/game/page.tsx`
  - Phase route entries resolve stage id via `getEnvStageId()` (`src/utils/get-env-stage-id.ts`, `NEXT_PUBLIC_DEFAULT_STAGE_ID` only) and pass that **string** to `GameProvider` + `GameSection`.
- `src/app/result/page.tsx`
  - Renders result UI from `src/store/game` state, not URL payload params. Variant is typed as `GameResultVariant` (`src/types/result-content.ts`); literals live in `src/constants/game-result.ts` (`GAME_RESULT_VARIANT`). The page uses an exhaustive `switch` on variant so new variants fail compile-time until handled.
- `src/context/user-provider.tsx`
  - Bootstraps session via `authService.ensureUserSession` / `resetUserSession`; exposes `rebootstrapAuth` and registers it for axios 401 recovery. Token is stored in **plain** localStorage via `src/lib/auth`.
- `src/section/game/game-section.tsx`
  - Hosts gameplay orchestration, instructions gate, demo/live transitions, hint/session state, socket lifecycle, and result redirect. Large file (~1200+ lines); consider extracting live socket effects in a future PR.
- `src/utils/get-env-stage-id.ts`
  - Reads `NEXT_PUBLIC_DEFAULT_STAGE_ID` for dev-session bootstrap, `GameSection`, and `GameProvider.stageId`.
- `src/utils/clear-legacy-url-search-params.ts`
  - Strips legacy `stage-id` / `stageId` query params from the current URL (no navigation).
- `src/theme/colors.ts` and `src/types/stage-theme.ts`
  - `StageThemeKey` is `"1"`–`"4"` for fixed tutorial palettes and static overlay/icon paths. `stageThemeKey(id)` maps any `stage-id` string onto that key set; unknown values fall back to `"1"`. Consumers include `GameProvider` (palette index on live), `GameSection` (accent), instructions, and result screens.
- `src/hooks/use-hint-controller.ts`
  - Centralizes hint banner behavior for tutorial vs non-tutorial levels, including contextual cell-hint messaging and tutorial skeleton visibility.
- `src/context/game-context.tsx`
  - Aggregates config (`useGameConfig`), game state (`useGameState`), local settings, and audio SFX.
- `src/hooks/use-game-state.ts`
  - Maintains grid, timers, hints, tutorial behavior, and win/time-up state.
- `src/hooks/use-game-socket.ts`
  - Defines socket API and parsing for `game:start`, `game:started`, `game:rotate`, `game:rotate:batch`, `game:already_finished`, and `exception` (`onSocketException`).
- `src/lib/game/logic`
  - Pure game logic: engine checks, puzzle generation, handcrafted levels, payload-to-grid conversion.
- `src/services/api/game`
  - Game REST: `getUserDemo`, level CRUD endpoints.
- `src/services/api/config`
  - Admin stage-content REST (`getGameConfig`).
- `src/services/api/auth`
  - Dev-session REST (`startUserSession`, `ensureUserSession`); POST uses per-request `baseURL` from [`src/services/axios.ts`](Infinity-loop/infinity-loop-frontend/src/services/axios.ts) (`resolveDevSessionBase`: mock URL or game API).
- `src/lib/auth`
  - Plain localStorage session JWT helpers (`readSessionToken`, `writeSessionToken`, `clearSessionToken`) and unauthorized recovery (`registerUnauthorizedRecovery`, `runUnauthorizedRecovery` from `session-recovery.ts`).

## Rendering Layers

- `components/templates` provide screen-level shell.
- `components/organisms` provide game-specific sections (header, settings drawer, Phaser grid wrapper, animated background).
- `components/molecules` and `components/atoms` provide reusable UI pieces.
  - Header identity markup is extracted into `components/molecules/game-header-logo.tsx` and consumed by `components/organisms/game-header.tsx`.
- `components/custom` hosts extracted gameplay composites (`GameHintBanner`, `GamePlayArea`).

## Tutorial vs Server-Driven Levels

- Demo phase (`/demo`) is local-only and uses handcrafted tutorial boards.
- Live phase (`/game`) is socket-backed:
  - `GAME_STARTED` provides puzzle payload.
  - `ROTATE` responses reconcile optimistic local rotations.
  - `ALREADY_FINISHED` signals a server-known completed stage state.

## Data and State Flow

1. `UserProvider` bootstraps the session token from env stage id (`getEnvStageId` / `NEXT_PUBLIC_DEFAULT_STAGE_ID`, plain storage + `ensureUserSession`). TanStack cache helpers in `src/lib/query/session-query-cache.ts` (key roots in `src/constants/react-query-keys.ts`) clear or invalidate `userDemo` / `gameConfig` when the session is wiped or re-established.
2. `useGameConfig` loads the user demo API on the instructions path when enabled, then fetches admin stage-content once a bearer token exists; gameplay defaults come from `DEFAULT_GAME_CONFIG` when CMS omits `gameConfig`.
3. `src/store/game` exposes CMS instruction overrides and result handoff state (default export; `GAME_RESULT_VARIANT` re-exported from `src/constants/game-result.ts`).
4. `GameProvider` (`src/context/game-context.tsx`) takes `surface` from `GAME_PLAY_SURFACE` (`src/constants/game-play-surface.ts`) and a single `stageId` for both tutorial and live routes; it wires `useGameConfig`, `useGameState`, settings, and theme palette.
5. `GameSection` gates instructions with `GameInstructionsSkeleton`, coordinates socket handshake, optimistic rotation, and completion workflow.
6. `useGameState` updates playable grid, hints, and timer.
7. `GamePlayArea` + `PhaserGameGrid` render state and dispatch tile interactions.

## Session and alert / offline UX

- `GameSection` tracks session-expired state separately from socket connectivity; the session-expired banner is rendered inside `GamePlayArea` (tutorial path when the session is invalid).
- Offline and delayed socket-drop recovery use `OfflineStatusModal` in `GameSection`, driven by browser `online`/`offline` and `showConnectionAlert` (live phase only, after `CONNECTION_ALERT_DELAY_MS`). Demo and instructions do not open this modal for socket loss.

## Audio Lifecycle

- `GameSection` mounts background audio via `useAudio(config.settings.audio.backgroundTrackUrl, ...)`.
- `useAudio` keeps a single Howler instance alive for the active source and applies enabled/volume updates in-place.
- Instance recreation is limited to source/loop changes to avoid overlapping background playback during connection interruptions and resume flows.
