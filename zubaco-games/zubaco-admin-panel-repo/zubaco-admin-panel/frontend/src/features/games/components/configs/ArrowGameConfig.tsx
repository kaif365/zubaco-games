"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  BookOpen,
  Check,
  Clock3,
  Layers,
  Loader2,
  PlusCircle,
  Save,
} from "lucide-react";
import { ScoringSection } from "./ScoringSection";
import type {
  ArrowGameConfig as ArrowConfig,
  ArrowLevel,
  ArrowStageConfigLevel,
} from "@/types/game-config";
import { useSaveGameConfig } from "../../hooks/useStageGameConfig";
import { useGameLevels } from "../../hooks/pools/useDefaultPool";
import { useToast } from "@/providers/ToastProvider";
import { compareLevelsByName } from "@/utils/level-order";
import { formatLevelConfigError } from "../../utils/level-config-errors";

interface ArrowGameConfigProps {
  gameId?: string;
  gameName: string;
  stageId: string;
  config: ArrowConfig | null;
  configDataUpdatedAt: number;
}

type SaveState = "idle" | "saving" | "saved";

const TIMER_LIMITS = {
  defaultMin: 10,
  defaultMax: 300,
  absoluteMin: 1,
  step: 1,
} as const;

const BOARD_LIMITS = {
  min: 0,
  max: 50,
} as const;

interface TimerBounds {
  min: number;
  max: number;
}

function formatSeconds(value: number): string {
  if (value < 60) return `${value}s`;
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return seconds === 0 ? `${minutes} min` : `${minutes}m ${seconds}s`;
}

