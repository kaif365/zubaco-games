import { dispatchMazeGoalReachedAudio } from "@/types/maze-audio-events";
import { MazeGamePhase } from "@/types/maze-phase";
import { secondsRemainingUntil } from "@/utils/time/expiry-timer";
import { PlayerState } from "./maze-canvas-types";

export interface GoalReachedLiveActions {
  readonly setScore: (score: number) => void;
  readonly finishLiveSuccess: (totalScore: number) => void;
  readonly setTimer: (timer: number) => void;
  readonly readSessionExpiryAt: () => string | undefined;
  readonly readTotalScore: () => number | undefined;
  readonly readCurrentScore: () => number;
}

interface HandleGoalReachedParams {
  readonly isLiveGame: boolean;
  readonly demoGoalHandled: boolean;
  readonly timer: number;
  readonly flushPendingLiveMovesImmediate: () => Promise<void>;
  readonly advanceRoundAfterReachingEnd: () => Promise<{
    endBoard: { roundScore: number };
    endGame: { totalScore: number } | null;
  }>;
  readonly setPhase: (phase: MazeGamePhase) => void;
  readonly setPlayerState: (state: PlayerState) => void;
  readonly markDemoGoalHandled: () => void;
  readonly onDemoGoal: (timer: number) => void;
  readonly liveActions?: GoalReachedLiveActions;
}

export function handleGoalReached({
  isLiveGame,
  demoGoalHandled,
  timer,
  flushPendingLiveMovesImmediate,
  advanceRoundAfterReachingEnd,
  setPhase,
  setPlayerState,
  markDemoGoalHandled,
  onDemoGoal,
  liveActions,
}: HandleGoalReachedParams): void {
  if (isLiveGame) {
    if (!liveActions) {
      setPlayerState(PlayerState.IDLE);
      return;
    }

    dispatchMazeGoalReachedAudio();

    void (async () => {
      try {
        await flushPendingLiveMovesImmediate();
        const { endBoard, endGame } = await advanceRoundAfterReachingEnd();
        const serverTotal = liveActions.readTotalScore();
        liveActions.setScore(
          typeof serverTotal === "number"
            ? serverTotal
            : liveActions.readCurrentScore() + endBoard.roundScore,
        );
        if (endGame) {
          liveActions.finishLiveSuccess(endGame.totalScore);
        } else {
          const exp = liveActions.readSessionExpiryAt();
          if (exp) {
            liveActions.setTimer(secondsRemainingUntil(exp));
          }
        }
      } catch {
        setPhase(MazeGamePhase.LOSE);
      }
    })();
    setPlayerState(PlayerState.IDLE);
    return;
  }

  if (demoGoalHandled) {
    setPlayerState(PlayerState.IDLE);
    return;
  }

  dispatchMazeGoalReachedAudio();
  markDemoGoalHandled();
  setPlayerState(PlayerState.IDLE);
  onDemoGoal(timer);
}
