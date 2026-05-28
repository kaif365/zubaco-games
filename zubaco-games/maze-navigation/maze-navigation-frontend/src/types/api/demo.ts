export interface DemoMazeLevelDto {
  levelId: string;
  levelName: string;
  rows: number;
  cols: number;
  mazeGrid: number[][];
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
  shortestPathLength: number;
}

export interface DemoSessionDto {
  stageId: string;
  enableDemo: boolean;
  alreadySeen: boolean;
  levels: DemoMazeLevelDto[];
}

export type DemoSessionResponse = DemoSessionDto;
