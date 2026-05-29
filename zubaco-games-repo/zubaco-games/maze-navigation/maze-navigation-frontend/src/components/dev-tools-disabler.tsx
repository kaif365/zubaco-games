
import { disableCopyAndSelection, disableDevTools } from "@/utils/dev-tools";
import { useEffect } from "react";

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
