"use client";

import type { InstructionContentPayload } from "@/types/instruction-api";
import type { GameResultVariant } from "@/types/result-content";
import { create, type StateCreator } from "zustand";

export { GAME_RESULT_VARIANT } from "@/constants/game-result";
export type { GameResultVariant } from "@/types/result-content";

export interface GameResultStoreData {
  stage: string;
  score: number;
  completed: number;
  total: number;
  variant: GameResultVariant;
}

interface GameStoreState {
  instructionOverride: Partial<InstructionContentPayload> | null;
  result: GameResultStoreData | null;
}

interface GameStoreActions {
  setInstructionOverride: (
    override: Partial<InstructionContentPayload> | null,
  ) => void;
  clearInstructionOverride: () => void;
  setGameResult: (next: GameResultStoreData | null) => void;
  clearGameResult: () => void;
}

type GameStore = GameStoreState & GameStoreActions;

const gameStore: StateCreator<GameStore> = (set) => ({
  instructionOverride: null,
  result: null,

  setInstructionOverride: (instructionOverride) => set({ instructionOverride }),

  clearInstructionOverride: () => set({ instructionOverride: null }),

  setGameResult: (next) => set({ result: next }),

  clearGameResult: () => set({ result: null }),
});

const useGameStore = create(gameStore);

export default useGameStore;
