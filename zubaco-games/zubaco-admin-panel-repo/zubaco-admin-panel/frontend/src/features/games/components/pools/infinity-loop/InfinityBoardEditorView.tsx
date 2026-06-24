"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfinityBoardEditor } from "../../boards/infinity-loop/InfinityBoardEditor";
import { useInfinityBoardCrud } from "@/features/games/hooks/pools/useInfinityBoardCrud";
import { useState } from "react";
import type { InfinityDifficulty } from "@/constants/infinity-difficulty";

type InfinityLevel = {
  id: string;
  name: string;
};

interface InfinityBoardEditorViewProps {
  gameId: string;
  gameName: string;
  levels: InfinityLevel[];
  levelsLoading: boolean;
  onClose: () => void;
}

export function InfinityBoardEditorView({
  gameId,
  gameName,
  levels,
  levelsLoading,
  onClose,
}: InfinityBoardEditorViewProps) {
  const [difficultyName, setDifficultyName] = useState<string>("");
  const effectiveDifficultyName = difficultyName || levels[0]?.name || "";
  const effectiveLevelId =
    levels.find((l) => l.name === effectiveDifficultyName)?.id || "";
  const effectiveDifficulty = ((): InfinityDifficulty => {
    const normalized = String(effectiveDifficultyName || "EASY").toUpperCase();
    if (
      normalized === "EASY" ||
      normalized === "MEDIUM" ||
      normalized === "HARD"
    ) {
      return normalized;
    }
    return "EASY";
  })();

  const {
    boards,
    loadingBoards,
    loadingPairs,
    savingBoardId,
    createBoard,
    updateBoard,
    deleteBoard,
    fetchPuzzlePairs,
    saveOrUpdatePuzzle,
  } = useInfinityBoardCrud(gameId, gameName, effectiveLevelId, {
    // In create flow we don't need to fetch existing boards; the Pool listing handles that.
    // Avoids an unnecessary GET /v1/boards on "Create Board" click.
    loadBoards: false,
  });

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">Create Board</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Generate puzzles, edit randomized grid, then save the board.
        </p>
      </CardHeader>
      <CardContent>
        <InfinityBoardEditor
          boards={boards}
          loadingBoards={loadingBoards}
          loadingPairs={loadingPairs}
          savingBoardId={savingBoardId}
          onCreateBoard={async () => {
            const id = await createBoard();
            updateBoard(id, {
              difficulty: effectiveDifficulty,
            });
            return id;
          }}
          onUpdateBoard={updateBoard}
          onDeleteBoard={deleteBoard}
          onFetchPairs={(rows, cols, limit) =>
            fetchPuzzlePairs(rows, cols, effectiveDifficulty, limit)
          }
          onSaveOrUpdatePuzzle={saveOrUpdatePuzzle}
          onSaved={onClose}
          mode="create"
          levelSelect={{
            value: effectiveDifficultyName,
            onValueChange: setDifficultyName,
            disabled: levelsLoading || levels.length === 0,
            items: levels.map((lvl) => ({ id: lvl.id, name: lvl.name })),
          }}
        />
      </CardContent>
    </Card>
  );
}