function titleCase(name: string): string {
  return name
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function sortLevels(levels: ArrowLevel[]): ArrowLevel[] {
  return [...levels].sort((a, b) => compareLevelsByName(a.name, b.name));
}

function isDemoLevel(level: ArrowLevel): boolean {
  const name = level.name.trim().toLowerCase();
  return name === "demo" || name.startsWith("demo ");
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function buildTimerBounds(timeLimit: number): TimerBounds {
  return {
    min: Math.max(
      TIMER_LIMITS.absoluteMin,
      Math.min(TIMER_LIMITS.defaultMin, timeLimit),
    ),
    max: Math.max(TIMER_LIMITS.defaultMax, timeLimit),
  };
}

function buildDefaultConfig(
  stageId: string,
  levels: ArrowLevel[],
): ArrowConfig {
  return {
    id: "",
    stageId,
    timeLimit: 60,
    enableDemo: false,
    levels: mapLevelsToBoardConfig(levels),
    demoLevels: mapLevelsToBoardConfig(levels),
    createdAt: "",
  };
}

function mapLevelsToBoardConfig(
  levels: ArrowLevel[],
  configuredLevels: ArrowStageConfigLevel[] = [],
): ArrowStageConfigLevel[] {
  const levelMap = new Map(
    configuredLevels.map((level) => [level.levelId, level]),
  );

  return sortLevels(levels).map((level) => ({
    levelId: level.id,
    boardCount: levelMap.get(level.id)?.boardCount ?? 0,
    maxScore: levelMap.get(level.id)?.maxScore ?? 0,
  }));
}

function mergeConfigWithLevels(
  stageId: string,
  config: ArrowConfig | null,
  levels: ArrowLevel[],
): ArrowConfig {
  if (!config) {
    return buildDefaultConfig(stageId, levels);
  }

  return {
    ...config,
    stageId,
    enableDemo: config.enableDemo ?? false,
    levels: mapLevelsToBoardConfig(levels, config.levels),
    demoLevels: mapLevelsToBoardConfig(levels, config.demoLevels ?? []),
  };
}

function normalizeArrowConfigForComparison(config: ArrowConfig): ArrowConfig {
  return {
    ...config,
    demoLevels: config.demoLevels.map((level) => ({
      ...level,
      boardCount: config.enableDemo ? level.boardCount : 0,
    })),
  };
}

function sortLevelCounts(levels: ArrowStageConfigLevel[]) {
  return [...levels].sort((a, b) => a.levelId.localeCompare(b.levelId));
}

function areLevelCountsEqual(
  a: ArrowStageConfigLevel[],
  b: ArrowStageConfigLevel[],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const left = a[i];
    const right = b[i];
    if (left.levelId !== right.levelId) return false;
    if (left.boardCount !== right.boardCount) return false;
    if ((left.maxScore ?? 0) !== (right.maxScore ?? 0)) return false;
  }
  return true;
}

function areArrowConfigsEquivalent(a: ArrowConfig, b: ArrowConfig): boolean {
  if (a.timeLimit !== b.timeLimit) return false;
  if ((a.enableDemo ?? false) !== (b.enableDemo ?? false)) return false;
  if ((a.maxTimeBonus ?? 0) !== (b.maxTimeBonus ?? 0)) return false;

  const aNormalized = normalizeArrowConfigForComparison(a);
  const bNormalized = normalizeArrowConfigForComparison(b);

  if (
    !areLevelCountsEqual(
      sortLevelCounts(aNormalized.levels),
      sortLevelCounts(bNormalized.levels),
    )
  ) {
    return false;
  }

  if (
    !areLevelCountsEqual(
      sortLevelCounts(aNormalized.demoLevels),
      sortLevelCounts(bNormalized.demoLevels),
    )
  ) {
    return false;
  }

  return true;
}

function validateArrowConfig(config: ArrowConfig): string | null {
  const configuredLevels = config.levels.filter(
    (level) => level.boardCount > 0,
  );
  if (configuredLevels.length < 1) {
    return "Add at least 1 board to any level before saving.";
  }

  if (config.enableDemo) {
    const configuredDemoLevels = config.demoLevels.filter(
      (level) => level.boardCount > 0,
    );
    if (configuredDemoLevels.length < 1) {
      return "Demo is enabled — add at least 1 demo board before saving.";
    }
  }

  return null;
}

function Slider({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const pct = max === min ? 100 : ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      <div className="relative flex h-5 items-center">
        <div className="absolute h-1.5 w-full rounded-full bg-muted/70" />
        <div
          className="pointer-events-none absolute h-1.5 rounded-full bg-primary"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onInput={(event) => onChange(Number(event.currentTarget.value))}
          className="absolute z-10 h-5 w-full cursor-pointer opacity-0"
        />
        <div
          className="pointer-events-none absolute h-4 w-4 rounded-full border-2 border-background bg-primary shadow-md"
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatSeconds(min)}</span>
        <span>{formatSeconds(max)}</span>
      </div>
    </div>
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

function LevelRows({
  levels,
  levelNames,
  description,
  onChange,
}: {
  levels: ArrowStageConfigLevel[];
  levelNames: Map<string, string>;
  description: string;
  onChange: (levelId: string, boardCount: number) => void;
}) {
  return (
    <>
      {levels.map((levelConfig) => (
        <div
          key={levelConfig.levelId}
          className="flex items-center justify-between gap-6 border-b border-border py-4 last:border-0"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              {levelNames.get(levelConfig.levelId) ?? "Level"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {description}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Stepper
              value={levelConfig.boardCount}
              min={BOARD_LIMITS.min}
              max={BOARD_LIMITS.max}
              onChange={(boardCount) =>
                onChange(levelConfig.levelId, boardCount)
              }
            />
            <span className="w-12 text-xs text-muted-foreground">boards</span>
          </div>
        </div>
      ))}
    </>
  );
}

function SectionCard({
  icon,
  title,
  headerRight,
  headerClassName,
  contentClassName,
  children,
}: {
  icon: ReactNode;
  title: string;
  headerRight?: ReactNode;
  headerClassName?: string;
  contentClassName?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader
        className={["px-6 pb-0 pt-5", headerClassName].filter(Boolean).join(" ")}
      >
        <CardTitle className="flex items-center gap-2 text-sm">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-muted-foreground">
            {icon}
          </span>
          <span>{title}</span>
          {headerRight ? <span className="ml-2">{headerRight}</span> : null}
        </CardTitle>
      </CardHeader>
      <CardContent
        className={["px-6 pb-2 pt-1", contentClassName].filter(Boolean).join(" ")}
      >
        {children}
      </CardContent>
    </Card>
  );
}

export function ArrowGameConfig({
  gameId,
  gameName,
  stageId,
  config,
}: ArrowGameConfigProps) {
  const [draftValues, setDraftValues] = useState<ArrowConfig | null>(null);
  const [createBaseline, setCreateBaseline] = useState<ArrowConfig | null>(
    null,
  );
  const [hasUserEdits, setHasUserEdits] = useState(false);
  const [timerBounds, setTimerBounds] = useState<TimerBounds>(() =>
    buildTimerBounds(config?.timeLimit ?? 60),
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const { data: arrowLevels, isLoading: levelsLoading } =
    useGameLevels(gameName);
  const { mutateAsync } = useSaveGameConfig(gameId, gameName);
  const { toast } = useToast();

  const sortedLevels = useMemo(
    () => sortLevels(arrowLevels ?? []),
    [arrowLevels],
  );

  const initialValues = useMemo(() => {
    if (!sortedLevels.length || !config) return null;
    return mergeConfigWithLevels(stageId, config, sortedLevels);
  }, [config, sortedLevels, stageId]);

  const values = draftValues ?? initialValues;

  const levelNames = useMemo(
    () =>
      new Map(sortedLevels.map((level) => [level.id, titleCase(level.name)])),
    [sortedLevels],
  );

  const demoLevelIds = useMemo(() => {
    const ids = sortedLevels.filter(isDemoLevel).map((level) => level.id);
    return new Set(ids);
  }, [sortedLevels]);

  const scoringRules = [
    { label: "Partial Round", value: "floor(maxScore × cleared / total arrows)" },
    { label: "Time Bonus", value: "floor(maxTimeBonus × remaining / total)" },
    { label: "Final Score", value: "Sum of rounds + time bonus" },
  ];

  const dirtyBaseline = initialValues ?? createBaseline;
  const isDirty =
    hasUserEdits && values
      ? dirtyBaseline
        ? !areArrowConfigsEquivalent(values, dirtyBaseline)
        : true
      : false;

  const validationMessage = values ? validateArrowConfig(values) : null;
  const isValid = !validationMessage;

  const updateValues = (updater: (source: ArrowConfig) => ArrowConfig) => {
    setHasUserEdits(true);
    setDraftValues((prev) => {
      const source = prev ?? values;
      return source ? updater(source) : prev;
    });
  };

  const updateTimerBounds = (nextBounds: TimerBounds) => {
    setTimerBounds(nextBounds);
    updateValues((source) => ({
      ...source,
      timeLimit: clamp(source.timeLimit, nextBounds.min, nextBounds.max),
    }));
  };

  const handleTimerBoundChange = (
    bound: keyof TimerBounds,
    rawValue: string,
  ) => {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) return;

    const nextValue = Math.max(TIMER_LIMITS.absoluteMin, Math.floor(parsed));

    if (bound === "min") {
      const min = nextValue;
      const max = Math.max(timerBounds.max, min + TIMER_LIMITS.step);
      updateTimerBounds({ min, max });
      return;
    }

    const max = Math.max(
      nextValue,
      TIMER_LIMITS.absoluteMin + TIMER_LIMITS.step,
    );
    const min = Math.min(timerBounds.min, max - TIMER_LIMITS.step);
    updateTimerBounds({ min, max });
  };

  const handleCreate = () => {
    if (!sortedLevels.length) return;
    setTimerBounds(buildTimerBounds(60));
    const next = buildDefaultConfig(stageId, sortedLevels);
    setCreateBaseline(next);
    setHasUserEdits(false);
    setDraftValues(next);
  };

  const handleSave = async () => {
    if (!values) return;
    const payloadValues =
      demoLevelIds.size > 0
        ? {
            ...values,
            demoLevels: values.demoLevels.filter((level) =>
              demoLevelIds.has(level.levelId),
            ),
          }
        : values;

    const message = validateArrowConfig(payloadValues);
    if (message) {
      toast({
        title: "Fix configuration",
        description: message,
        variant: "destructive",
      });
      return;
    }

    setSaveState("saving");
    try {
      await mutateAsync(payloadValues);
      setSaveState("saved");
      setDraftValues(null);
      setHasUserEdits(false);
      setTimeout(() => setSaveState("idle"), 2500);
      toast({
        title: config ? "Configuration saved" : "Configuration created",
        variant: "success",
      });
    } catch (error) {
      setSaveState("idle");
      const description =
        formatLevelConfigError(error, levelNames) ??
        (error instanceof Error && error.message
          ? error.message
          : "Please try again.");
      toast({
        title: config
          ? "Failed to save configuration"
          : "Failed to create configuration",
        description,
        variant: "destructive",
      });
    }
  };

  if (levelsLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!sortedLevels.length) {
    return (
      <div className="rounded-xl border border-border bg-muted/20 p-6 text-sm text-muted-foreground">
        No Arrow levels were found. Add levels like Easy, Medium, and Hard in
        the Arrow service first.
      </div>
    );
  }

  if (!values) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            No Arrow configuration exists for this stage yet.
          </p>
          <p className="text-sm text-muted-foreground">
            Create one here by setting a time limit, level board counts, and
            optional demo board counts.
          </p>
        </div>
        <Button onClick={handleCreate} className="mt-4" size="sm">
          <PlusCircle className="mr-1.5 h-4 w-4" />
          Create Configuration
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ScoringSection
        maxTimeBonus={values.maxTimeBonus ?? 0}
        levels={(demoLevelIds.size > 0
          ? values.levels.filter((l) => !demoLevelIds.has(l.levelId))
          : values.levels
        ).map((l) => ({
          id: l.levelId,
          name: levelNames.get(l.levelId) ?? "Level",
          maxScore: l.maxScore ?? 0,
        }))}
        onMaxTimeBonusChange={(v) =>
          updateValues((source) => ({ ...source, maxTimeBonus: v }))
        }
        onLevelMaxScoreChange={(id, v) =>
          updateValues((source) => ({
            ...source,
            levels: source.levels.map((l) =>
              l.levelId === id ? { ...l, maxScore: v } : l,
            ),
          }))
        }
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
        headerClassName="pt-4"
        contentClassName="pt-0"
      >
        <div className="space-y-2 border-b border-border pb-4 pt-0 last:border-0">
          <div className="pl-8">
            <p className="text-xs text-muted-foreground">
              Set the Arrow round time. Maximum time must stay at least{" "}
              {formatSeconds(TIMER_LIMITS.step)} above minimum time.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label
                htmlFor={`${stageId || "arrow"}-timer-min`}
                className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground"
              >
                Minimum Time
              </Label>
              <Input
                id={`${stageId || "arrow"}-timer-min`}
                type="number"
                min={TIMER_LIMITS.absoluteMin}
                max={timerBounds.max - TIMER_LIMITS.step}
                step={TIMER_LIMITS.step}
                value={timerBounds.min}
                onChange={(event) =>
                  handleTimerBoundChange("min", event.currentTarget.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor={`${stageId || "arrow"}-timer-max`}
                className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground"
              >
                Maximum Time
              </Label>
              <Input
                id={`${stageId || "arrow"}-timer-max`}
                type="number"
                min={timerBounds.min + TIMER_LIMITS.step}
                step={TIMER_LIMITS.step}
                value={timerBounds.max}
                onChange={(event) =>
                  handleTimerBoundChange("max", event.currentTarget.value)
                }
              />
            </div>
          </div>
          <Slider
            value={values.timeLimit}
            min={timerBounds.min}
            max={timerBounds.max}
            step={TIMER_LIMITS.step}
            onChange={(timeLimit) =>
              updateValues((source) => ({ ...source, timeLimit }))
            }
          />
        </div>
      </SectionCard>

      <SectionCard icon={<Layers className="h-3.5 w-3.5" />} title="Levels">
        <LevelRows
          levels={
            demoLevelIds.size > 0
              ? values.levels.filter((level) => !demoLevelIds.has(level.levelId))
              : values.levels
          }
          levelNames={levelNames}
          description="Set how many boards should be included for this difficulty level. Use 0 to exclude it."
          onChange={(levelId, boardCount) =>
            updateValues((source) => ({
              ...source,
              levels: source.levels.map((level) =>
                level.levelId === levelId ? { ...level, boardCount } : level,
              ),
            }))
          }
        />
      </SectionCard>

      <SectionCard icon={<BookOpen className="h-3.5 w-3.5" />} title="Demo">
        <div className="flex items-center justify-between border-b border-border last:border-none py-4">
          <div>
            <p className="text-sm font-medium text-foreground">Enable Demo</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Turn on demo mode and configure separate board counts for the demo
              levels.
            </p>
          </div>
          <Switch
            checked={values.enableDemo}
            onCheckedChange={(enableDemo) =>
              updateValues((source) => ({ ...source, enableDemo }))
            }
            aria-label="Toggle arrow demo mode"
          />
        </div>

        {values.enableDemo && (
          <>
            {demoLevelIds.size > 0 &&
            values.demoLevels.filter((level) => demoLevelIds.has(level.levelId))
              .length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No demo level was found for this game.
              </div>
            ) : (
              <LevelRows
                levels={
                  demoLevelIds.size > 0
                    ? values.demoLevels.filter((level) =>
                        demoLevelIds.has(level.levelId),
                      )
                    : values.demoLevels
                }
                levelNames={levelNames}
                description="Set how many boards should be used during the demo. Use 0 to exclude it."
                onChange={(levelId, boardCount) =>
                  updateValues((source) => ({
                    ...source,
                    demoLevels: source.demoLevels.map((level) =>
                      level.levelId === levelId
                        ? { ...level, boardCount }
                        : level,
                    ),
                  }))
                }
              />
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
          disabled={
            saveState === "saving" || !isValid || (!isDirty && !!config)
          }
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
