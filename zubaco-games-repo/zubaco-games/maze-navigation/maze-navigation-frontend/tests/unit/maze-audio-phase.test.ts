import { applyMazePhaseAudio } from "@/lib/audio/maze-audio-phase";
import { MazeGamePhase } from "@/types/maze-phase";
import { describe, expect, it, vi } from "vitest";

function createControls() {
  return {
    playBgm: vi.fn(),
    stopBgm: vi.fn(),
    playWin: vi.fn(),
    playLose: vi.fn(),
  };
}

describe("applyMazePhaseAudio", () => {
  it("starts bgm in PLAYING", () => {
    const controls = createControls();
    applyMazePhaseAudio(MazeGamePhase.PLAYING, controls);

    expect(controls.playBgm).toHaveBeenCalledTimes(1);
    expect(controls.stopBgm).not.toHaveBeenCalled();
  });

  it("stops bgm in WIN (goal SFX plays on portal reach)", () => {
    const controls = createControls();
    applyMazePhaseAudio(MazeGamePhase.WIN, controls);

    expect(controls.stopBgm).toHaveBeenCalledTimes(1);
    expect(controls.playWin).not.toHaveBeenCalled();
    expect(controls.playLose).not.toHaveBeenCalled();
  });

  it("stops bgm and plays lose in LOSE", () => {
    const controls = createControls();
    applyMazePhaseAudio(MazeGamePhase.LOSE, controls);

    expect(controls.stopBgm).toHaveBeenCalledTimes(1);
    expect(controls.playLose).toHaveBeenCalledTimes(1);
    expect(controls.playWin).not.toHaveBeenCalled();
  });

  it("stops bgm in START", () => {
    const controls = createControls();
    applyMazePhaseAudio(MazeGamePhase.START, controls);

    expect(controls.stopBgm).toHaveBeenCalledTimes(1);
    expect(controls.playBgm).not.toHaveBeenCalled();
  });
});
