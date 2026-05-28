# Configuration

## Source of Truth

Default runtime configuration lives in `src/config/game-config.ts` as `DEFAULT_GAME_CONFIG`.

The schema/type contract is defined in `src/types/game-config.ts` (`GameConfigSchema` and `GameConfig`).

Remote config and instruction content are loaded by `src/hooks/use-game-config.ts` through `src/services/api/game` (`getUserDemo`), `src/services/api/config` (`getGameConfig`), and defaults from `src/config/game-config.ts`. Admin stage-content responses can override instruction copy without replacing gameplay defaults.

## Config Shape

### `gameMeta`

- `name`: display name of the game
- `logo`: logo asset path
- `tagline`: short one-line description
- `description`: longer product description

### `settings`

- `initialDifficulty`: default difficulty (`easy` | `medium` | `hard`)
- `timeLimitSeconds`: base time limit for rounds
- `gridSizes`: board sizes by difficulty
- `levelPalettes`: rotating theme palettes used by level index
- `audio`
  - `defaultTapVolume`
  - `defaultAmbienceVolume`
  - `backgroundTrackUrl`
  - `tapSoundUrl`
  - `successSoundUrl`

## Where Config Is Used

- `src/context/game-context.tsx`
  - difficulty defaults, grid sizing, and palette selection.
- `src/section/game/game-section.tsx`
  - imports background music via `config.settings.audio.backgroundTrackUrl` and passes it to `useAudio(...)`.
- `src/hooks/use-audio-effects.ts`
  - imports interaction SFX via `config.settings.audio.tapSoundUrl` and `config.settings.audio.successSoundUrl`.
- `src/hooks/use-game-state.ts`
  - uses time limit fallback values.
- `src/section/instructions/instructions-screen.tsx`
  - receives CMS-backed instruction overrides after token/demo/stage-content loading completes.

## Stage id and tutorial theming

- Active stage id is resolved only from `NEXT_PUBLIC_DEFAULT_STAGE_ID` via `getEnvStageId()` in `src/utils/get-env-stage-id.ts` (trimmed string or `null`). Phase routes pass that value as `GameProvider` **`stageId`** (same prop for tutorial and live) and into `GameSection` for sockets and bootstrap.
- Legacy `?stage-id` / `stageId` query keys are not read; `clearLegacyUrlSearchParams()` in `src/utils/clear-legacy-url-search-params.ts` strips them from the URL when the session token is cleared (also invoked from `clearSessionToken()`).
- Fixed tutorial **theme buckets** (`"1"`–`"4"`) for palette hex values, instruction overlays, and result assets are defined in `src/types/stage-theme.ts` and `src/theme/colors.ts`. `stageThemeKey(stageId)` maps any opaque stage id onto those keys; ids outside `"1"`–`"4"` use bucket `"1"`.
- Rotating `levelPalettes` from config still apply to the playable grid; live palette cycling in `GameProvider` combines tutorial round count with the numeric digit parsed from `stageThemeKey(stageId)` when `surface` is live.

## Local Persistence and Integrity

- Local storage keys are declared in `src/constants/storage.ts`.
- `src/utils/storage.ts` is a thin storage adapter (local/session/cookies).
- Session JWT is stored in **plain** localStorage (`src/lib/auth`).

### Current Flow (Standalone App)

- Session bootstrap state is persisted in local storage so refresh/reconnect flows can recover the auth token. Tutorial round progress is in-memory only (`GameProvider`).

## Socket errors and auth recovery

- Live socket errors on the `exception` channel are parsed by `parseSocketExceptionPayload()` in `src/utils/socket.ts` and surfaced as bottom-center Sonner toasts (`src/components/organisms/sonner.tsx`).
- `AUTH_FAILED` and `SESSION_EXPIRED` messages are handled before generic exception toasts (auth toast vs session-expired banner in `src/section/game/game-section.tsx`).
- Unauthorized recovery is registered in `UserProvider` via `registerUnauthorizedRecovery(rebootstrapAuth)` from `src/lib/auth` (re-exported from `src/lib/auth/session-recovery.ts`). The axios 401 interceptor in `src/services/axios.ts` calls `runUnauthorizedRecovery()` except for dev-session requests.

### Planned Iframe Flow

- Session token handoff will move to URL-driven or iframe init payload input (instead of long-lived local storage as the primary token handoff).
- Token initialization should happen once at iframe load.
- The one-time token bootstrap value should be cleared once iframe game initialization succeeds, so stale auth state is not reused.
- Tutorial/welcome local storage behavior is unchanged by this token-only iframe plan unless explicitly migrated later.

## Audio Asset Source

- Background track is currently served from `public/assets` (default: `public/assets/rainglass-drift.mp3`) and referenced through `backgroundTrackUrl`.
- Interaction sounds are currently configured as external URLs (`tapSoundUrl`, `successSoundUrl`) inside the same config object.

## Dynamic Admin Content

- `NEXT_PUBLIC_ADMIN_API_BASE_URL` points to the admin backend; when unset or blank, stage-content requests use `NEXT_PUBLIC_API_BASE_URL` (same Axios instance, per-request `baseURL`).
- `NEXT_PUBLIC_MOCK_USER_SESSION_URL` (optional, trimmed): when non-empty, `user/auth/dev-session` is called against this base instead of the game API base.
- `ADMIN_GAMES_STAGE_CONTENT` fetches stage-specific instruction content with `stage_id`, `game_type`, and uppercase locale.
- Stage-content payloads are mapped by `src/utils/map-stage-content-api.ts`.
- Instructions render a skeleton while token/demo/stage-content queries are pending, then render dynamic slides. If remote content fails, local i18n defaults remain the fallback.

Both background music and interaction sound URLs are intentionally config-driven and can be switched to admin-managed dynamic values later without changing the hook/component contracts.

## Hint and Session Messaging

- User-facing hint and connection/session labels are defined in `src/locales/en/index.ts` and `src/locales/hi/index.ts` and resolved in UI with the i18n helpers.
- Current game UX includes:
  - tutorial-specific hint copy (`hintLevelOne`, `hintLevelTwo`)
  - contextual hint copy for non-tutorial play (`hintAroundCell`)
  - transport/auth status copy (`connectionLost`, `sessionExpiredBanner`)
- Keep these keys in sync with game-level orchestration in `src/section/game/game-section.tsx` and `src/hooks/use-hint-controller.ts`.

## Updating Config Safely

1. Update `DEFAULT_GAME_CONFIG`.
2. If you add fields, update Zod schema/type in `src/types/game-config.ts`.
3. Propagate new fields only where needed; keep consumers typed.
4. Run:
   - `npm run lint`
   - `npm run test`
