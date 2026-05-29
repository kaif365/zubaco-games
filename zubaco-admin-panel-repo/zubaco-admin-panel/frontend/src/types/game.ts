import type { Stage } from '@/types/stage';

export type GameStatus = 'active' | 'inactive' | 'draft';
export type GameCategory =
  | 'puzzle'
  | 'action'
  | 'strategy'
  | 'adventure'
  | 'arcade'
  | 'sports';
export enum GameType {
  SequenceRecall = 'sequence-recall',
  Arrow = 'arrow',
  Sudoku = 'sudoku',
  SlidingPuzzle = 'sliding-puzzle',
  BlockFill = 'block-fill',
  InfinityLoop = 'infinity-loop',
  MemoryCardMatching = 'memory-card-matching',
  Generic = 'generic',
  SpotTheDifference = 'spot-the-difference',
}

export type GameLanguageCode = string;

export type LocalizedSectionContent = Partial<
  Record<GameLanguageCode, string[]>
>;

export interface GameContentPoint {
  title: string;
  description?: string;
}

export type GameContentPointType = 'ORDERED' | 'UNORDERED';

export interface GameContentPage {
  visible_in_app: boolean;
  title: string;
  description?: string;
  point_type: GameContentPointType;
  points: GameContentPoint[];
}

export interface GameContent {
  pages: GameContentPage[];
  play_now_button?: string;
  learn_how_to_play?: string;
}

export interface GameContentSection {
  id?: string;
  game_id?: string;
  stage_id?: string;
  language: string;
  content: GameContent;
  created_at?: string;
  updated_at?: string;
}

export interface LevelConfig {
  level_id: string;
  board_count: number;
  sort_order: number;
  is_demo: boolean;
  display_time?: number;
  // Satisfy union with GenericRawLevel for safe property access
  levelId?: string;
  id?: string;
  boardCount?: number;
  displayTime?: number;
}

export interface GenericRawLevel {
  level_id?: string;
  levelId?: string;
  id?: string;
  board_count?: number;
  boardCount?: number;
  display_time?: number;
  displayTime?: number;
  is_demo?: boolean;
}

export interface Game {
  id: string;
  name: string;
  category: GameCategory;
  totalLevels: number;
  status: GameStatus;
  createdAt?: string;
  lastUpdated: string;
  thumbnail?: string;
  description?: string;
  gameType?: GameType;
  stages?: Stage[];
}

export interface AdminGame {
  id: string;
  name: string;
  /** Raw API enum / slug, e.g. ARROWS, SEQUENCE_RECALL — used for config mapping. */
  game_type?: string;
  gameType: GameType;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  stages: Stage[];
  visibleInApp?: boolean;
  languages?: string[];
  level_configs?: LevelConfig[];
  status?: string;
  time_limit?: number;
  hint_count?: number;
  hintCount?: number;
  enable_demo?: boolean;
  cell_count?: number;
  min_sequence?: number;
  max_sequence?: number;
  demo_min_sequence?: number;
  demo_max_sequence?: number;
  flash_delay?: number;
  level_delay?: number;
  bonus_time_ratio?: number;
  score_per_click?: number;
  wrong_move_handling?: number;
  total_actual_rounds?: number;
  total_demo_rounds?: number;
  active_level_id?: string;
  il_title?: string;
  il_description?: string;
  il_background_sound_url?: string;
  il_tap_sound_url?: string;

  // New content sections
  content_sections?: GameContentSection[];

  // Legacy fields for backward compatibility during migration
  about?: {
    visibleInApp: boolean;
    content: Record<string, string[]>;
  };
  scoringRules?: {
    visibleInApp: boolean;
    content: Record<string, string[]>;
  };
  antiCheatRules?: {
    visibleInApp: boolean;
    content: Record<string, string[]>;
  };
  // New visibility flags
  about_visible?: boolean;
  scoring_rules_visible?: boolean;
  anti_cheat_rules_visible?: boolean;

  game_config?: {
    levels?: GenericRawLevel[];
    enableNumbers?: boolean;
    [key: string]: unknown;
  };
}

export interface AdminGamesResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    items: AdminGame[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
      has_next: boolean;
      has_previous: boolean;
    };
  };
}
