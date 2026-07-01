// Static product catalog of Free Play games. The set of games is fixed platform
// data (it maps 1:1 to the backend GameType enum); per-user values such as best
// score and current level come from the backend (GET /free-play/progress).

export interface GameCatalogEntry {
  /** Backend GameType enum value (used for /free-play/start and progress lookup). */
  gameType: string;
  name: string;
  icon: string;
  /** Dev-only port the standalone game frontend serves on (see zubaco-web-lobby). */
  devPort: number;
}

export const GAME_CATALOG: GameCatalogEntry[] = [
  { gameType: 'SEQUENCE_RECALL', name: 'Sequence Recall', icon: '🔁', devPort: 3129 },
  { gameType: 'MEMORY_CARD_MATCHING', name: 'Memory Match', icon: '🃏', devPort: 3115 },
  { gameType: 'FLASH_SPOT', name: 'Flash Spot', icon: '⚡', devPort: 3105 },
  { gameType: 'OBJECT_PLACEMENT_MEMORY', name: 'Object Placement', icon: '📦', devPort: 3121 },
  { gameType: 'SLIDING_PUZZLE', name: 'Sliding Puzzle', icon: '🧩', devPort: 3131 },
  { gameType: 'BLOCK_FILL', name: 'Block Fill', icon: '🧱', devPort: 3103 },
  { gameType: 'COLOUR_SORTING', name: 'Colour Sorting', icon: '🎨', devPort: 3005 },
  { gameType: 'RAPID_CATEGORY_SORT', name: 'Rapid Category Sort', icon: '📂', devPort: 3125 },
  { gameType: 'MAZE_NAVIGATION', name: 'Maze Navigation', icon: '🏁', devPort: 3113 },
  { gameType: 'INFINITY_LOOP', name: 'Infinity Loop', icon: '♾️', devPort: 3107 },
  { gameType: 'WORD_UNSCRAMBLE', name: 'Word Unscramble', icon: '🔤', devPort: 3011 },
  { gameType: 'TRUE_FALSE_BLITZ', name: 'True/False Blitz', icon: '✅', devPort: 3135 },
  { gameType: 'ARROWS', name: 'Arrows', icon: '➡️', devPort: 3101 },
  { gameType: 'LOGIC_REFLECTOR', name: 'Logic Reflector', icon: '🪞', devPort: 3111 },
  { gameType: 'NUMBER_GRID_SPRINT', name: 'Number Grid Sprint', icon: '🔢', devPort: 3119 },
  { gameType: 'LIVE_ROUTE_BUILDER', name: 'Live Route Builder', icon: '🛤️', devPort: 3109 },
  { gameType: 'MEMORY_GROUPS', name: 'Memory Groups', icon: '🧠', devPort: 3117 },
  { gameType: 'REFLEX_ENDURANCE', name: 'Reflex Endurance', icon: '🎯', devPort: 3127 },
  { gameType: 'PATTERN_SURVIVAL', name: 'Pattern Survival', icon: '🔷', devPort: 3123 },
];

/** GameType enum value -> URL slug (e.g. SEQUENCE_RECALL -> sequence-recall). */
export function gameSlug(gameType: string): string {
  return gameType.toLowerCase().replace(/_/g, '-');
}

/**
 * Resolve the playable URL for a game. In dev the standalone game frontend runs
 * on localhost:<devPort>; in production it is served from the game.zubaco.com
 * host (which the GameScreen WebView origin allowlist permits).
 */
export function resolveGameUrl(entry: GameCatalogEntry): string {
  if (__DEV__) {
    return `http://localhost:${entry.devPort}`;
  }
  return `https://game.zubaco.com/${gameSlug(entry.gameType)}`;
}
