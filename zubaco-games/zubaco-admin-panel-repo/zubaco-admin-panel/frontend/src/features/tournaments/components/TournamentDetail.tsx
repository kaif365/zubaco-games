"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  useTournamentById,
  useAddStagesToTournament,
  useRemoveStagesFromTournament,
} from "../hooks/useTournaments";
import { useDebounce } from "@/hooks/useDebounce";
import { useStages } from "@/features/stages/hooks/useStages";
import { useToast } from "@/providers/ToastProvider";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pencil,
  Trash2,
  Plus,
  Gamepad2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { MultiSelectModal } from "@/components/ui/multi-select-modal";
import { useTournamentAssignedStageIds } from "../hooks/useTournamentAssignedStageIds";
import { TournamentUpsertDrawer } from "./TournamentUpsertDrawer";

interface TournamentDetailProps {
  id: string;
}

export function TournamentDetail({ id }: TournamentDetailProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [removalTarget, setRemovalTarget] = useState<{
    ids: string[];
    description: string;
  } | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});
  const debouncedSearch = useDebounce(search, 300);
  const editorMode = searchParams.get("editor") ?? "";
  const isEditorOpen = editorMode === "details";

  const { data, isLoading } = useTournamentById(id);
  const { data: assignedStageIdsData } = useTournamentAssignedStageIds(
    id,
    isAddModalOpen,
  );
  const { data: allStagesData, isLoading: isLoadingAllStages } = useStages({
    page: 1,
    pageSize: 100,
    search: modalSearch,
  });
  const addStageMutation = useAddStagesToTournament(id);
  const { mutate: removeStages, isPending: isRemoving } =
    useRemoveStagesFromTournament(id);

  const handleRemoveStage = useCallback(
    (stageId: string) => {
      const tournament = data?.data;
      const stage = tournament?.stages?.find((s) => s.id === stageId);
      if (stage) {
        setRemovalTarget({
          ids: [stageId],
          description: `Are you sure you want to remove "${stage.stage_name}" from this tournament? This will not delete the stage itself.`,
        });
      }
    },
    [data?.data],
  );

  const confirmRemoval = () => {
    if (!removalTarget) return;

    removeStages(removalTarget.ids, {
      onSuccess: () => {
        toast({
          title:
            removalTarget.ids.length > 1 ? "Stages removed" : "Stage removed",
          description:
            removalTarget.ids.length > 1
              ? `Successfully removed ${removalTarget.ids.length} stages.`
              : "The stage has been removed from the tournament.",
          variant: "success",
        });
        setRemovalTarget(null);
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

  const stages = useMemo(() => data?.data?.stages ?? [], [data?.data?.stages]);

  const filteredStages = useMemo(
    () =>
      stages.filter((stage) =>
        stage.stage_name.toLowerCase().includes(debouncedSearch.toLowerCase()),
      ),
    [stages, debouncedSearch],
  );

  const assignedStageIds = useMemo(
    () => assignedStageIdsData ?? stages.map((s) => s.id),
    [assignedStageIdsData, stages],
  );

  const allStages = useMemo(
    () =>
      (allStagesData?.data ?? [])
        .map((s) => ({ id: s.id, name: s.stage_name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [allStagesData],
  );

  const isAllStagesAdded = useMemo(
    () =>
      !modalSearch &&
      allStagesData?.total !== undefined &&
      allStagesData.total > 0 &&
      stages.length >= allStagesData.total,
    [allStagesData, stages.length, modalSearch],
  );

  const handleAddStages = useCallback(
    (stageIds: string[]) => {
      addStageMutation.mutate(stageIds, {
        onSuccess: () => {
          toast({
            title: "Stages added",
            description: `Successfully added ${stageIds.length} stage(s) to the tournament.`,
            variant: "success",
          });
          setIsAddModalOpen(false);
        },
        onError: (err) => {
          toast({
            title: "Failed to add stages",
            description:
              err instanceof Error ? err.message : "Please try again",
            variant: "destructive",
          });
        },
      });
    },
    [addStageMutation, toast],
  );

  const openEdit = () => {
    router.push(`${pathname}?editor=details`);
  };
  const closeEditor = () => {
    router.push(pathname);
  };
  const totalGames = stages.reduce(
    (sum, stage) => sum + (stage.games?.length ?? 0),
    0,
  );

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const stage of stages) {
      next[stage.id] = expandedStages[stage.id] ?? false;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpandedStages(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stages]);

  const toggleStageExpand = (stageId: string) => {
    setExpandedStages((prev) => ({
      ...prev,
      [stageId]: !prev[stageId],
    }));
  };

  const tournamentName = data?.data?.name;

  return (
    <div className={`relative ${isEditorOpen ? "min-h-[calc(100vh-12rem)] overflow-hidden" : ""}`}>
      <div
        className={`space-y-4 transition ${isEditorOpen ? "pointer-events-none opacity-30 blur-[1px]" : ""
          }`}
      >
        <PageHeader
          title={tournamentName ? tournamentName : "Loading Tournament..."}
          description={
            tournamentName
              ? `Viewing all stages associated with ${tournamentName}`
              : "Finding stages for this tournament."
          }
          actions={
            <Button size="sm" variant="outline" onClick={openEdit}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Edit
            </Button>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Stages
              </p>
              <p className="mt-2 text-3xl font-semibold">{stages.length}</p>
              <p className="text-sm text-muted-foreground">tournament stages</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Games
              </p>
              <p className="mt-2 text-3xl font-semibold">{totalGames}</p>
              <p className="text-sm text-muted-foreground">total games across stages</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Stages
              </p>
              <h2 className="text-xl font-semibold">Stage Management</h2>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search stages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-56"
              />
              <Button
                size="sm"
                onClick={() => setIsAddModalOpen(true)}
                disabled={
                  isLoadingAllStages || addStageMutation.isPending || isAllStagesAdded
                }
              >
                <Plus className="mr-2 h-3.5 w-3.5" />
                {isAllStagesAdded ? "All stages added" : "Add Stage"}
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Card key={`stage-skeleton-${index}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4" />
                        <div className="space-y-2">
                          <Skeleton className="h-5 w-48" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </div>
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : filteredStages.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                {search ? "No stages match your search." : "No stages found for this tournament."}
              </CardContent>
            </Card>
          ) : (
            filteredStages.map((stage) => {
              const isExpanded = !!expandedStages[stage.id];
              return (
                <Card key={stage.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        className="flex items-center gap-2 text-left"
                        onClick={() => toggleStageExpand(stage.id)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div className="space-y-1">
                          <CardTitle className="text-base">{stage.stage_name}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {stage.games?.length ?? 0} game
                            {(stage.games?.length ?? 0) === 1 ? "" : "s"}
                          </p>
                        </div>
                      </button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isRemoving}
                        onClick={() => handleRemoveStage(stage.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardHeader>
                  {isExpanded && (
                    <CardContent className="space-y-3">
                      {stage.games && stage.games.length > 0 ? (
                        <div className="space-y-2">
                          {stage.games.map((game) => (
                            <div
                              key={game.id}
                              className="flex items-center justify-between rounded-md border border-border p-3"
                            >
                              <div className="flex items-center gap-2">
                                <Gamepad2 className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-medium">{game.name}</p>
                                  <p className="text-xs text-muted-foreground uppercase">
                                    {game.name}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="rounded-md border border-dashed border-border px-4 py-4 text-center text-sm text-muted-foreground">
                          No games in this stage yet.
                        </p>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={!!removalTarget}
        onClose={() => setRemovalTarget(null)}
        onConfirm={confirmRemoval}
        title={
          removalTarget?.ids.length === 1
            ? "Remove Stage"
            : "Remove Multiple Stages"
        }
        description={removalTarget?.description || ""}
        confirmLabel={removalTarget?.ids.length === 1 ? "Delete" : "Remove All"}
        variant="destructive"
        isLoading={isRemoving}
      />

      <MultiSelectModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onConfirm={handleAddStages}
        title="Add Stages to Tournament"
        items={allStages}
        alreadySelectedIds={assignedStageIds}
        isLoading={addStageMutation.isPending}
        onSearch={setModalSearch}
      />

      <TournamentUpsertDrawer
        mode="edit"
        isOpen={isEditorOpen}
        onClose={closeEditor}
        tournamentId={id}
        initialName={data?.data?.name ?? ""}
        initialStartDate={(data?.data?.start_date ?? data?.data?.startDate ?? "").split("T")[0] ?? ""}
        initialEndDate={(data?.data?.end_date ?? data?.data?.endDate ?? "").split("T")[0] ?? ""}
        initialStageIds={(data?.data?.stages ?? []).map((s) => s.id)}
      />
    </div>
  );
}
