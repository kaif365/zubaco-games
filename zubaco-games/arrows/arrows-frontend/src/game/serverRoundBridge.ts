import type { ServerRoundStartData } from "./gameTypes";

let pendingRoundStartData: ServerRoundStartData | null = null;

export const serverRoundBridge = {
  set(data: ServerRoundStartData) {
    pendingRoundStartData = data;
  },

  consume(): ServerRoundStartData | null {
    const data = pendingRoundStartData;
    pendingRoundStartData = null;
    return data;
  },

  clear() {
    pendingRoundStartData = null;
  },
};
