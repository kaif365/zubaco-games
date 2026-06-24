# Game-Specific Pool Types

This folder is for **game-specific board/pool types** and any **game-specific JSON → create payload** helpers.

## Adding a new game

1. Create `src/types/games/<game-slug>.ts` and define:
   - `export interface <Game>Board extends BaseGameBoard { ... }` (optional)
   - `export interface Create<Game>BoardRequest { ... }` (optional)
   - `export function build<Game>CreatePayloadFromJson(...) { ... }` (optional)
2. Register the game’s pool adapter in `src/config/pool-registry.ts`.
   - If you don’t register an adapter, the default behavior is:
     - JSON must be an object
     - payload is `{ levelId, name, ...json }`

`CreatePoolModal` always uses the adapter returned by `getGamePoolAdapter(gameName)`.
