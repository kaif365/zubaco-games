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
import { useGames } from "@/features/games/hooks/useGames";
import { useCreateStage, useUpdateStage } from "../hooks/useStages";
import type { ApiError } from "@/lib/api/client";
import type { Game } from "@/types/game";

interface BaseProps {
  isOpen: boolean;
  onClose: () => void;
}

type CreateProps = BaseProps & {
  mode: "create";
};

type EditProps = BaseProps & {
  mode: "edit";
  stageId: string;
  initialStageNumber: number | null;
  initialStageName: string;
  initialGameIds: string[];
};

export type StageUpsertDrawerProps = CreateProps | EditProps;

function isEdit(props: StageUpsertDrawerProps): props is EditProps {
  return props.mode === "edit";
}

export function StageUpsertDrawer(props: StageUpsertDrawerProps) {
  const { isOpen, onClose } = props;
  const { toast } = useToast();

  const initialStageNumber = isEdit(props) ? props.initialStageNumber : null;
  const initialStageName = isEdit(props) ? props.initialStageName : "";
  const initialGameIds = isEdit(props) ? props.initialGameIds : [];

  const [stageNumber, setStageNumber] = useState<string>(
    initialStageNumber ? String(initialStageNumber) : "",
  );
  const [stageName, setStageName] = useState(initialStageName);
  const [selectedGameIds, setSelectedGameIds] =
    useState<string[]>(initialGameIds);
  const [gameSearch, setGameSearch] = useState("");
  const debouncedGameSearch = useDebounce(gameSearch, 300);
  const [gamePage, setGamePage] = useState(1);
  const [gameItems, setGameItems] = useState<Game[]>([]);

  const { mutate: createStage, isPending: isCreating } = useCreateStage();
  const { mutate: updateStage, isPending: isUpdating } = useUpdateStage();
  const isPending = isCreating || isUpdating;

  const { data: gamesData, isLoading: gamesLoading } = useGames({
    page: gamePage,
    pageSize: 25,
    search: debouncedGameSearch,
    status: "all",
    enabled: isOpen,
  });
  const gamesTotalPages = gamesData?.totalPages ?? 1;
  const currentPageItems = useMemo(
    () => (gamesData?.data ?? []).sort((a, b) => a.name.localeCompare(b.name)),
    [gamesData?.data],
  );

  useEffect(() => {
    if (!isOpen) return;
    if (!gamesData) return;

    /* eslint-disable react-hooks/set-state-in-effect */
    setGameItems((prev) => {
      const base = gamePage === 1 ? [] : prev;
      const seen = new Set(base.map((g) => g.id));
      for (const g of currentPageItems) {
        if (!seen.has(g.id)) base.push(g);
      }
      base.sort((a, b) => a.name.localeCompare(b.name));
      return [...base];
    });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [currentPageItems, gamePage, gamesData, isOpen]);

  const resetForm = () => {
    setStageNumber(initialStageNumber ? String(initialStageNumber) : "");
    setStageName(initialStageName);
    setSelectedGameIds(initialGameIds);
    setGameSearch("");
    setGamePage(1);
    setGameItems([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleStageNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^[1-9]\d*$/.test(value)) {
      setStageNumber(value);
    }
  };

  const toggleGame = (id: string) => {
    setSelectedGameIds((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  };

  const bodyRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef(false);
  const onBodyScroll = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    if (gamesLoading) return;
    if (loadMoreRef.current) return;
    if (gamePage >= gamesTotalPages) return;

    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (remaining > 240) return;

    loadMoreRef.current = true;
    setGamePage((p) => p + 1);
    window.setTimeout(() => {
      loadMoreRef.current = false;
    }, 200);
  }, [gamePage, gamesLoading, gamesTotalPages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageNumber || !stageName.trim() || selectedGameIds.length === 0) return;

    const payload = {
      stage_number: parseInt(stageNumber, 10),
      stage_name: stageName.trim(),
      gameIds: selectedGameIds,
    };

    if (props.mode === "create") {
      createStage(payload, {
        onSuccess: () => {
          toast({
            title: "Stage created",
            description: `Stage ${stageNumber} - "${stageName}" has been successfully created.`,
            variant: "success",
          });
          resetForm();
          onClose();
        },
        onError: (err: unknown) => {
          const apiError = err as ApiError;
          const message = apiError.message || "Failed to create stage";
          toast({
            title: "Creation failed",
            description:
              message === "STAGE_ALREADY_EXISTS"
                ? "A stage with this number or name already exists."
                : message,
            variant: "destructive",
          });
        },
      });
      return;
    }

    updateStage(
      { stageId: props.stageId, ...payload },
      {
        onSuccess: () => {
          toast({
            title: "Stage updated",
            description: `Stage ${stageNumber} - "${stageName}" has been updated.`,
            variant: "success",
          });
          onClose();
        },
        onError: (err: unknown) => {
          const apiError = err as ApiError;
          const message = apiError.message || "Failed to update stage";
          toast({
            title: "Update failed",
            description:
              message === "STAGE_ALREADY_EXISTS"
                ? "A stage with this number or name already exists."
                : message,
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogDrawerContent className="max-w-[560px]">
        <DialogHeader className="border-b border-border px-6 py-5">
          <DialogTitle className="text-xl">
            {props.mode === "create" ? "Create stage" : "Edit stage"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {props.mode === "create"
              ? "Fill in the details below."
              : "Update stage details and assigned games."}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div
            ref={bodyRef}
            onScroll={onBodyScroll}
            className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-3"
          >
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-4 space-y-2">
                <Label htmlFor="stage_number">Number</Label>
                <Input
                  id="stage_number"
                  type="text"
                  inputMode="numeric"
                  placeholder="101"
                  value={stageNumber}
                  onChange={handleStageNumberChange}
                  disabled={isPending}
                  autoFocus
                  required
                />
              </div>
              <div className="col-span-8 space-y-2">
                <Label htmlFor="stage_name">Stage name</Label>
                <Input
                  id="stage_name"
                  placeholder="Enter stage name..."
                  value={stageName}
                  onChange={(e) => setStageName(e.target.value)}
                  disabled={isPending}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label>Games</Label>
                <Badge variant="outline">{selectedGameIds.length} selected</Badge>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search games..."
                  className="pl-10"
                  value={gameSearch}
                  onChange={(e) => setGameSearch(e.target.value)}
                  disabled={isPending}
                />
              </div>

              <div className="rounded-lg border divide-y">
                {gamesLoading ? (
                  <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading games...
                  </div>
                ) : gameItems.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No games found.
                  </div>
                ) : (
                  gameItems.map((game) => {
                    const checked = selectedGameIds.includes(game.id);
                    return (
                      <div
                        key={game.id}
                        className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors ${checked ? "bg-primary/5" : "hover:bg-muted/60"
                          }`}
                        onClick={() => toggleGame(game.id)}
                      >
                        <Checkbox checked={checked} readOnly />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">
                            {game.name}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
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
            <Button
              type="submit"
              disabled={
                isPending ||
                !stageNumber ||
                !stageName.trim() ||
                selectedGameIds.length === 0
              }
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {props.mode === "create" ? "Creating..." : "Saving..."}
                </>
              ) : props.mode === "create" ? (
                "Create stage"
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogDrawerContent>
    </Dialog>
  );
}
