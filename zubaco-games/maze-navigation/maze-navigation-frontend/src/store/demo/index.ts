import {
  MAZE_LEVEL_COMPLETE_BASE_SCORE,
  MAZE_START_TIMER,
  MAZE_TIMER_SCORE_FACTOR,
} from '@/constants/maze';
import { logger } from '@/lib/default-logger';
import demoService from '@/services/api/demo';
import type { DemoMazeLevelDto, DemoSessionDto } from '@/types/api/demo';
import { MazeGamePhase } from '@/types/maze-phase';
import { type DemoTutorialStep, getNextDemoTutorialStep } from '@/utils/maze/demo-tutorial';
import { normalizeStageId } from '@/utils/stage/stage-utils';
import i18next from 'i18next';
import { toast } from 'sonner';
import { create, type StateCreator } from 'zustand';

export type { DemoTutorialStep };

interface DemoState {
  phase: MazeGamePhase;
  score: number;
  timer: number;
  level: number;
  demoSession: DemoSessionDto | null;
  currentLevelIndex: number;
  isLoadingDemo: boolean;
  demoTutorialStep: DemoTutorialStep;
  demoLevel0TutorialCompleted: boolean;
  shouldRedirectHomeAfterNoDemoLevels: boolean;
}

interface DemoActions {
  setPhase: (phase: MazeGamePhase) => void;
  setScore: (score: number) => void;
  setTimer: (timer: number) => void;
  decrementTimer: () => void;
  loadDemo: () => Promise<void>;
  goToStart: (stageLevel?: number) => void;
  resetGame: (stageLevel?: number) => void;
  completeLevel: (remainingTime: number) => void;
  reachDemoGoal: (remainingTime: number) => 'advanced' | 'finished';
  startDemoTutorial: () => void;
  advanceDemoTutorial: () => void;
  completeDemoLevel0Tutorial: () => void;
  clearNoDemoLevelsRedirect: () => void;
}

export type DemoStore = DemoState & DemoActions;

function levelCompletionScore(currentScore: number, remainingTime: number): number {
  return (
    currentScore +
    MAZE_LEVEL_COMPLETE_BASE_SCORE +
    Math.floor(remainingTime * MAZE_TIMER_SCORE_FACTOR)
  );
}

const initialState: DemoState = {
  phase: MazeGamePhase.START,
  score: 0,
  timer: MAZE_START_TIMER,
  level: 1,
  demoSession: null,
  currentLevelIndex: 0,
  isLoadingDemo: false,
  demoTutorialStep: 'idle',
  demoLevel0TutorialCompleted: false,
  shouldRedirectHomeAfterNoDemoLevels: false,
};

/** Coalesce concurrent loads (e.g. React Strict Mode double-mount). */
let demoLoadPromise: Promise<void> | null = null;
let demoLoadGeneration = 0;

