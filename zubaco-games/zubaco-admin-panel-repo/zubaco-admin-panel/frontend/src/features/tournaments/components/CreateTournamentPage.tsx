"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/config/routes";
import { useDebounce } from "@/hooks/useDebounce";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/providers/ToastProvider";
import { Loader2 } from "lucide-react";
import { useStages } from "@/features/stages/hooks/useStages";
import { useCreateTournament } from "../hooks/useTournaments";

export function CreateTournamentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { mutate: createTournament, isPending } = useCreateTournament();

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [stageSearch, setStageSearch] = useState("");
  const [selectedStageIds, setSelectedStageIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const debouncedStageSearch = useDebounce(stageSearch, 250);
  const { data: stagesData, isLoading: isLoadingStages } = useStages(
    {
      page: 1,
      pageSize: 100,
      search: debouncedStageSearch,
    },
    { enabled: true },
  );

  const stageOptions = useMemo(
    () =>
      (stagesData?.data ?? [])
        .filter((stage) => !stage.deleted_at)
        .sort((a, b) => a.stage_number - b.stage_number),
    [stagesData?.data],
  );

  const selectedStageSet = useMemo(
    () => new Set(selectedStageIds),
    [selectedStageIds],
  );

  const toggleAllVisible = () => {
    const visibleIds = stageOptions.map((stage) => stage.id);
    const hasUnselected = visibleIds.some((id) => !selectedStageSet.has(id));

    if (hasUnselected) {
      setSelectedStageIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
      return;
    }

    setSelectedStageIds((prev) =>
      prev.filter((id) => !visibleIds.includes(id)),
    );
  };

  const toggleStageSelection = (stageId: string) => {
    setSelectedStageIds((prev) =>
      prev.includes(stageId)
        ? prev.filter((id) => id !== stageId)
        : [...prev, stageId],
    );
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!name.trim()) {
      nextErrors.name = "Tournament name is required.";
    }
    if (!startDate) {
      nextErrors.startDate = "Start date is required.";
    }
    if (!endDate) {
      nextErrors.endDate = "End date is required.";
    }
    if (startDate && endDate && endDate < startDate) {
      nextErrors.endDate = "End date must be after start date.";
    }

    if (selectedStageIds.length === 0) {
      nextErrors.stages = "Select at least one stage.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = () => {
    if (!validate()) return;

    createTournament(
      {
        name: name.trim(),
        start_date: new Date(`${startDate}T00:00:00.000Z`).toISOString(),
        end_date: new Date(`${endDate}T00:00:00.000Z`).toISOString(),
        status: "ACTIVE",
        stageIds: selectedStageIds,
      },
      {
        onSuccess: (response) => {
          toast({
            title: "Tournament created",
            description: `"${name.trim()}" has been successfully created.`,
            variant: "success",
          });
          if (response.data?.id) {
            router.push(ROUTES.TOURNAMENTS_DETAIL(response.data.id));
            return;
          }
          router.push(ROUTES.TOURNAMENTS);
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
      },
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Home / Tournaments / Create</p>
        <h1 className="text-3xl font-semibold tracking-tight">Create Tournament</h1>
        <p className="text-sm text-muted-foreground">
          Set up tournament details and attach stages. You can update mappings later
          from tournament detail.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tournament Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tournament-name">
              Tournament Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="tournament-name"
              placeholder="e.g. Summer Showdown 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tournament-start-date">
                Start Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tournament-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isPending}
              />
              {errors.startDate && (
                <p className="text-xs text-destructive">{errors.startDate}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tournament-end-date">
                End Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tournament-end-date"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isPending}
              />
              {errors.endDate && (
                <p className="text-xs text-destructive">{errors.endDate}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle>
              Stages <span className="text-destructive">*</span>
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {selectedStageIds.length} selected
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Search stages..."
            value={stageSearch}
            onChange={(e) => setStageSearch(e.target.value)}
            disabled={isPending}
          />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={
                stageOptions.length > 0 &&
                stageOptions.every((stage) => selectedStageSet.has(stage.id))
              }
              onChange={toggleAllVisible}
            />
            <span>Select all visible stages</span>
          </div>
          <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border border-border p-2">
            {!isLoadingStages &&
              stageOptions.map((stage) => {
                const checked = selectedStageSet.has(stage.id);
                return (
                  <button
                    key={stage.id}
                    type="button"
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-muted"
                    onClick={() => toggleStageSelection(stage.id)}
                    disabled={isPending}
                  >
                    <Checkbox checked={checked} readOnly />
                    <span className="text-sm">
                      Stage {stage.stage_number}: {stage.stage_name}
                    </span>
                  </button>
                );
              })}
          </div>

          {isLoadingStages && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading stages...
            </div>
          )}
          {!isLoadingStages && stageOptions.length === 0 && (
            <p className="text-sm text-muted-foreground">No stages found.</p>
          )}
          {errors.stages && <p className="text-xs text-destructive">{errors.stages}</p>}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => router.push(ROUTES.TOURNAMENTS)}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={isPending}>
          {isPending ? "Creating..." : "Create Tournament"}
        </Button>
      </div>
    </div>
  );
}
