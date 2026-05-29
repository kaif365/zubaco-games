import type { ServerBoard } from "@/game/gameTypes";
import { storage } from "@/utils/storage";
import { DEMO_SESSION_STORAGE_KEY } from "@/constants/storage";

export type DemoSessionStatus = "not_started" | "playing" | "completed";

export type PersistedDemoSession = {
  stageId: string;
  alreadySeen: boolean;
  status: DemoSessionStatus;
  boards: ServerBoard[];
  currentBoardIndex: number;
  capturedAtMs: number;
};

export const demoSessionStorage = {
  async read(): Promise<PersistedDemoSession | null> {
    return storage.get<PersistedDemoSession>(DEMO_SESSION_STORAGE_KEY);
  },

  async write(snapshot: PersistedDemoSession): Promise<void> {
    await storage.set(DEMO_SESSION_STORAGE_KEY, snapshot);
  },

  async update(
    patch: Partial<PersistedDemoSession>,
  ): Promise<PersistedDemoSession> {
    const current =
      (await this.read()) ??
      ({
        stageId: "",
        alreadySeen: false,
        status: "not_started",
        boards: [],
        currentBoardIndex: 0,
        capturedAtMs: Date.now(),
      } satisfies PersistedDemoSession);

    const next = {
      ...current,
      ...patch,
      capturedAtMs: Date.now(),
    };
    await this.write(next);
    return next;
  },

  clear(): void {
    storage.remove(DEMO_SESSION_STORAGE_KEY);
  },
};
