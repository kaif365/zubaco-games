"use client";

import { useState, useMemo, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { Input } from "@/components/ui/input";
import { useToast } from "@/providers/ToastProvider";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Pencil } from "lucide-react";
import { MultiSelectModal } from "@/components/ui/multi-select-modal";
import { useStageDetail } from "../hooks/useStageDetail";
import { useStageSummary } from "../hooks/useStageSummary";
import { getStageGameColumns } from "../config/stageGameColumns";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import { Pagination } from "@/components/shared/Pagination";
import { ROUTES } from "@/config/routes";
import { useAdminGamesList } from "@/features/games/hooks/useAdminGamesList";
import { useAddGamesToStage } from "../hooks/useAddGameToStage";
import { useRemoveGamesFromStage } from "../hooks/useRemoveGameFromStage";
import { useStageAssignedGameIds } from "../hooks/useStageAssignedGameIds";
import { useAutoBackPageOnEmpty } from "@/hooks/useAutoBackPageOnEmpty";
import { StageUpsertDrawer } from "./StageUpsertDrawer";

interface StageGamesTableProps {
  stageId: string;
}

export function StageGamesTable({ stageId }: StageGamesTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [removalTarget, setRemovalTarget] = useState<{
    ids: string[];
    description: string;
  } | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const editorMode = searchParams.get("editor") ?? "";
  const shouldOpenEditor = editorMode === "edit";
  const [isEditModalOpen, setIsEditModalOpen] = useState(shouldOpenEditor);
  const [modalSearch, setModalSearch] = useState("");
  const { toast } = useToast();
  const debouncedSearch = useDebounce(search, 300);
  const { page, pageSize, goToPage, changePageSize, reset } = usePagination();
  const isEditDrawerOpen = shouldOpenEditor || isEditModalOpen;

  const closeEditor = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("editor");
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  };

  const { data: stage, isLoading } = useStageDetail(stageId, {
    page,
    pageSize,
    search: debouncedSearch,
  });
  const { data: stageSummary } = useStageSummary(stageId, true);
  const { data: allGames, isLoading: isLoadingAllGames } = useAdminGamesList({
    search: modalSearch,
  });
  const { data: assignedIds } = useStageAssignedGameIds(
    stageId,
    isAddModalOpen,
  );
  const { data: editAssignedIds } = useStageAssignedGameIds(
    stageId,
    isEditModalOpen,
  );
  const addGameMutation = useAddGamesToStage(stageId);
  const removeGameMutation = useRemoveGamesFromStage(stageId);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    reset();
    setSelectedIds([]);
  };

  const handleViewGame = useCallback(
    (id: string) => {
      router.push(ROUTES.STAGE_GAME_DETAIL(stageId, id));
    },
    [router, stageId],
  );

  const handleRemoveGame = useCallback(
    (id: string) => {
      const game = stage?.games?.find((g) => g.id === id);
      if (game) {
        setRemovalTarget({
          ids: [id],
          description: `Are you sure you want to remove "${game.name}" from this stage?`,
        });
      }
    },
    [stage?.games],
  );

  const handleBulkRemove = () => {
    if (selectedIds.length === 0) return;
    setRemovalTarget({
      ids: selectedIds,
      description: `Are you sure you want to remove ${selectedIds.length} games from this stage?`,
    });
  };

  const confirmRemoval = () => {
    if (!removalTarget) return;
    const pageWas = page;
    const itemsOnPageWas = (stage?.games ?? []).length;
    const deletedCount = removalTarget.ids.length;

    removeGameMutation.mutate(removalTarget.ids, {
      onSuccess: () => {
        toast({
          title:
            removalTarget.ids.length > 1 ? "Games removed" : "Game removed",
          description:
            removalTarget.ids.length > 1
              ? `Successfully removed ${removalTarget.ids.length} games.`
              : "The game has been removed from the stage.",
          variant: "success",
        });
        setSelectedIds((prev) =>
          prev.filter((id) => !removalTarget.ids.includes(id)),
        );
        setRemovalTarget(null);

        if (pageWas > 1 && itemsOnPageWas > 0 && deletedCount >= itemsOnPageWas) {
          goToPage(pageWas - 1);
        }
      },
      onError: (err) => {
        toast({
          title: "Removal failed",
          description: err instanceof Error ? err.message : "Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  const columns = useMemo(
    () => getStageGameColumns(handleViewGame, handleRemoveGame),
    [handleViewGame, handleRemoveGame],
  );

  const games = useMemo(() => stage?.games ?? [], [stage?.games]);
  const total = useMemo(
    () => stage?.pagination?.total ?? 0,
    [stage?.pagination?.total],
  );
  const totalAssignedGames = useMemo(
    () => stageSummary?.pagination?.total ?? stage?.pagination?.total ?? 0,
    [stageSummary?.pagination?.total, stage?.pagination?.total],
  );
  const totalPages = useMemo(
    () => stage?.pagination?.total_pages ?? 0,
    [stage?.pagination?.total_pages],
  );

  useAutoBackPageOnEmpty({
    page,
    pageSize,
    itemsLength: games.length,
    total,
    isLoading,
    isFetching: false,
    onPageChange: goToPage,
  });

  const assignedGameIds = useMemo(
    () => assignedIds ?? games.map((g) => g.id),
    [assignedIds, games],
  );

  const editGameIds = useMemo(
    () => editAssignedIds ?? assignedGameIds,
    [editAssignedIds, assignedGameIds],
  );

  const allGamesItems = useMemo(
    () =>
      (allGames?.items ?? [])
        .map((g) => ({ id: g.id, name: g.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [allGames],
  );

  const isAllGamesAdded = useMemo(
    () =>
      !modalSearch &&
      allGames?.total !== undefined &&
      allGames.total > 0 &&
      totalAssignedGames >= allGames.total,
    [allGames, totalAssignedGames, modalSearch],
  );

  const handleAddGames = useCallback(
    (gameIds: string[]) => {
      addGameMutation.mutate(gameIds, {
        onSuccess: () => {
          toast({
            title: "Games added",
            description: `Successfully added ${gameIds.length} game(s) to the stage.`,
            variant: "success",
          });
          setIsAddModalOpen(false);
        },
        onError: (err) => {
          toast({
            title: "Failed to add games",
            description:
              err instanceof Error ? err.message : "Please try again",
            variant: "destructive",
          });
        },
      });
    },
    [addGameMutation, toast],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title={stage ? `${stage.stage_name}` : "Loading Stage..."}
        description={
          stage
            ? "Viewing all games assigned to this stage"
            : "Finding games for this stage."
        }
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditModalOpen(true)}
            disabled={isLoading || addGameMutation.isPending || removeGameMutation.isPending}
          >
            <Pencil className="mr-2 h-3.5 w-3.5" />
            Edit
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Stage Number
            </p>
            <p className="mt-2 text-3xl font-semibold">
              {stageSummary?.stage_number ?? stage?.stage_number ?? "—"}
            </p>
            <p className="text-sm text-muted-foreground">current stage</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Games
            </p>
            <p className="mt-2 text-3xl font-semibold">{totalAssignedGames}</p>
            <p className="text-sm text-muted-foreground">total assigned games</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Games
            </p>
            <h2 className="text-xl font-semibold">Game Management</h2>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search games..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-9 w-56"
            />
            <Button
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              disabled={
                isLoadingAllGames ||
                addGameMutation.isPending ||
                isAllGamesAdded
              }
            >
              <Plus className="mr-2 h-3.5 w-3.5" />
              {isAllGamesAdded ? "All games added" : "Add Game"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkRemove}
              disabled={selectedIds.length === 0 || removeGameMutation.isPending}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={games}
              isLoading={isLoading}
              rowKey={(row) => row.id}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              emptyMessage={
                search
                  ? "No games match your search for this stage."
                  : "No games assigned to this stage."
              }
            />
          </CardContent>
        </Card>
      </div>

      {totalPages > 1 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
          onPageChange={goToPage}
          onPageSizeChange={changePageSize}
        />
      )}

      <ConfirmationModal
        isOpen={!!removalTarget}
        onClose={() => setRemovalTarget(null)}
        onConfirm={confirmRemoval}
        title={
          removalTarget?.ids.length === 1
            ? "Remove Game"
            : "Remove Multiple Games"
        }
        description={removalTarget?.description || ""}
        confirmLabel={removalTarget?.ids.length === 1 ? "Delete" : "Delete All"}
        variant="destructive"
        isLoading={removeGameMutation.isPending}
      />

      <MultiSelectModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onConfirm={handleAddGames}
        title="Add Games to Stage"
        items={allGamesItems}
        alreadySelectedIds={assignedGameIds}
        isLoading={addGameMutation.isPending}
        onSearch={setModalSearch}
      />

      <StageUpsertDrawer
        key={`${stageId}-${isEditDrawerOpen}-${editGameIds.length}-${stage?.updated_at ?? ""}`}
        mode="edit"
        isOpen={isEditDrawerOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          if (shouldOpenEditor) closeEditor();
        }}
        stageId={stageId}
        initialStageNumber={stage?.stage_number ?? null}
        initialStageName={stage?.stage_name ?? ""}
        initialGameIds={editGameIds}
      />
    </div>
  );
}
