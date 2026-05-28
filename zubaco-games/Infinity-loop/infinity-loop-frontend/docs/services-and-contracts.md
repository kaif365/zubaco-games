# Services and Contracts

## REST Service Layer

The HTTP service layer lives under `src/services`. A **single** Axios client ([`src/services/axios.ts`](Infinity-loop/infinity-loop-frontend/src/services/axios.ts)) defaults to `NEXT_PUBLIC_API_BASE_URL` and attaches a Bearer token from plain local storage. Per-request **`baseURL`** overrides select the host:

- **Game API**: default instance `baseURL` (`resolveGameApiBase()`).
- **Admin stage-content**: `resolveAdminBase()` → trimmed `NEXT_PUBLIC_ADMIN_API_BASE_URL`, or game API base if unset.
- **Dev-session** (`user/auth/dev-session`): `resolveDevSessionBase()` → trimmed `NEXT_PUBLIC_MOCK_USER_SESSION_URL`, or game API base if unset.

- `src/services/fetcher.ts`
  - generic `httpGet/httpPost/httpPut/httpPatch/httpDelete`
  - builds URLs from `BASE_URL` + endpoint path
- `src/services/endpoints.ts`
  - central endpoint path definitions for game APIs
- `src/services/api/auth`
  - `user/auth/dev-session` (`startUserSession`, `ensureUserSession`); token read/write in [`src/lib/auth/index.ts`](Infinity-loop/infinity-loop-frontend/src/lib/auth/index.ts)
- `src/services/api/game`
  - typed CRUD service for game level resources and `v1/user/demo` (`getUserDemo`)
- `src/services/api/config`
  - admin stage-content accessor (`getGameConfig`)

## Game REST Endpoints

Defined in `src/services/endpoints.ts`:

- `GAME_LEVELS` -> `api/game/levels`
- `GAME_LEVEL_BY_ID(id)` -> `api/game/levels/:id`
- `USER_DEMO` -> `v1/user/demo`
- `ADMIN_GAMES_STAGE_CONTENT` -> `admin/games/stage-content`
- `USER_AUTH_DEV_SESSION` -> `user/auth/dev-session` (POST from [`src/services/api/auth`](../src/services/api/auth/index.ts) using `resolveDevSessionBase()`)

Admin stage-content requests include:

- `stage_id`: active backend stage id
- `game_type`: `DEFAULT_GAME_CONFIG.settings.gameType`
- `lang`: active app locale uppercased (`EN` or `HI`)

## Socket Contracts

Socket constants and payload contracts are defined by:

- `src/constants/socket.ts`
- `src/types/socket.ts`

Primary game events:

- `game:start`
- `game:started`
- `game:rotate`
- `game:rotate:batch`
- `game:already_finished`
- `exception` (envelope: `{ success: false, statusCode?, message, data? }`; surfaced as UI toast when unhandled)

Payload highlights:

- Start payload: no body; auth/session context is carried by the socket connection token.
- Rotate payload: `{ r: number, c: number, timestamp: number, boardId: string | null }`
- Rotate batch payload: `{ moves: Array<{ r: number, c: number, timestamp: number, boardId: string | null }> }`
- Completion payload: backend response includes score/time bonus

## Integration Notes

- `src/hooks/use-game-socket.ts` is the single hook for socket emits/listeners.
- Start listeners bind to `game:started` and use that payload as the board initialization path.
- `src/section/game/game-section.tsx` orchestrates optimistic UI rotation, reconnect recovery, and server reconciliation.
- Batched rotate emits are used as a recovery path for stale/unacked move queues; unresolved batched moves fall back to per-tile rotate emits.
- `boardId` in rotate payloads lets the backend/client disambiguate in-flight moves when progression advances to a new board.
- `exception`, generic socket errors, and `AUTH_FAILED` / `SESSION_EXPIRED` codes are parsed in `src/utils/socket.ts` and handled in `game-section.tsx` (toast vs session-expired banner).
- Session-expired errors are surfaced as dedicated UI state (separate from plain disconnection/reconnect status).
- Contract-level regression tests are in `tests/unit/game-contracts.test.ts`.
