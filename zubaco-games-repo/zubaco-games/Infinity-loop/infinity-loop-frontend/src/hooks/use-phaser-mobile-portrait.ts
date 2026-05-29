"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Mirrors `LoopScene.renderGrid` `isMobilePortraitViewport`:
 * `viewportWidth < 768 && viewportHeight > viewportWidth`.
 */
export function usePhaserMobilePortrait(): boolean {
  const subscribe = useCallback((onStoreChange: () => void) => {
    const notify = () => {
      onStoreChange();
    };
    window.addEventListener("resize", notify);
    window.addEventListener("orientationchange", notify);
    return () => {
      window.removeEventListener("resize", notify);
      window.removeEventListener("orientationchange", notify);
    };
  }, []);

  const getSnapshot = useCallback(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    return w < 768 && h > w;
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
