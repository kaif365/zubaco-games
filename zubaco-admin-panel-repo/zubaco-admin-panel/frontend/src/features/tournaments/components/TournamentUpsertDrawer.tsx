"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogDrawerContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search } from "lucide-react";
import { useToast } from "@/providers/ToastProvider";
import { useDebounce } from "@/hooks/useDebounce";
import { useStages } from "@/features/stages/hooks/useStages";
import { useCreateTournament, useUpdateTournament } from "../hooks/useTournaments";
import type { ApiError } from "@/lib/api/client";
import type { Stage } from "@/types/stage";

type BaseProps = {
  isOpen: boolean;
  onClose: () => void;
};

type CreateProps = BaseProps & {
  mode: "create";
  onCreated?: (tournamentId: string) => void;
};

type EditProps = BaseProps & {
  mode: "edit";
  tournamentId: string;
  initialName: string;
  initialStartDate: string; // YYYY-MM-DD
  initialEndDate: string; // YYYY-MM-DD
  initialStageIds: string[];
  onSaved?: () => void;
};

export type TournamentUpsertDrawerProps = CreateProps | EditProps;

function isEdit(p: TournamentUpsertDrawerProps): p is EditProps {
  return p.mode === "edit";
}

export function TournamentUpsertDrawer(props: TournamentUpsertDrawerProps) {
  const { toast } = useToast();
  const { mutate: createTournament, isPending: isCreating } = useCreateTournament();
  const updateTournamentMutation = useUpdateTournament(
    isEdit(props) ? props.tournamentId : "",
  );
  const isUpdating = isEdit(props) ? updateTournamentMutation.isPending : false;
  const isPending = isCreating || isUpdating;

  const [name, setName] = useState(isEdit(props) ? props.initialName : "");
  const [startDate, setStartDate] = useState(
    isEdit(props) ? props.initialStartDate : "",
  );
  const [endDate, setEndDate] = useState(isEdit(props) ? props.initialEndDate : "");
  const [stageSearch, setStageSearch] = useState("");
  const [selectedStageIds, setSelectedStageIds] = useState<string[]>(
    isEdit(props) ? props.initialStageIds : [],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stagePage, setStagePage] = useState(1);
  const [stageItems, setStageItems] = useState<Stage[]>([]);

  const debouncedStageSearch = useDebounce(stageSearch, 250);
  const {
    data: stagesData,
    isLoading: isLoadingStages,
    isFetching: isFetchingStages,
  } = useStages(
    {
      page: stagePage,
      pageSize: 25,
      search: debouncedStageSearch,
    },
    { enabled: props.isOpen },
  );

  const currentPageItems = useMemo(
    () =>
      (stagesData?.data ?? [])
        .filter((s) => !s.deleted_at)
        .slice()
        .sort((a, b) => a.stage_number - b.stage_number),
    [stagesData?.data],
  );
  const stageTotalPages = stagesData?.totalPages ?? 1;

  const visibleStageItems = useMemo(() => {
    // `stageItems` is reset on drawer close/open; if the query still has cached data,
    // render from `currentPageItems` so the list doesn't flash "No stages found".
    return stageItems.length > 0 ? stageItems : currentPageItems;
  }, [currentPageItems, stageItems]);

  useEffect(() => {
    if (!props.isOpen) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setStagePage(1);
    setStageItems([]);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [debouncedStageSearch, props.isOpen]);

  useEffect(() => {
    if (!props.isOpen) return;
    if (!stagesData) return;

    /* eslint-disable react-hooks/set-state-in-effect */
    setStageItems((prev) => {
      const base = stagePage === 1 ? [] : prev;
      const seen = new Set(base.map((s) => s.id));
      for (const s of currentPageItems) {
        if (!seen.has(s.id)) base.push(s);
      }
      base.sort((a, b) => a.stage_number - b.stage_number);
      return [...base];
    });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [props.isOpen, currentPageItems, stagePage, stagesData]);

  const reset = () => {
    setName(isEdit(props) ? props.initialName : "");
    setStartDate(isEdit(props) ? props.initialStartDate : "");
    setEndDate(isEdit(props) ? props.initialEndDate : "");
    setStageSearch("");
    setSelectedStageIds(isEdit(props) ? props.initialStageIds : []);
    setErrors({});
    setStagePage(1);
    setStageItems([]);
  };

  const prevOpenRef = useRef(false);
  const hydratedRef = useRef(false);
  const edit = isEdit(props) ? props : null;
  const editInitialName = edit?.initialName ?? "";
  const editInitialStartDate = edit?.initialStartDate ?? "";
  const editInitialEndDate = edit?.initialEndDate ?? "";
  const editInitialStageIdsKey = edit ? edit.initialStageIds.join(",") : "";
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = props.isOpen;
    if (props.isOpen && !wasOpen) {
      // When opening, reset local state. For edit mode, we may need to wait for async
      // detail fetch to populate initial values; see hydration effect below.
      hydratedRef.current = false;
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.isOpen]);

  useEffect(() => {
    if (!props.isOpen) return;
    if (props.mode !== "edit") return;
    if (hydratedRef.current) return;

    const hasInitial =
      Boolean(editInitialName?.trim()) ||
      Boolean(editInitialStartDate) ||
      Boolean(editInitialEndDate) ||
      editInitialStageIdsKey.length > 0;

    // If the drawer was opened before the detail query finished, hydrate once the
    // initial values become available. Only do this once per open to avoid clobbering
    // user edits.
    if (!hasInitial) return;

    /* eslint-disable react-hooks/set-state-in-effect */
    setName(editInitialName);
    setStartDate(editInitialStartDate);
    setEndDate(editInitialEndDate);
    setSelectedStageIds(editInitialStageIdsKey ? editInitialStageIdsKey.split(",") : []);
    setStageSearch("");
    setErrors({});
    /* eslint-enable react-hooks/set-state-in-effect */
    hydratedRef.current = true;
  }, [
    props.isOpen,
    props.mode,
    editInitialEndDate,
    editInitialName,
    editInitialStageIdsKey,
    editInitialStartDate,
  ]);

  const handleClose = () => {
    reset();
    props.onClose();
  };

  const toggleStage = (id: string) => {
    setSelectedStageIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const bodyRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef(false);
  const onBodyScroll = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    if (isLoadingStages) return;
    if (loadMoreRef.current) return;
    if (stagePage >= stageTotalPages) return;

    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (remaining > 240) return;

    loadMoreRef.current = true;
    setStagePage((p) => p + 1);
    window.setTimeout(() => {
      loadMoreRef.current = false;
    }, 200);
  }, [isLoadingStages, stagePage, stageTotalPages]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Tournament name is required.";
    if (!startDate) next.startDate = "Start date is required.";
    if (!endDate) next.endDate = "End date is required.";
    if (startDate && endDate && endDate < startDate) {
      next.endDate = "End date must be after start date.";
    }
    if (selectedStageIds.length === 0) next.stages = "Select at least one stage.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = () => {
    if (!validate()) return;

    const payload = {
      name: name.trim(),
      start_date: new Date(`${startDate}T00:00:00.000Z`).toISOString(),
      end_date: new Date(`${endDate}T00:00:00.000Z`).toISOString(),
      status: "ACTIVE",
      stageIds: selectedStageIds,
    };

    if (props.mode === "create") {
      createTournament(payload, {
        onSuccess: (resp) => {
          toast({
            title: "Tournament created",
            description: `"${name.trim()}" has been successfully created.`,
            variant: "success",
          });
          const id = resp?.data?.id;
          reset();
          props.onClose();
          if (id) props.onCreated?.(id);
        },
        onError: (err: unknown) => {
          const apiError = err as ApiError;
          const message = apiError.message || "Failed to create tournament";
          toast({
            title: "Creation failed",
            description:
              message === "TOURNAMENT_ALREADY_EXISTS"
                ? "A tournament with this name already exists."
                : message,
            variant: "destructive",
          });
        },
      });
      return;
    }

    updateTournamentMutation.mutate(payload, {
      onSuccess: () => {
        toast({
          title: "Tournament updated",
          description: "Tournament details saved successfully.",
          variant: "success",
        });
        props.onSaved?.();
        props.onClose();
      },
      onError: (err) => {
        toast({
          title: "Update failed",
          description: err instanceof Error ? err.message : "Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <Dialog
      open={props.isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogDrawerContent className="max-w-[560px]">
        <DialogHeader className="border-b border-border px-6 py-5">
          <DialogTitle className="text-xl">
            {props.mode === "create" ? "Create tournament" : "Edit tournament"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {props.mode === "create"
              ? "Fill in the details below."
              : "Update tournament details."}
          </p>
        </DialogHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div
            ref={bodyRef}
            onScroll={onBodyScroll}
            className="custom-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-3"
          >
            <div className="space-y-2">
              <Label htmlFor="tournament_create_name">
                Tournament name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tournament_create_name"
                placeholder="e.g. Summer Showdown 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
                autoFocus
                required
              />
              {errors.name ? (
                <p className="text-xs text-destructive">{errors.name}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-6 space-y-2">
                <Label htmlFor="tournament_create_start">
                  Start date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="tournament_create_start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={isPending}
                  required
                />
                {errors.startDate ? (
                  <p className="text-xs text-destructive">{errors.startDate}</p>
                ) : null}
              </div>
              <div className="col-span-6 space-y-2">
                <Label htmlFor="tournament_create_end">
                  End date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="tournament_create_end"
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={isPending}
                  required
                />
                {errors.endDate ? (
                  <p className="text-xs text-destructive">{errors.endDate}</p>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label>
                  Stages <span className="text-destructive">*</span>
                </Label>
                <Badge variant="outline">{selectedStageIds.length} selected</Badge>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search stages..."
                  className="pl-10"
                  value={stageSearch}
                  onChange={(e) => {
                    setStageSearch(e.target.value);
                  }}
                  disabled={isPending}
                />
              </div>

              <div className="rounded-lg border divide-y">
                {isLoadingStages ? (
                  <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading stages...
                  </div>
                ) : visibleStageItems.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    {isFetchingStages ? (
                      <span className="inline-flex items-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading stages...
                      </span>
                    ) : (
                      "No stages found."
                    )}
                  </div>
                ) : (
                  visibleStageItems.map((stage) => {
                    const checked = selectedStageIds.includes(stage.id);
                    return (
                      <button
                        key={stage.id}
                        type="button"
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${checked ? "bg-primary/5" : "hover:bg-muted/60"
                          }`}
                        onClick={() => toggleStage(stage.id)}
                        disabled={isPending}
                      >
                        <Checkbox checked={checked} readOnly />
                        <span className="truncate text-sm font-semibold">
                          Stage {stage.stage_number}: {stage.stage_name}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
              {errors.stages ? (
                <p className="text-xs text-destructive">{errors.stages}</p>
              ) : null}
            </div>
          </div>

          <DialogFooter className="items-center gap-2 border-t border-border px-6 py-4 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {props.mode === "create" ? "Creating..." : "Saving..."}
                </>
              ) : (
                props.mode === "create" ? "Create tournament" : "Save changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogDrawerContent>
    </Dialog>
  );
}
