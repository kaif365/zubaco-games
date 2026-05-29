"use client";

import { useEffect } from "react";
import { disableCopyAndSelection, disableDevTools } from "@/utils/dev-tools";

export function DevToolsDisabler() {
  useEffect(() => {
    const cleanup = disableDevTools();
    const stopDrag = disableCopyAndSelection();
    return () => {
      stopDrag();
      cleanup();
    };
  }, []);

  return null;
}
