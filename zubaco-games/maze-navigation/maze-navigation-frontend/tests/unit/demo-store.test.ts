import demoService from "@/services/api/demo";
import { useDemoStore } from "@/store/demo";
import type { DemoMazeLevelDto, DemoSessionResponse } from "@/types/api/demo";
import { MazeGamePhase } from "@/types/maze-phase";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api/demo", () => ({
  default: {
    getDemo: vi.fn(),
  },
}));

function mockDemoLevel(levelId: string): DemoMazeLevelDto {
  return {
    levelId,
    levelName: levelId,
    rows: 5,
    cols: 5,
    mazeGrid: [
      [1, 1, 1],
      [1, 0, 1],
      [1, 1, 1],
    ],
    startRow: 1,
    startCol: 1,
    endRow: 1,
    endCol: 1,
    shortestPathLength: 1,
  };
}

function seedMultiLevelDemo(levelCount: number, currentLevelIndex: number) {
  useDemoStore.setState({
    demoSession: {
      stageId: "stage-demo",
      enableDemo: true,
      alreadySeen: false,
      levels: Array.from({ length: levelCount }, (_, i) =>
        mockDemoLevel(`level-${i + 1}`),
      ),
    },
    currentLevelIndex,
    phase: MazeGamePhase.PLAYING,
    score: 10,
    timer: 40,
    level: currentLevelIndex + 1,
    isLoadingDemo: false,
  });
}

const getDemoMock = vi.mocked(demoService.getDemo);

describe("useDemoStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useDemoStore.setState({
      phase: MazeGamePhase.START,
      score: 0,
      timer: 120,
      level: 1,
      demoSession: null,
      currentLevelIndex: 0,
      isLoadingDemo: false,
      demoTutorialStep: "idle",
      demoLevel0TutorialCompleted: false,
    });
  });
  it("decrements timer without going negative", () => {
    useDemoStore.setState({ timer: 1 });
    useDemoStore.getState().decrementTimer();
    useDemoStore.getState().decrementTimer();
    expect(useDemoStore.getState().timer).toBe(0);
  });

  it("resets game to active gameplay state", () => {
    seedMultiLevelDemo(2, 0);
    useDemoStore.setState({
      phase: MazeGamePhase.WIN,
      score: 99,
      timer: 10,
    });
    useDemoStore.getState().resetGame();
    const state = useDemoStore.getState();
    expect(state.phase).toBe(MazeGamePhase.PLAYING);
    expect(state.score).toBe(0);
    expect(state.timer).toBe(120);
    expect(state.level).toBe(1);
  });

  it("resetGame honors stage level", () => {
    useDemoStore.getState().resetGame(3);
    expect(useDemoStore.getState().level).toBe(3);
  });

  it("goToStart honors stage level", () => {
    useDemoStore.getState().goToStart(4);
    const state = useDemoStore.getState();
    expect(state.phase).toBe(MazeGamePhase.START);
    expect(state.level).toBe(4);
  });

  it("completes level and applies score formula", () => {
    useDemoStore.setState({ score: 10, phase: MazeGamePhase.PLAYING });
    useDemoStore.getState().completeLevel(40);
    const state = useDemoStore.getState();
    expect(state.phase).toBe(MazeGamePhase.WIN);
    expect(state.score).toBe(10 + 50 + Math.floor(40 * 0.5));
  });

  it("reachDemoGoal advances to next level while staying in PLAYING", () => {
    seedMultiLevelDemo(3, 0);
    const result = useDemoStore.getState().reachDemoGoal(40);
    const state = useDemoStore.getState();
    expect(result).toBe("advanced");
    expect(state.currentLevelIndex).toBe(1);
    expect(state.phase).toBe(MazeGamePhase.PLAYING);
    expect(state.level).toBe(2);
    expect(state.timer).toBe(120);
    expect(state.score).toBe(10 + 50 + Math.floor(40 * 0.5));
  });

  it("loadDemo coalesces concurrent calls to one API request", async () => {
    let resolveDemo: (value: DemoSessionResponse) => void = () => {};
    const demoPromise = new Promise<DemoSessionResponse>((resolve) => {
      resolveDemo = resolve;
    });
    getDemoMock.mockReturnValue(demoPromise);

    const first = useDemoStore.getState().loadDemo();
    const second = useDemoStore.getState().loadDemo();

    expect(getDemoMock).toHaveBeenCalledTimes(1);
    expect(useDemoStore.getState().demoSession).toBeNull();
    expect(useDemoStore.getState().isLoadingDemo).toBe(true);

    resolveDemo({
      stageId: "stage-1",
      enableDemo: true,
      alreadySeen: false,
      levels: [mockDemoLevel("only-level")],
    });

    await Promise.all([first, second]);

    expect(useDemoStore.getState().demoSession?.levels[0]?.levelId).toBe(
      "only-level",
    );
    expect(useDemoStore.getState().phase).toBe(MazeGamePhase.PLAYING);
  });

  it("startDemoTutorial begins on demo level 1 when eligible", () => {
    seedMultiLevelDemo(2, 0);
    useDemoStore.getState().startDemoTutorial();
    expect(useDemoStore.getState().demoTutorialStep).toBe("ball");
  });

  it("advanceDemoTutorial steps through ball to done", () => {
    seedMultiLevelDemo(2, 0);
    useDemoStore.getState().startDemoTutorial();
    useDemoStore.getState().advanceDemoTutorial();
    expect(useDemoStore.getState().demoTutorialStep).toBe("controls");
    useDemoStore.getState().advanceDemoTutorial();
    expect(useDemoStore.getState().demoTutorialStep).toBe("path");
    useDemoStore.getState().advanceDemoTutorial();
    expect(useDemoStore.getState().demoTutorialStep).toBe("portal");
    useDemoStore.getState().advanceDemoTutorial();
    expect(useDemoStore.getState().demoTutorialStep).toBe("done");
  });

  it("reachDemoGoal from level 0 marks tutorial completed", () => {
    seedMultiLevelDemo(2, 0);
    useDemoStore.setState({ demoTutorialStep: "path" });
    useDemoStore.getState().reachDemoGoal(40);
    const state = useDemoStore.getState();
    expect(state.demoLevel0TutorialCompleted).toBe(true);
    expect(state.demoTutorialStep).toBe("done");
    expect(state.currentLevelIndex).toBe(1);
  });

  it("reachDemoGoal finishes demo on last level", () => {
    seedMultiLevelDemo(3, 2);
    const result = useDemoStore.getState().reachDemoGoal(40);
    const state = useDemoStore.getState();
    expect(result).toBe("finished");
    expect(state.currentLevelIndex).toBe(2);
    expect(state.phase).toBe(MazeGamePhase.WIN);
    expect(state.score).toBe(10 + 50 + Math.floor(40 * 0.5));
  });
});
