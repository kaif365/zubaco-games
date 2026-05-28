# Infinity Loop — Game Design Document

## 1. Overview

Infinity Loop is a tile-rotation puzzle game where the player turns pipe-like pieces until every connection forms a valid closed loop. The current implementation combines:

- a dedicated local demo route (`/demo`) with tutorial boards
- a dedicated live route (`/game`) that is socket-driven
- stage-level time control from the admin setup
- board authoring and puzzle generation tools in the admin repo

The player-facing game lives in this repo (`infinity-loop`). The stage, level, and board management tools live in the sibling admin repo (`../admin-settings`).

## 2. Admin Panel & Configuration

The current admin implementation supports stage setup, level management, and board CRUD for Infinity Loop.

### 2.1 Stage Settings

`timeLimitSeconds`

- Configured per stage in the admin panel.
- Stored through the stage-config API as `timeLimit`.
- Default stage value is `180` seconds.

`selectedPresetGameIds`

- Each stage can select preset games.
- Infinity Loop is the only preset with active settings screens at the moment.

### 2.2 Levels

In the current implementation, a `level` is not a difficulty tier.

A level is:

- a named entity created through the admin panel
- linked to a stage through the stage-config service
- used as the container that boards belong to

Important implementation note:

- The API contract includes stage-to-level links with `boardCount`.
- When a new level is linked, the admin service currently initializes `boardCount: 0`.
- There is no current UI in `../admin-settings` for editing `boardCount`, so board allocation counts are part of the backend contract but are not yet operator-configurable from the shipped admin screens.

### 2.3 Boards

Boards are the actual playable puzzle records attached to a level.

Each board currently supports:

- `name`
- `difficulty` (`EASY`, `MEDIUM`, `HARD`)
- square grid size from `2x2` to `10x10`
- `color`
- `generationLimit` from `1` to `10`
- a selected puzzle pair
- saved randomized grid data

The admin board flow is:

1. Create a board.
2. Choose grid size and difficulty.
3. Request generated puzzle pairs from the puzzle generator service.
4. Select one puzzle pair.
5. Optionally edit the randomized version tile-by-tile.
6. Save the selected randomized grid back to the board record.

Each generated row contains:

- a read-only solved grid
- an editable randomized grid

### 2.4 Configuration Reference

| Setting          | Parameters                                                                                                   | Description                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Stage            | `timeLimitSeconds`, `selectedPresetGameIds[]`                                                                | Defines stage timer and which preset games are attached to the stage.                                       |
| Game             | `title`, `description`, `bgSoundUrl`, `tapSoundUrl`, `levels[]`                                              | Defines Infinity Loop metadata and audio settings shown in admin.                                           |
| Level            | `id`, `name`                                                                                                 | Defines a named grouping of boards under a stage.                                                           |
| Board            | `name`, `difficulty`, `rows`, `columns`, `color`, `generationLimit`, `selectedPuzzlePairId`, `puzzlePairs[]` | Defines the playable puzzle source and board presentation options.                                          |
| Stage-Level Link | `stageConfigId`, `levelId`, `boardCount`                                                                     | Exists in the backend/admin service contract, but `boardCount` is not yet editable in the current admin UI. |

## 3. Gameplay Flow & Rules

### 3.1 Player Journey

Instructions gate

- An instructions screen appears before gameplay begins; the player chooses **Play Now** (live) or **Learn** (tutorial demo).

Demo Phase (`/demo`)

- Uses local tutorial boards built from handcrafted layouts and shuffled client-side.
- Tutorial hints are customized for the demo boards.
- No socket lifecycle/banners are required in this phase.

Live Phase (`/game`)

- Live gameplay is socket-backed from phase start.
- The client emits `game:start` to request the next playable board.
- The backend returns the authoritative board grid and remaining time.

Board Interaction

- Tapping a tile rotates it by 90 degrees clockwise.
- The client applies the rotation immediately for responsiveness.
- For socket-backed boards, the client then emits `game:rotate` with `{ r, c, timestamp, boardId }`.

Server Reconciliation

- If the backend rejects or fails to confirm a rotation, the client reverts the optimistic move.
- If the backend accepts the move, the returned board grid becomes the active state.

Board Progression

