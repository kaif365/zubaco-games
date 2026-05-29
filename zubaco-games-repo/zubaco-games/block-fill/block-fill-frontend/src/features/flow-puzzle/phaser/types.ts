import type { FlowPuzzleLevel, FlowSessionState, GridCoord } from '@/features/flow-puzzle/types';

export interface FlowBoardExternalState {
  level: FlowPuzzleLevel;
  session: FlowSessionState;
  disabled: boolean;
}

export interface FlowBoardSceneCallbacks {
  onBeginPath: (coord: GridCoord) => void;
  onDragPath: (coord: GridCoord) => void;
  onEndPath: () => void;
}

export interface FlowBoardSceneController {
  destroy: () => void;
  resize: (width: number, height: number) => void;
  sync: (state: FlowBoardExternalState) => void;
}
