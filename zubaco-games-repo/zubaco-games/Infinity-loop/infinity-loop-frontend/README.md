# Infinity Loop

Infinity Loop is a puzzle game built with Next.js App Router, React 19, and TypeScript. Rotate each tile until all paths connect into a valid closed loop.

## Tech Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS 4
- TanStack Query
- Socket.IO client
- Howler (audio)
- Phaser 4 (grid renderer)
- Vitest + Playwright

## Getting Started

Use Node.js `20.12.0` or newer. Next.js 16 requires Node `>=20.9.0`, and the current test toolchain also expects newer Node 20 APIs.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

- `npm run dev` - start local dev server
- `npm run build` - create production build
- `npm run start` - run production build locally
- `npm run lint` - run ESLint
- `npm run test` - run unit tests (Vitest)
- `npm run test:watch` - run unit tests in watch mode
- `npm run test:e2e` - run Playwright end-to-end tests

## Project Structure

- `src/app` - app shell (`layout.tsx`) and phase routes (`/`, `/demo`, `/game`, `/result`)
- `src/section/game/game-section.tsx` - main game orchestration layer
- `src/components` - UI primitives and composed game UI (`atoms`, `molecules`, `organisms`, `templates`, `custom`)
- `src/context/game-context.tsx` - central game state provider
- `src/hooks` - reusable hooks (game state, socket API, local storage, audio)
- `src/utils/get-env-stage-id.ts` — `getEnvStageId()`: trimmed `NEXT_PUBLIC_DEFAULT_STAGE_ID` or `null` (no URL query). Phase routes pass `stageId ?? ""` into `GameProvider` and `GameSection`.
- `src/constants/` - shared literals (for example `game-result.ts` exports `GAME_RESULT_VARIANT` for success/failure; re-exported from `src/store/game` for convenience).
- `src/lib/game/logic` - puzzle/engine logic and level generation
- `src/config/game-config.ts` - default game configuration and merge helpers
- `src/services` - HTTP clients, endpoint constants, and typed API service modules
- `src/store/game` - lightweight Zustand store for CMS instruction overrides and result handoff state (`GameResultVariant` type in `src/types/result-content.ts`)
- `src/types` - shared Zod schemas and TypeScript models
- `tests/unit` and `tests/e2e` - automated tests

## Runtime Flow

1. Routes are phase-based: `/` (instructions), `/demo`, `/game`, `/result`.
2. Instructions/demo/live routes call `getEnvStageId()` and pass `stageId={getEnvStageId() ?? ""}` into `GameProvider` and `stageId` into `GameSection`; root `layout.tsx` wraps the app shell (including route `children`) in a single `Suspense` for `useSearchParams`.
3. Each phase route mounts `GameProvider` + `GameSection` with the corresponding phase prop.
4. `GameProvider` combines config, state, audio effects, and UI-level settings.
5. `GameSection` coordinates phase transitions, socket lifecycle, session bootstrap/expiry handling, hints, and stage result overlays.
6. `useGameState` handles grid logic, timer, hints, and win conditions.
7. `useGameSocket` emits/receives backend events (`start`, `started`, `rotate`, `rotate:batch`, `already_finished`) for live gameplay.
8. `GamePlayArea` renders board chrome/banners/hints; `PhaserGameGrid` handles grid interaction. Result rendering uses `src/store/game` and `src/app/result/page.tsx` (no query-param result payloads).

### Dynamic Instructions and Config

- `UserProvider` bootstraps the session token for the env stage id (plain localStorage via `src/lib/auth`, `ensureUserSession` in `src/services/api/auth`).
- `useGameConfig` loads `v1/user/demo` on the instructions surface when enabled (skipped on `/demo` via `enableUserDemoFetch={false}`), then fetches admin stage content for `stageId` and the active locale once a JWT exists.
- Stage-content responses are mapped into instruction overrides via `src/utils/map-stage-content-api.ts` and merged over i18n fallback copy.
- On reload, the instructions route shows `GameInstructionsSkeleton` until token/demo/stage-content queries settle, so users do not see default slides flash before dynamic slides.
- The above-the-fold instruction overlay image is loaded eagerly to avoid LCP warnings.

### Socket Reliability Notes

- Single-tile rotates use `game:rotate`.
- Rotate emits include `timestamp` and `boardId` so late acknowledgments can be reconciled against the correct board instance.
- Recovery replays can use `game:rotate:batch` to re-send unresolved pending moves in-order.
- If a batch acknowledgment does not arrive in time, moves are retried as individual rotate emits.
- Board payloads are consumed from `game:started`, while rotate reconciliation and recovery flows remain on `game:rotate` / `game:rotate:batch`.

### Session and Connection UX

- Session bootstrap runs in the background; if it fails while a token already exists, gameplay continues and retries can happen on the next start boundary.
- A dedicated session-expired banner (in `GamePlayArea`) is shown for auth-expiry states on the tutorial path when appropriate.
- Offline and delayed socket-drop recovery use `OfflineStatusModal` in `GameSection` (live gameplay). Alerts are gated by `CONNECTION_ALERT_DELAY_MS` so the modal does not flash during initial connect.
- Demo (`/demo`) and instructions (`/`) never render socket reconnect banners.

### Hint Controller Behavior

- Levels 1-2 use tutorial hint messages that toggle on/off without consuming gameplay hint logic.
- Levels 3+ use contextual hint messaging derived from the latest hinted cell.
- Tutorial skeleton guidance is rendered only while tutorial hints are visible.

### Local Storage Integrity

