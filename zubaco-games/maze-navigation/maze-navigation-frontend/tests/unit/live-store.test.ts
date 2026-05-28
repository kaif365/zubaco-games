import { useLiveStore } from "@/store/live";
import { MazeGamePhase } from "@/types/maze-phase";
import { describe, expect, it } from "vitest";

describe("useLiveStore HUD", () => {
  it("startLivePlaying sets playing with server timer and score", () => {
    useLiveStore.getState().clearLiveSession();
    useLiveStore.setState({
      phase: MazeGamePhase.START,
      score: 0,
      timer: 120,
      level: 1,
    });
    useLiveStore.getState().startLivePlaying(5, 333, 42);
    const state = useLiveStore.getState();
    expect(state.phase).toBe(MazeGamePhase.PLAYING);
    expect(state.timer).toBe(333);
    expect(state.score).toBe(42);
    expect(state.level).toBe(5);
  });

  it("finishLiveSuccess sets win and total score", () => {
    useLiveStore.setState({ phase: MazeGamePhase.PLAYING });
    useLiveStore.getState().finishLiveSuccess(900);
    const state = useLiveStore.getState();
    expect(state.phase).toBe(MazeGamePhase.WIN);
    expect(state.score).toBe(900);
  });
});
