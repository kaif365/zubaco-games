"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InfinityBoardsTable } from "./infinity-loop/InfinityBoardsTable";
import { InfinityBoardEditorView } from "./infinity-loop/InfinityBoardEditorView";
import { useInfinityLevels } from "@/features/games/hooks/pools/useInfinityPool";
import { sortLevelsByName } from "@/utils/level-order";

interface InfinityLoopPoolViewProps {
  gameId: string;
  gameName: string;
}

export function InfinityLoopPoolView({
  gameId,
  gameName,
}: InfinityLoopPoolViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const boardMode = searchParams.get("boardMode"); // "add"

  // Prefetch levels as soon as the Pool tab mounts (not only when opening Create Board).
  const { data: levelsPayload, isLoading: levelsLoading } = useInfinityLevels(
    gameId,
    gameName,
    { page: 1, limit: 100 },
  );
  const levels = useMemo(
    () => sortLevelsByName(levelsPayload?.data ?? []),
    [levelsPayload?.data],
  );

  const setBoardView = useCallback(
    (mode: "add" | null) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "pool");
      if (mode) params.set("boardMode", mode);
      else params.delete("boardMode");
      // Use replace so this UI toggle is immediate and doesn't create history entries.
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {boardMode ? (
            <Button
              variant="ghost"
              className="gap-2 -ml-2"
              onClick={() => setBoardView(null)}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Boards
            </Button>
          ) : null}
        </div>
      </div>

      {boardMode === "add" ? (
        <InfinityBoardEditorView
          gameId={gameId}
          gameName={gameName}
          levels={levels}
          levelsLoading={levelsLoading}
          onClose={() => setBoardView(null)}
        />
      ) : (
        <InfinityBoardsTable
          gameId={gameId}
          gameName={gameName}
          onAddBoard={() => setBoardView("add")}
          levels={levels}
          levelsLoading={levelsLoading}
        />
      )}
    </div>
  );
}
