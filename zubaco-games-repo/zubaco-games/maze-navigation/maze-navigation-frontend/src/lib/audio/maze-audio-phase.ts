import { MazeGamePhase } from "@/types/maze-phase";

export interface MazePhaseAudioControls {
  playBgm: () => void;
  stopBgm: () => void;
  playWin: () => void;
  playLose: () => void;
}

export function applyMazePhaseAudio(
  phase: MazeGamePhase,
  controls: MazePhaseAudioControls,
): void {
  switch (phase) {
    case MazeGamePhase.PLAYING:
      controls.playBgm();
      return;
    case MazeGamePhase.WIN:
      controls.stopBgm();
      return;
    case MazeGamePhase.LOSE:
      controls.stopBgm();
      controls.playLose();
      return;
    case MazeGamePhase.START:
    default:
      controls.stopBgm();
  }
}
