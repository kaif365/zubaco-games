"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { BookOpen, Check, Layers, Loader2, Save, PlusCircle, Clock3 } from "lucide-react";
import { ScoringSection } from "./ScoringSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  MemoryCardMatchingGameConfig as MemoryCardMatchingConfig,
  MemoryCardMatchingStageConfigLevel,
  MemoryCardMatchingDemoLevel,
} from "@/types/game-config";
import { useToast } from "@/providers/ToastProvider";
import { useSaveGameConfig } from "../../hooks/useStageGameConfig";
import { useDifficulties } from "../../hooks/pools/useDefaultPool";
import { useMemoryCardMatchingLevels } from "../../hooks/pools/useMemoryCardMatchingLevels";

interface MemoryCardMatchingGameConfigProps {
  gameId?: string;
  gameName: string;
  stageId: string;
  config: MemoryCardMatchingConfig | null;
  configDataUpdatedAt: number;
}

type SaveState = "idle" | "saving" | "saved";

const LIMITS = {
  boardCount: { min: 0, max: 50 },
  timeLimit: { min: 30, max: 600, step: 15 },
} as const;

function isDemoLevel(level: { difficulty?: { name: string } | null }): boolean {
  return level.difficulty?.name?.toLowerCase() === "demo";
}

function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return remaining === 0 ? `${minutes} min` : `${minutes}m ${remaining}s`;
}

function SectionCard({
  icon,
  title,
  headerRight,
  children,
}: {
  icon: ReactNode;
  title: string;
  headerRight?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="px-6 pb-0 pt-5">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-muted-foreground">
              {icon}
            </span>
            <span>{title}</span>
          </div>
          {headerRight}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-2 pt-1">{children}</CardContent>
    </Card>
  );
}

function Stepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="flex h-8 w-8 items-center justify-center rounded-l-md border border-r-0 border-input bg-muted/50 text-base leading-none text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        -
      </button>
      <div className="flex h-8 w-12 items-center justify-center border-y border-input bg-background text-sm font-bold tabular-nums min-h-[40px]">
        {value}
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="flex h-8 w-8 items-center justify-center rounded-r-md border border-l-0 border-input bg-muted/50 text-base leading-none text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}