- `src/utils/storage.ts` is the generic storage adapter (local/session/cookies). Only the session JWT uses **plain** localStorage (`STORAGE_KEYS.TOKEN` in `src/constants/storage.ts`, read/write via `src/lib/auth`).
- `clearSessionToken()` also strips legacy `?stage-id` / `stageId` query params via `clearLegacyUrlSearchParams()`.
- Tutorial round progress is in-memory only (`GameProvider`); it is not persisted across reloads.
- Planned iframe migration applies to session token handoff only: token will be passed via URL/init payload once at load, then the one-time token bootstrap value will be cleared after iframe game mount completes.

### Audio Reliability Notes

- Background music playback is managed by `src/hooks/use-audio.ts` with a single active Howler instance per source/loop configuration.
- Runtime toggles (enable/disable and volume changes) update the existing instance instead of recreating audio objects, preventing duplicate bg playback during reconnect/resume edge cases.

## Environment variables

| Variable                            | Purpose                                                                                                                                                                                                                                                   |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL`          | REST API base URL for game levels and `v1/user/demo`.                                                                                                                                                                                                     |
| `NEXT_PUBLIC_MOCK_USER_SESSION_URL` | Optional base URL for `user/auth/dev-session` only. When unset or blank, dev-session uses `NEXT_PUBLIC_API_BASE_URL` (same split idea as admin).                                                                                                          |
| `NEXT_PUBLIC_ADMIN_API_BASE_URL`    | Admin API base URL used for stage-content instructions/config. Falls back to `NEXT_PUBLIC_API_BASE_URL` when unset or blank.                                                                                                                              |
| `NEXT_PUBLIC_SOCKET_URL`            | Socket.IO server URL.                                                                                                                                                                                                                                     |
| `NEXT_PUBLIC_DEFAULT_STAGE_ID`      | Required for dev-session and CMS calls in local dev: trimmed stage id string. Routes pass `getEnvStageId() ?? ""` into `GameProvider` / `GameSection`. When empty, demo bootstrap and remote config queries stay disabled until a stage id is configured. |

The app obtains the session token by **POST**ing to `user/auth/dev-session` using the shared Axios client in [`src/services/axios.ts`](src/services/axios.ts) with `resolveDevSessionBase()` (see [`src/services/api/auth`](src/services/api/auth/index.ts)). The JWT is stored in plain localStorage.

## Configuration

The game is config-driven via `src/config/game-config.ts`:

- game metadata (name, tagline, description, logo)
- gameplay settings (difficulty grid sizes, default time limit, palettes)
- audio defaults and track/effect URLs

Runtime config is fetched through TanStack Query in [`src/hooks/use-game-config.ts`](src/hooks/use-game-config.ts) and [`src/services/api/config`](src/services/api/config/index.ts). If the admin response only contains stage-content copy, gameplay settings fall back to `DEFAULT_GAME_CONFIG` while instruction copy is overridden dynamically.

Audio notes:

- Background music defaults to an asset in `public/assets` and is consumed in `src/section/game/game-section.tsx` through `config.settings.audio.backgroundTrackUrl`.
- Interaction SFX (`tapSoundUrl`, `successSoundUrl`) are URL-based config values consumed in `src/hooks/use-audio-effects.ts`.
- Both are designed to be replaceable and can be made fully dynamic later through an admin-config flow.

Validation is defined in `src/types/game-config.ts` using Zod.

## Internationalization

- Locale bundles live in `src/locales/` (`en/index.ts`, `hi/index.ts`)
- Active locale comes from `?lang=en|hi` and persisted `il_lang` cookie. Client resolution/persistence lives in `src/lib/i18n/provider.tsx` via `src/lib/i18n/lang-cookie.ts`.
- Server-side locale reads the same `il_lang` cookie in `src/app/layout.tsx` and `src/lib/i18n/server.ts`.
- Client Components use `useTranslation()` from `react-i18next` directly
- Server translator helper is `getTranslation()` in `src/lib/i18n/server.ts` (single server API)

## Documentation

- `docs/architecture.md` - module-level architecture and data flow
- `docs/configuration.md` - config fields and extension guidance
- `docs/services-and-contracts.md` - REST endpoints, socket contracts, and integration notes
- `docs/testing.md` - how unit/e2e tests are organized and run
- `docs/i18n.md` - locale resolution, translation APIs, and usage guide

## Recent Behavior Changes

- Routing is phase-based: `/` (instructions), `/demo`, `/game`, `/result`.
- `stage-id`: opaque string from `getEnvStageId()` (env only; legacy `?stage-id` is stripped, not read). Tutorial UI theme buckets use `stageThemeKey` in `src/theme/colors.ts` (`"1"`–`"4"`, default `"1"`). Root layout `Suspense` covers all `useSearchParams` usage (no per-route `Suspense`).
- Socket lifecycle is live-route only (`/game`); demo flow is local.
- Offline / reconnect UX uses `OfflineStatusModal` after `CONNECTION_ALERT_DELAY_MS` on live; instructions and demo skip socket-driven offline for local play.
- Instructions now load skeleton-first on reload until dynamic stage-content is ready.
- Result screen uses runtime store state (`src/store/game`) instead of URL payload params; routing branches on `GAME_RESULT_VARIANT` with an exhaustive `switch` in `src/app/result/page.tsx`.

## Pre-Push Quality Gates

Run these before pushing:

```bash
npm run lint
npm run test
npm run build
```

For Sonar validation, run scanner after your Sonar host/token are configured:

```bash
npx sonar-scanner
```
