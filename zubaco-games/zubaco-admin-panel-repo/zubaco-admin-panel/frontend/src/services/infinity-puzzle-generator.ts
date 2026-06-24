import { get } from "@/lib/api/http";
import { getGameApiBaseUrl, resolveGameToken } from "@/config/game-registry";
import type {
  ApiEnvelope,
  GeneratePuzzleItem,
  GeneratePuzzleQuery,
} from "@/types/games/infinity-loop/infinity-loop-api";

export async function generateInfinityPuzzles(
  query: GeneratePuzzleQuery,
  token?: string,
  gameName = "Infinity Loop",
): Promise<ApiEnvelope<GeneratePuzzleItem[]>> {
  const response = await get<ApiEnvelope<GeneratePuzzleItem[]>>(
    "/v1/puzzles/generate",
    {
      token: resolveGameToken(gameName, token),
      baseUrl: getGameApiBaseUrl(gameName),
      query: query as Record<
        string,
        string | number | boolean | null | undefined
      >,
    },
  );

  return (
    response || {
      success: false,
      statusCode: 500,
      message: "Network error",
      data: [],
    }
  );
}