const demoStoreSlice: StateCreator<DemoStore> = (set, get) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),
  setScore: (score) => set({ score }),
  setTimer: (timer) => set({ timer }),
  decrementTimer: () => set((state) => ({ timer: Math.max(0, state.timer - 1) })),
  loadDemo: async () => {
    if (demoLoadPromise) {
      return demoLoadPromise;
    }

    const generation = ++demoLoadGeneration;
    demoLoadPromise = (async () => {
      set({
        isLoadingDemo: true,
        demoSession: null,
        phase: MazeGamePhase.START,
        demoTutorialStep: 'idle',
        demoLevel0TutorialCompleted: false,
        shouldRedirectHomeAfterNoDemoLevels: false,
      });
      try {
        const demoSession = await demoService.getDemo();
        if (generation !== demoLoadGeneration) {
          return;
        }
        const hasLevels = demoSession.enableDemo && demoSession.levels.length > 0;
        const firstLevelIndex = 0;
        const firstLevel = demoSession.levels[firstLevelIndex];
        const shouldRedirectHomeAfterNoDemoLevels =
          demoSession.enableDemo && demoSession.levels.length === 0;

        if (shouldRedirectHomeAfterNoDemoLevels) {
          toast.error(i18next.t('demo.noLevelsAdded'));
        }

        set({
          demoSession,
          currentLevelIndex: firstLevelIndex,
          isLoadingDemo: false,
          phase: hasLevels ? MazeGamePhase.PLAYING : MazeGamePhase.START,
          score: 0,
          timer: MAZE_START_TIMER,
          level: firstLevel ? firstLevelIndex + 1 : 1,
          demoTutorialStep: 'idle',
          demoLevel0TutorialCompleted: false,
          shouldRedirectHomeAfterNoDemoLevels,
        });
      } catch (error) {
        if (generation !== demoLoadGeneration) {
          return;
        }
        logger.error('Failed to load demo:', error);
        set({
          ...initialState,
          isLoadingDemo: false,
        });
      } finally {
        if (generation === demoLoadGeneration) {
          demoLoadPromise = null;
        }
      }
    })();

    return demoLoadPromise;
  },
  goToStart: (stageLevel) =>
    set({
      ...initialState,
      level: normalizeStageId(stageLevel ?? initialState.level),
    }),
  resetGame: (stageLevel) =>
    set((state) => {
      const safeIndex = Math.min(
        state.currentLevelIndex,
        Math.max((state.demoSession?.levels.length ?? 1) - 1, 0),
      );
      return {
        phase:
          state.demoSession?.enableDemo && (state.demoSession.levels.length ?? 0) > 0
            ? MazeGamePhase.PLAYING
            : MazeGamePhase.START,
        score: 0,
        timer: MAZE_START_TIMER,
        level: state.demoSession?.levels[safeIndex]
          ? safeIndex + 1
          : normalizeStageId(stageLevel ?? initialState.level),
      };
    }),
  completeLevel: (remainingTime) =>
    set((state) => ({
      phase: MazeGamePhase.WIN,
      score: levelCompletionScore(state.score, remainingTime),
    })),
  startDemoTutorial: () =>
    set((state) => {
      if (
        state.demoLevel0TutorialCompleted ||
        state.currentLevelIndex !== 0 ||
        state.phase !== MazeGamePhase.PLAYING
      ) {
        return state;
      }
      return { demoTutorialStep: 'ball' };
    }),
  advanceDemoTutorial: () =>
    set((state) => {
      if (state.demoTutorialStep === 'idle' || state.demoTutorialStep === 'done') {
        return state;
      }
      return {
        demoTutorialStep: getNextDemoTutorialStep(state.demoTutorialStep),
      };
    }),
  completeDemoLevel0Tutorial: () =>
    set({
      demoLevel0TutorialCompleted: true,
      demoTutorialStep: 'done',
    }),
  clearNoDemoLevelsRedirect: () => set({ shouldRedirectHomeAfterNoDemoLevels: false }),
  reachDemoGoal: (remainingTime) => {
    const state = get();
    const levels = state.demoSession?.levels ?? [];
    if (levels.length === 0) {
      return 'finished';
    }

    const completedLevel0 = state.currentLevelIndex === 0;
    const nextScore = levelCompletionScore(state.score, remainingTime);
    const hasNextLevel = state.currentLevelIndex + 1 < levels.length;

    if (hasNextLevel) {
      const nextIndex = state.currentLevelIndex + 1;
      set({
        currentLevelIndex: nextIndex,
        level: nextIndex + 1,
        timer: MAZE_START_TIMER,
        score: nextScore,
        phase: MazeGamePhase.PLAYING,
        ...(completedLevel0
          ? {
              demoLevel0TutorialCompleted: true,
              demoTutorialStep: 'done' as const,
            }
          : {}),
      });
      return 'advanced';
    }

    set({
      phase: MazeGamePhase.WIN,
      score: nextScore,
      ...(completedLevel0
        ? {
            demoLevel0TutorialCompleted: true,
            demoTutorialStep: 'done' as const,
          }
        : {}),
    });
    return 'finished';
  },
});

export const useDemoStore = create(demoStoreSlice);

export function getCurrentDemoLevel(
  state: Pick<DemoStore, 'demoSession' | 'currentLevelIndex'>,
): DemoMazeLevelDto | null {
  return state.demoSession?.levels[state.currentLevelIndex] ?? null;
}
