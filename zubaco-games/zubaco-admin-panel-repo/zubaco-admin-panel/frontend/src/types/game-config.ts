export interface SequenceGameConfig {
  id: string;
  stageId: string;
  cellCount: number;
  timeLimit: number;
  minSequence: number;
  maxSequence: number;
  enableDemo: boolean;
  demoMinSequence: number;
  demoMaxSequence: number;
  flashDelay: number;
  levelDelay: number;
  bonusTimeRatio: number;
  scorePerClick: number;
  /** 1=game end, 2=play again, 3=prev sequence, 4=next sequence (default) */
  wrongMoveHandling: number;
  createdAt: string;
}

export interface ArrowGameConfig {
  id: string;
  stageId: string;
  timeLimit: number;
  maxTimeBonus?: number;
  enableDemo: boolean;
  levels: ArrowStageConfigLevel[];
  demoLevels: ArrowStageConfigLevel[];
  createdAt: string;
}

export interface ArrowStageConfigLevel {
  levelId: string;
  boardCount: number;
  displayTime?: number;
  maxScore?: number;
}

export interface ArrowLevel {
  id: string;
  name: string;
}

export interface InfinityGameConfig {
  id: string;
  stageId: string;
  timeLimit: number;
  maxTimeBonus?: number;
  levels: ArrowStageConfigLevel[];
  createdAt: string;
  /** Discriminant – must not be present on InfinityGameConfig */
  __kind?: never;
}

export interface SudokuStageConfigLevel {
  levelId: string;
  boardCount: number;
  maxScore?: number;
}

export interface SudokuGameConfig {
  id: string;
  stageId: string;
  timeLimit: number;
  maxTimeBonus?: number;
  enableDemo: boolean;
  levels: SudokuStageConfigLevel[];
  demoLevels: SudokuStageConfigLevel[];
  createdAt: string;
  /** Discriminant used to distinguish from other configs */
  __kind: "sudoku";
}

export interface SlidingPuzzleStageConfigLevel {
  levelId: string;
  boardCount: number;
  displayTime: number;
  maxScore?: number;
}

export interface SlidingPuzzleGameConfig {
  id: string;
  stageId: string;
  timeLimit: number;
  maxTimeBonus?: number;
  enableDemo: boolean;
  enableNumbers: boolean;
  levels: SlidingPuzzleStageConfigLevel[];
  demoLevels: SlidingPuzzleStageConfigLevel[];
  createdAt: string;
  /** Discriminant used to distinguish from InfinityGameConfig */
  __kind: "sliding-puzzle";
}

export interface MemoryCardMatchingStageConfigLevel {
  id?: string;
  difficultyId: string;
  boardCount: number;
  maxScore?: number;
}

export interface MemoryCardMatchingDemoLevel {
  difficultyId: string;
  boardCount: number;
}

export interface MemoryCardMatchingGameConfig {
  id: string;
  stageId: string;
  timeLimit: number;
  maxTimeBonus?: number;
  enableDemo: boolean;
  levels: MemoryCardMatchingStageConfigLevel[];
  demoLevels: MemoryCardMatchingDemoLevel[];
  createdAt: string;
  /** Discriminant used to distinguish from other level-count based configs */
  __kind: "memory-card-matching";
}

export interface BlockFillGameConfig {
  id: string;
  stageId: string;
  timeLimit: number;
  maxTimeBonus?: number;
  enableDemo: boolean;
  levels: ArrowStageConfigLevel[];
  demoLevels: ArrowStageConfigLevel[];
  createdAt: string;
  /** Discriminant used to distinguish from ArrowGameConfig */
  __kind: "block-fill";
}

export type MazeLevel = ArrowLevel;
export type MazeStageConfigLevel = ArrowStageConfigLevel;

export interface MazeGameConfig {
  id: string;
  stageId: string;
  timeLimit: number;
  maxTimeBonus?: number;
  enableDemo: boolean;
  levels: MazeStageConfigLevel[];
  demoLevels: MazeStageConfigLevel[];
  createdAt: string;
  /** Discriminant used to distinguish from ArrowGameConfig */
  __kind: "maze";
}

export interface SpotTheDifferenceStageConfigLevel {
  levelId: string;
  boardCount: number;
  maxScore?: number;
}

export interface SpotTheDifferenceGameConfig {
  id: string;
  stageId: string;
  timeLimit: number;
  maxTimeBonus?: number;
  hintCount: number;
  enableDemo: boolean;
  levels: SpotTheDifferenceStageConfigLevel[];
  demoLevels: SpotTheDifferenceStageConfigLevel[];
  createdAt: string;
  /** Discriminant used to distinguish from other configs */
  __kind: "spot-the-difference";
}

export type GameConfig =
  | SequenceGameConfig
  | ArrowGameConfig
  | BlockFillGameConfig
  | InfinityGameConfig
  | SlidingPuzzleGameConfig
  | SudokuGameConfig
  | MemoryCardMatchingGameConfig
  | MazeGameConfig
  | SpotTheDifferenceGameConfig;

export function isSequenceGameConfig(
  config: GameConfig,
): config is SequenceGameConfig {
  return "minSequence" in config;
}

export function isArrowGameConfig(
  config: GameConfig,
): config is ArrowGameConfig {
  return (
    !isSequenceGameConfig(config) &&
    !("__kind" in config) &&
    "demoLevels" in config
  );
}

export function isBlockFillGameConfig(
  config: GameConfig,
): config is BlockFillGameConfig {
  return (
    "__kind" in config &&
    config.__kind === "block-fill"
  );
}

export function isMazeGameConfig(
  config: GameConfig,
): config is MazeGameConfig {
  return (
    "__kind" in config &&
    config.__kind === "maze"
  );
}

export function isSlidingPuzzleGameConfig(
  config: GameConfig,
): config is SlidingPuzzleGameConfig {
  return (
    "__kind" in config &&
    config.__kind === "sliding-puzzle"
  );
}


export function isSudokuGameConfig(
  config: GameConfig,
): config is SudokuGameConfig {
  return (
    "__kind" in config &&
    config.__kind === "sudoku"
  );
}

export function isMemoryCardMatchingGameConfig(
  config: GameConfig,
): config is MemoryCardMatchingGameConfig {
  return (
    "__kind" in config &&
    config.__kind === "memory-card-matching"
  );
}

export function isSpotTheDifferenceGameConfig(
  config: GameConfig,
): config is SpotTheDifferenceGameConfig {
  return (
    "__kind" in config &&
    config.__kind === "spot-the-difference"
  );
}

export function isInfinityGameConfig(
  config: GameConfig,
): config is InfinityGameConfig {
  return (
    !isSequenceGameConfig(config) &&
    !("demoLevels" in config) &&
    !isSlidingPuzzleGameConfig(config) &&
    !isSudokuGameConfig(config) &&
    !isMemoryCardMatchingGameConfig(config) &&
    !isBlockFillGameConfig(config) &&
    !isMazeGameConfig(config) &&
    !isSpotTheDifferenceGameConfig(config)
  );
}
