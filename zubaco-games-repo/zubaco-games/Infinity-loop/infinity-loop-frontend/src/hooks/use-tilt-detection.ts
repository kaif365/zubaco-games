"use client";

import { useCallback, useSyncExternalStore } from "react";

const LANDSCAPE_MQL = "(orientation: landscape)";
/** Primary input is touch (phones); tablets still often qualify, so short edge gates those out. */
const COARSE_POINTER_MQL = "(pointer: coarse)";
/**
 * Shorter edge in CSS px: phones stay below this in landscape; tablets’ smaller edge is typically larger.
 */
const PHONE_SHORT_EDGE_MAX = 600;

function isPhoneLikePrimaryInput(): boolean {
  const win = globalThis.window;
  if (win.matchMedia(COARSE_POINTER_MQL).matches) return true;
  return (
    win.matchMedia("(hover: none)").matches && navigator.maxTouchPoints > 0
  );
}

function readTiltDetection(): boolean {
  const win = globalThis.window;
  if (!win.matchMedia(LANDSCAPE_MQL).matches) return false;
  if (!isPhoneLikePrimaryInput()) return false;
  const shortSide = Math.min(win.innerWidth, win.innerHeight);
  return shortSide < PHONE_SHORT_EDGE_MAX;
}

/**
 * Phone in landscape only (not tablets): coarse/touch-primary, short edge phone-sized, CSS landscape.
 */
export function useTiltDetection(): boolean {
  const subscribe = useCallback((onStoreChange: () => void) => {
    const win = globalThis.window;
    win.addEventListener("resize", onStoreChange);
    win.addEventListener("orientationchange", onStoreChange);
    const landscapeMql = win.matchMedia(LANDSCAPE_MQL);
    const coarseMql = win.matchMedia(COARSE_POINTER_MQL);
    const hoverMql = win.matchMedia("(hover: none)");
    landscapeMql.addEventListener("change", onStoreChange);
    coarseMql.addEventListener("change", onStoreChange);
    hoverMql.addEventListener("change", onStoreChange);
    return () => {
      win.removeEventListener("resize", onStoreChange);
      win.removeEventListener("orientationchange", onStoreChange);
      landscapeMql.removeEventListener("change", onStoreChange);
      coarseMql.removeEventListener("change", onStoreChange);
      hoverMql.removeEventListener("change", onStoreChange);
    };
  }, []);

  return useSyncExternalStore(subscribe, readTiltDetection, () => false);
}