export function MemoryCardMatchingGameConfig({
  gameId,
  gameName,
  stageId,
  config,
}: MemoryCardMatchingGameConfigProps) {
  const [draftValues, setDraftValues] = useState<MemoryCardMatchingConfig | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const { toast } = useToast();

  const { data: difficultyData, isLoading: difficultiesLoading } = useDifficulties(gameName);
  // Exclude the "Demo" difficulty — it is configured separately in the Demo section
  const difficulties = useMemo(
    () => (difficultyData?.data ?? []).filter(d => d.name.toLowerCase() !== "demo"),
    [difficultyData?.data],
  );

  const { data: demoPoolData, isLoading: demoLevelsLoading } = useMemoryCardMatchingLevels(
    gameId ?? stageId,
    gameName,
    { limit: 50 },
  );
  const demoPoolLevels = useMemo(
    () => (demoPoolData?.data ?? []).filter(isDemoLevel),
    [demoPoolData?.data],
  );
  const demoLevelNames = useMemo(
    () => new Map(demoPoolLevels.map((l) => [l.difficultyId, l.name])),
    [demoPoolLevels],
  );

  const { mutateAsync } = useSaveGameConfig(gameId, gameName);

  const initialValues = useMemo(() => {
    if (!config && !difficulties.length) return null;

    const configLevels = config?.levels ?? [];

    const mergedLevels: MemoryCardMatchingStageConfigLevel[] = difficulties.map(d => {
      const existing = configLevels.find(l => l.difficultyId === d.id);
      return {
        id: existing?.id,
        difficultyId: d.id,
        boardCount: existing?.boardCount ?? 0,
        maxScore: existing?.maxScore ?? 0,
      };
    });

    const configDemoLevels = config?.demoLevels ?? [];
    const mergedDemoLevels: MemoryCardMatchingDemoLevel[] = demoPoolLevels.map(pl => {
      const existing = configDemoLevels.find(dl => dl.difficultyId === pl.difficultyId);
      return { difficultyId: pl.difficultyId, boardCount: existing?.boardCount ?? 0 };
    });

    return {
      id: config?.id ?? "",
      stageId,
      timeLimit: config?.timeLimit ?? 120,
      maxTimeBonus: config?.maxTimeBonus ?? 0,
      enableDemo: config?.enableDemo ?? false,
      levels: mergedLevels,
      demoLevels: mergedDemoLevels,
      createdAt: config?.createdAt ?? "",
      __kind: "memory-card-matching" as const
    };
  }, [config, difficulties, stageId, demoPoolLevels]);

  const values = draftValues ?? initialValues;

  const isDirty = useMemo(() => {
    if (!values || !initialValues) return false;
    return JSON.stringify(values) !== JSON.stringify(initialValues);
  }, [values, initialValues]);

  const scoringRules = [
    { label: "Time Bonus", value: "floor(maxTimeBonus × remaining / total)" },
  ];

  const updateValue = <K extends keyof MemoryCardMatchingConfig>(
    key: K,
    value: MemoryCardMatchingConfig[K]
  ) => {
    setDraftValues(prev => ({
      ...(prev ?? values!),
      [key]: value
    }));
  };

  const updateLevel = (difficultyId: string, boardCount: number) => {
    if (!values) return;
    const nextLevels = values.levels.map(l =>
      l.difficultyId === difficultyId ? { ...l, boardCount } : l
    );
    updateValue("levels", nextLevels);
  };

  const updateDemoLevel = (difficultyId: string, boardCount: number) => {
    if (!values) return;
    const nextDemoLevels = values.demoLevels.map(l =>
      l.difficultyId === difficultyId ? { ...l, boardCount } : l
    );
    updateValue("demoLevels", nextDemoLevels);
  };

  const updateLevelMaxScore = (difficultyId: string, maxScore: number) => {
    if (!values) return;
    const nextLevels = values.levels.map(l =>
      l.difficultyId === difficultyId ? { ...l, maxScore } : l
    );
    updateValue("levels", nextLevels);
  };

  const handleSave = async () => {
    if (!values) return;

    setSaveState("saving");
    try {
      await mutateAsync(values);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
      setDraftValues(null);
      toast({
        title: config ? "Configuration saved" : "Configuration created",
        variant: "success",
      });
    } catch (error) {
      setSaveState("idle");
      toast({
        title: "Failed to save configuration",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  if (difficultiesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!difficulties.length) {
    return (
      <div className="rounded-xl border border-border bg-muted/20 p-6 text-sm text-muted-foreground">
        No difficulties found. Please add difficulties (Easy, Medium, Hard) first.
      </div>
    );
  }

  if (!values) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            No Memory Card Matching configuration exists for this stage.
          </p>
        </div>
        <Button
          onClick={() => setDraftValues(initialValues)}
          className="mt-4"
          size="sm"
        >
          <PlusCircle className="mr-1.5 h-4 w-4" />
          Initialize Configuration
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ScoringSection
        maxTimeBonus={values.maxTimeBonus ?? 0}
        levels={difficulties.map(d => {
          const level = values.levels.find(l => l.difficultyId === d.id);
          return { id: d.id, name: d.name, maxScore: level?.maxScore ?? 0 };
        })}
        onMaxTimeBonusChange={(v) => updateValue("maxTimeBonus", v)}
        onLevelMaxScoreChange={(id, v) => updateLevelMaxScore(id, v)}
        rules={scoringRules}
      />

      <SectionCard
        icon={<Clock3 className="h-3.5 w-3.5" />}
        title="Game Timer"
        headerRight={
          <span className="rounded-full bg-primary/15 px-3 py-0.5 text-xs font-medium text-primary tabular-nums">
            {formatSeconds(values.timeLimit)}
          </span>
        }
      >
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatSeconds(LIMITS.timeLimit.min)}</span>
            <span>{formatSeconds(LIMITS.timeLimit.max)}</span>
          </div>
          <div className="relative flex h-5 items-center">
            <div className="absolute h-1.5 w-full rounded-full bg-muted" />
            <div
              className="absolute h-1.5 rounded-full bg-primary transition-all"
              style={{ width: `${((values.timeLimit - LIMITS.timeLimit.min) / (LIMITS.timeLimit.max - LIMITS.timeLimit.min)) * 100}%` }}
            />
            <input
              type="range"
              min={LIMITS.timeLimit.min}
              max={LIMITS.timeLimit.max}
              step={LIMITS.timeLimit.step}
              value={values.timeLimit}
              onChange={(e) => updateValue("timeLimit", Number(e.target.value))}
              className="absolute z-10 h-5 w-full cursor-pointer opacity-0"
            />
            <div
              className="pointer-events-none absolute h-4 w-4 rounded-full border-2 border-background bg-primary shadow-md"
              style={{ left: `calc(${((values.timeLimit - LIMITS.timeLimit.min) / (LIMITS.timeLimit.max - LIMITS.timeLimit.min)) * 100}% - 8px)` }}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={<Layers className="h-3.5 w-3.5" />} title="Difficulty Configuration">
        <div className="divide-y divide-border">
          {difficulties.map((difficulty) => {
            const level = values.levels.find(l => l.difficultyId === difficulty.id);
            return (
              <div key={difficulty.id} className="flex items-center justify-between py-4 first:pt-2 last:pb-2">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{difficulty.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Number of boards for {difficulty.name.toLowerCase()} difficulty.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Stepper
                    value={level?.boardCount ?? 0}
                    min={LIMITS.boardCount.min}
                    max={LIMITS.boardCount.max}
                    onChange={(val) => updateLevel(difficulty.id, val)}
                  />
                  <span className="w-12 text-xs text-muted-foreground text-right">boards</span>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard icon={<BookOpen className="h-3.5 w-3.5" />} title="Demo">
        <div className="flex items-center justify-between border-b border-border py-4 last:border-none">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Enable Demo</p>
            <p className="text-xs text-muted-foreground">
              Turn on demo mode and configure separate board counts for the demo levels.
            </p>
          </div>
          <Switch
            checked={values.enableDemo}
            onCheckedChange={(checked) => updateValue("enableDemo", checked)}
          />
        </div>

        {values.enableDemo && (
          <>
            {demoLevelsLoading ? (
              <div className="py-6 flex justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : demoPoolLevels.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No demo level was found for this game.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {values.demoLevels.map((demoLevel) => (
                  <div key={demoLevel.difficultyId} className="flex items-center justify-between py-4 first:pt-2 last:pb-2">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">
                        {demoLevelNames.get(demoLevel.difficultyId) ?? "Demo"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Set how many boards should be used during the demo. Use 0 to exclude it.
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Stepper
                        value={demoLevel.boardCount}
                        min={LIMITS.boardCount.min}
                        max={LIMITS.boardCount.max}
                        onChange={(val) => updateDemoLevel(demoLevel.difficultyId, val)}
                      />
                      <span className="w-12 text-xs text-muted-foreground text-right">boards</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </SectionCard>

      <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-5 py-3">
        <span className="text-xs text-muted-foreground">
          {isDirty ? (
            <span className="font-medium text-amber-600">Unsaved changes</span>
          ) : saveState === "saved" ? (
            <span className="flex items-center gap-1.5 font-medium text-emerald-600">
              <Check className="h-3.5 w-3.5" />
              {config ? "All changes saved" : "Configuration created"}
            </span>
          ) : config ? (
            "No changes"
          ) : (
            "Ready to create"
          )}
        </span>
        <Button
          onClick={handleSave}
          disabled={saveState === "saving" || (!isDirty && !!config)}
          size="sm"
          className="min-w-[130px]"
        >
          {saveState === "saving" ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {config ? "Save Changes" : "Create Config"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
