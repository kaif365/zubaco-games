import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { normalizeLang } from "@/lib/i18n/lang-cookie";
import { useSettingsStore } from "@/store/settings";
import {
  getConfiguredApiStageId,
  getConfiguredUiStageId,
} from "@/utils/stage/stage-utils";

export function useStageBootstrap(isAuthReady: boolean) {
  const { i18n } = useTranslation();
  const language = i18n.language;
  const { beginBootstrap, loadStageContent, finishBootstrapError } =
    useSettingsStore();

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    const apiStageId = getConfiguredApiStageId();
    const uiStageId = getConfiguredUiStageId();

    const run = async () => {
      beginBootstrap();
      try {
        await loadStageContent(apiStageId, uiStageId, normalizeLang(language));
      } catch {
        finishBootstrapError();
      }
    };

    void run();
  }, [
    beginBootstrap,
    finishBootstrapError,
    isAuthReady,
    language,
    loadStageContent,
  ]);
}
