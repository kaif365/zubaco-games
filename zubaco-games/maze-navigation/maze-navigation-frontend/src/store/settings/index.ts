import configService from "@/services/api/config";
import type { StageInstructionContentMap } from "@/types/instruction-content";
import type { StageId } from "@/types/stage-theme";
import { create, type StateCreator } from "zustand";

interface SettingsState {
  isBootstrapReady: boolean;
  instructionContentOverride: Partial<StageInstructionContentMap> | null;
  soundEffectsEnabled: boolean;
}

interface SettingsActions {
  beginBootstrap: () => void;
  loadStageContent: (
    apiStageId: string,
    uiStageId: StageId,
    lang: string,
  ) => Promise<void>;
  finishBootstrapError: () => void;
  setSoundEffectsEnabled: (enabled: boolean) => void;
}

type SettingsStore = SettingsState & SettingsActions;

const initialState: SettingsState = {
  isBootstrapReady: false,
  instructionContentOverride: null,
  soundEffectsEnabled: true,
};

const settingsStoreSlice: StateCreator<SettingsStore> = (set) => ({
  ...initialState,

  beginBootstrap: () =>
    set({
      isBootstrapReady: false,
      instructionContentOverride: null,
    }),

  loadStageContent: async (apiStageId, uiStageId, lang) => {
    const content = await configService.getStageContent(
      apiStageId,
      uiStageId,
      lang,
    );
    set({
      isBootstrapReady: true,
      instructionContentOverride: content,
    });
  },

  finishBootstrapError: () =>
    set({
      isBootstrapReady: true,
      instructionContentOverride: null,
    }),

  setSoundEffectsEnabled: (enabled) =>
    set({
      soundEffectsEnabled: enabled,
    }),
});

export const useSettingsStore = create(settingsStoreSlice);
