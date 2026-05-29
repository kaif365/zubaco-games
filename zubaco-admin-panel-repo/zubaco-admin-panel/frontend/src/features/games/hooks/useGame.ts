import { useGameByIdQuery } from "@/lib/react-query/games";

export function useGame(id: string, stageId?: string) {
  return useGameByIdQuery(id, { stage_id: stageId });
}