- When a tutorial board is solved, the game auto-advances to the next board after a short solved-state transition.
- In socket-backed play, a successful rotate response may include `nextBoard`.
- If `nextBoard` is present, the client starts that board immediately from backend data.
- If the stage is complete, the client opens a full-screen result view instead of loading another board.

Run End

- The run ends when time reaches zero on the active board or when the backend reports stage completion.
- If the backend reports the stage was already finished, the client shows the result screen with the returned summary.
- Result rendering reads from in-app state (`src/store/game`) instead of query-param payloads.

### 3.2 Core Rules

Objective

- Rotate every playable tile until all open paths connect into a valid closed loop.

Move Rules

- Empty cells remain non-playable.
- Each tap rotates one tile clockwise.
- The move counter increases on each accepted local interaction and is rolled back if a socket-backed move times out or is rejected.

Hints

- Tutorial boards use fixed hint text.
- Later boards can highlight one incorrect tile at a time.

Difficulty in the Live Client

- The settings drawer shows `easy`, `medium`, and `hard`.
- Complexity selection is currently disabled in the shipped UI.
- Default grid sizes in runtime config are `4`, `6`, and `8`, but socket-backed boards ultimately render from backend-provided grid data.

### 3.3 Scoring and Completion Data

The current client can display backend-provided completion data, including:

- `score`
- `totalScore`
- `boardsCompleted`
- `boardsTotal`
- completion message text

Important implementation note:

- Active socket contracts rely on `game:start`, `game:started`, `game:rotate`, `game:rotate:batch`, and `game:already_finished`.
- Stage completion is derived from rotate/already-finished response paths rather than a dedicated complete-event channel.
- `timeBonus` exists in client types/state, but it is not part of the currently wired stage-complete result screen flow.

## 4. Backend Validation Model

Infinity Loop is partially backend-authoritative in the current shipped flow.

### 4.1 Local Tutorial Validation

The first two tutorial boards are resolved locally:

- tutorial layouts are loaded from handcrafted level data
- the client checks loop completion locally
- no socket validation is required for these boards

### 4.2 Socket-Backed Board Validation

After the tutorial:

- the backend supplies the board grid through `game:started` responses
- the client sends rotate requests one move at a time
- the backend response determines whether the board is solved, whether the stage is complete, and whether another board should load

### 4.3 Authoritative State Sources

For socket-backed boards, the backend is authoritative for:

- current board layout after reconciliation
- remaining time supplied in start/next-board payloads
- stage completion state
- stage summary values such as board totals and score fields returned by the backend

Implementation boundary:

- The client still performs optimistic visual rotation first.
- If the backend response does not confirm the move within the timeout window, the client restores the previous tile rotation.

## 5. Security & Runtime Integrity

Only implementation-backed items are documented here.

### 5.1 Socket Session Protection

The socket client connects only when `NEXT_PUBLIC_SOCKET_URL` is defined and sends auth data during the handshake.

Current implementation detail:

- the client token is resolved from user session state loaded by `UserProvider`
- the session token is created via the shared [`axios`](../src/services/axios.ts) client (POST to `user/auth/dev-session` using `resolveDevSessionBase()`) and persisted in plain localStorage; it is reused for socket auth (`authorization` + `token` fields)
- socket mount is route-gated to live gameplay (`/game`)
- if token hydration is not ready or no token is available, socket mount is delayed/skipped

### 5.2 State Integrity

The live game protects runtime consistency through:

- backend-issued board payloads for socket-backed play
- server-reconciled rotate responses
- client-side rollback if a pending rotate is not confirmed
- explicit already-finished handling through `game:already_finished`
- plain local persistence for session token only; tutorial round index is in-memory (`GameProvider`)
- `game:already_finished` redirects to the result screen with summary state; session rebootstrap is used on 401 and Results Continue, not on already-finished

### 5.3 Not Present in the Current Repos

The following concepts from the sample Arrow Game document are not evidenced in these repos and should not be treated as implemented for Infinity Loop:

- client batching of tap telemetry
- timestamp-based anti-cheat analysis
- payload encryption/decryption at render time
- silent anti-cheat account flagging

## 6. Implementation Basis

This document is based on the current behavior and contracts in:

- `infinity-loop`
  - gameplay flow, socket handling, local tutorial logic, runtime config, and completion UI
- `../admin-settings`
  - stage settings, level management, board CRUD, puzzle generation, and stage-level link contracts
