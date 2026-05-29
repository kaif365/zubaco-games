import type { GameMetaResponse } from "@/types/socket";

export function parseGameMetaResponse(raw: unknown): GameMetaResponse | null {
  const candidate = Array.isArray(raw) ? raw[1] : raw;
  if (!candidate || typeof candidate !== "object") return null;
  if (!("success" in candidate)) return null;
  return candidate as GameMetaResponse;
}
