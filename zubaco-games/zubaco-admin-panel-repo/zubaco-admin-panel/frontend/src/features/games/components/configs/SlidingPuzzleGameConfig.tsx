'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Check,
  Clock3,
  Layers,
  Loader2,
  PlusCircle,
  Save,
  Hash,
  BookOpen,
} from 'lucide-react';
import { ScoringSection } from './ScoringSection';
import { Switch } from '@/components/ui/switch';
import type {
  ArrowLevel,
  SlidingPuzzleStageConfigLevel,
  SlidingPuzzleGameConfig as SlidingPuzzleStageConfig,
} from '@/types/game-config';
import { useSaveGameConfig } from '../../hooks/useStageGameConfig';
import { useGameLevels } from '../../hooks/pools/useDefaultPool';
import { useToast } from '@/providers/ToastProvider';
import { compareLevelsByName } from '@/utils/level-order';
import { formatLevelConfigError } from '../../utils/level-config-errors';

interface SlidingPuzzleGameConfigProps {
  gameId?: string;
  gameName: string;
  stageId: string;
  config: SlidingPuzzleStageConfig | null;
  configDataUpdatedAt: number;
}

type SaveState = 'idle' | 'saving' | 'saved';

const BOARD_LIMITS = {
  min: 0,
  max: 50,
} as const;

const TIMER_LIMITS = {
  defaultMin: 10,
  defaultMax: 300,
  absoluteMin: 1,
  step: 1,
} as const;

interface TimerBounds {
  min: number;
  max: number;
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
    .join(' ');
}

function sortLevels(levels: ArrowLevel[]): ArrowLevel[] {
  return [...levels].sort((a, b) => compareLevelsByName(a.name, b.name));
}

function buildDefaultConfig(
  stageId: string,
  levels: ArrowLevel[],
): SlidingPuzzleStageConfig {
  return {
    id: '',
    stageId,
    timeLimit: 300, // Default to 5 minutes
    enableDemo: false,
    enableNumbers: true,
    demoLevels: [],
    levels: mapLevelsToBoardConfig(levels),
    createdAt: '',
    __kind: 'sliding-puzzle',
  };
}

function mapLevelsToBoardConfig(
  levels: ArrowLevel[],
  configuredLevels: SlidingPuzzleStageConfigLevel[] = [],
): SlidingPuzzleStageConfigLevel[] {
  const levelMap = new Map(
    configuredLevels.map((level) => [level.levelId, level]),
  );

  return sortLevels(levels).map((level) => ({
    levelId: level.id,
    boardCount: levelMap.get(level.id)?.boardCount ?? 0,
    displayTime: levelMap.get(level.id)?.displayTime ?? 60,
    maxScore: levelMap.get(level.id)?.maxScore ?? 0,
  }));
}

function mergeConfigWithLevels(
  stageId: string,
  config: SlidingPuzzleStageConfig | null,
  levels: ArrowLevel[],
): SlidingPuzzleStageConfig {
  if (!config) {
    return buildDefaultConfig(stageId, levels);
  }

  return {
    ...config,
    stageId,
    enableDemo: config.enableDemo ?? false,
    levels: mapLevelsToBoardConfig(levels, config.levels),
  };
}

function sortLevelCounts(levels: SlidingPuzzleStageConfigLevel[]) {
  return [...levels].sort((a, b) => a.levelId.localeCompare(b.levelId));
}

function areLevelCountsEqual(
  a: SlidingPuzzleStageConfigLevel[],
  b: SlidingPuzzleStageConfigLevel[],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const left = a[i];
    const right = b[i];
    if (left.levelId !== right.levelId) return false;
    if (left.boardCount !== right.boardCount) return false;
    if (left.displayTime !== right.displayTime) return false;
    if ((left.maxScore ?? 0) !== (right.maxScore ?? 0)) return false;
  }
  return true;
}

function areConfigsEquivalent(
  a: SlidingPuzzleStageConfig,
  b: SlidingPuzzleStageConfig,
): boolean {
  return (
    areLevelCountsEqual(sortLevelCounts(a.levels), sortLevelCounts(b.levels)) &&
    a.enableNumbers === b.enableNumbers &&
    a.enableDemo === b.enableDemo &&
    a.timeLimit === b.timeLimit &&
    (a.maxTimeBonus ?? 0) === (b.maxTimeBonus ?? 0)
  );
}

function validateConfig(config: SlidingPuzzleStageConfig): string | null {
  const configuredLevels = config.levels.filter(
    (level) => level.boardCount > 0,
  );
  if (configuredLevels.length < 1) {
    return 'Add at least 1 board to any level before saving.';
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
  levels: SlidingPuzzleStageConfigLevel[];
  levelNames: Map<string, string>;
  description: string;
  onChange: (
    levelId: string,
    updates: { boardCount?: number; displayTime?: number },
  ) => void;
}) {
  return (
    <>
      {levels.map((levelConfig) => (
        <div
          key={levelConfig.levelId}
          className="flex items-center justify-between gap-6 border-b border-border py-4 last:border-0"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {levelNames.get(levelConfig.levelId) ?? 'Level'}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {description}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-6">
            <div className="flex flex-col gap-1.5 items-end">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Boards
              </span>
              <div className="flex items-center gap-2">
                <Stepper
                  value={levelConfig.boardCount}
                  min={BOARD_LIMITS.min}
                  max={BOARD_LIMITS.max}
                  onChange={(boardCount) =>
                    onChange(levelConfig.levelId, { boardCount })
                  }
                />
                <span className="w-12 text-xs text-muted-foreground">
                  boards
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-3 items-end min-w-[200px]">
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Display Time (s)
                </span>
                <span className="text-sm font-bold text-primary">
                  {levelConfig.displayTime}s
                </span>
              </div>
              <div className="w-full">
                <Slider
                  value={levelConfig.displayTime}
                  min={1}
                  max={300}
                  step={1}
                  onChange={(displayTime) =>
                    onChange(levelConfig.levelId, { displayTime })
                  }
                />
              </div>
            </div>
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
        className={['px-6 pb-0 pt-5', headerClassName]
          .filter(Boolean)
          .join(' ')}
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
        className={['px-6 pb-2 pt-1', contentClassName]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </CardContent>
    </Card>
  );
}

export function SlidingPuzzleGameConfig({
  gameId,
  gameName,
  stageId,
  config,
}: SlidingPuzzleGameConfigProps) {
  const [draftValues, setDraftValues] =
    useState<SlidingPuzzleStageConfig | null>(null);
  const [createBaseline, setCreateBaseline] =
    useState<SlidingPuzzleStageConfig | null>(null);
  const [hasUserEdits, setHasUserEdits] = useState(false);
  const [timerBounds, setTimerBounds] = useState<TimerBounds>(() =>
    buildTimerBounds(config?.timeLimit ?? 60),
  );
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const { data: poolLevels, isLoading: levelsLoading } =
    useGameLevels(gameName);
  const { mutateAsync } = useSaveGameConfig(gameId, gameName);
  const { toast } = useToast();

  const sortedLevels = useMemo(
    () => sortLevels(poolLevels ?? []),
    [poolLevels],
  );

  const initialValues = useMemo(() => {
    if (!sortedLevels.length || !config) return null;
    return mergeConfigWithLevels(stageId, config, sortedLevels);
  }, [config, sortedLevels, stageId]);

  const values = draftValues ?? initialValues;
  console.log(values, 'values');
  console.log(initialValues, 'initialValues');
  console.log(draftValues, 'draftValues');

  const levelNames = useMemo(
    () =>
      new Map(sortedLevels.map((level) => [level.id, titleCase(level.name)])),
    [sortedLevels],
  );

  const scoringRules = [
    { label: 'Incomplete Puzzle', value: '0 pts' },
  ];

  const dirtyBaseline = initialValues ?? createBaseline;
  const isDirty =
    hasUserEdits && values
      ? dirtyBaseline
        ? !areConfigsEquivalent(values, dirtyBaseline)
        : true
      : false;

  const validationMessage = values ? validateConfig(values) : null;
  const isValid = !validationMessage;

  const updateValues = (
    updater: (source: SlidingPuzzleStageConfig) => SlidingPuzzleStageConfig,
  ) => {
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

    if (bound === 'min') {
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
    const baseline = buildDefaultConfig(stageId, sortedLevels);
    setCreateBaseline(baseline);
    setDraftValues(baseline);
    setHasUserEdits(false);
    setSaveState('idle');
    setTimerBounds(buildTimerBounds(baseline.timeLimit));
  };

  const handleSave = async () => {
    if (!values) return;
    if (!isValid) {
      toast({
        title: 'Invalid configuration',
        description: validationMessage ?? 'Please fix validation errors.',
        variant: 'destructive',
      });
      return;
    }

    setSaveState('saving');
    try {
      await mutateAsync(values);
      setSaveState('saved');
      setDraftValues(null);
      setHasUserEdits(false);
      setTimeout(() => setSaveState('idle'), 2500);
      toast({
        title: config ? 'Configuration saved' : 'Configuration created',
        variant: 'success',
      });
    } catch (error) {
      setSaveState('idle');
      const description =
        formatLevelConfigError(error, levelNames) ??
        (error instanceof Error && error.message
          ? error.message
          : 'Please try again.');
      toast({
        title: config
          ? 'Failed to save configuration'
          : 'Failed to create configuration',
        description,
        variant: 'destructive',
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

  console.log(sortedLevels, 'sortedLevels');

  if (!sortedLevels.length) {
    return (
      <div className="rounded-xl border border-border bg-muted/20 p-6 text-sm text-muted-foreground">
        No Sliding Puzzle levels were found. Add levels like Easy, Medium, and
        Hard in the Sliding Puzzle service first.
      </div>
    );
  }

  if (!values) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            No Sliding Puzzle configuration exists for this stage yet.
          </p>
          <p className="text-sm text-muted-foreground">
            Create one here by setting a time limit and level board counts.
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
        levels={values.levels.map((l) => ({
          id: l.levelId,
          name: levelNames.get(l.levelId) ?? 'Level',
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

      {/* Configuration  */}
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
              Set the Sliding Puzzle round time. Maximum time must stay at least{' '}
              {formatSeconds(TIMER_LIMITS.step)} above minimum time.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label
                htmlFor={`${stageId}-timer-min`}
                className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground"
              >
                Minimum Time
              </Label>
              <Input
                id={`${stageId}-timer-min`}
                type="number"
                min={TIMER_LIMITS.absoluteMin}
                max={timerBounds.max - TIMER_LIMITS.step}
                step={TIMER_LIMITS.step}
                value={timerBounds.min}
                onChange={(event) =>
                  handleTimerBoundChange('min', event.currentTarget.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor={`${stageId}-timer-max`}
                className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground"
              >
                Maximum Time
              </Label>
              <Input
                id={`${stageId}-timer-max`}
                type="number"
                min={timerBounds.min + TIMER_LIMITS.step}
                step={TIMER_LIMITS.step}
                value={timerBounds.max}
                onChange={(event) =>
                  handleTimerBoundChange('max', event.currentTarget.value)
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

      <SectionCard
        icon={<Hash className="h-3.5 w-3.5" />}
        title="Game Appearance"
        headerClassName="pt-4"
        contentClassName="pt-4"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm">Show Numbers on Tiles</Label>
            <p className="text-xs text-muted-foreground">
              If enabled, tiles will display numbers. If disabled, numbers will
              be hidden.
            </p>
          </div>
          <Switch
            checked={values.enableNumbers}
            onCheckedChange={(checked) =>
              updateValues((source) => ({ ...source, enableNumbers: checked }))
            }
          />
        </div>
      </SectionCard>

      <SectionCard
        icon={<BookOpen className="h-3.5 w-3.5" />}
        title="Demo"
        headerClassName="pt-4"
        contentClassName="pt-4"
      >
        <div className="flex items-center justify-between py-4">
          <div className="space-y-0.5">
            <Label className="text-sm">Enable Demo</Label>
            <p className="text-xs text-muted-foreground">
              Turn on demo mode for this game stage.
            </p>
          </div>
          <Switch
            checked={values.enableDemo}
            onCheckedChange={(checked) =>
              updateValues((source) => ({ ...source, enableDemo: checked }))
            }
            aria-label="Toggle sliding puzzle demo mode"
          />
        </div>
      </SectionCard>

      <SectionCard icon={<Layers className="h-3.5 w-3.5" />} title="Levels">
        <LevelRows
          levels={values?.levels}
          levelNames={levelNames}
          description="Set how many boards should be included for this difficulty level. Use 0 to exclude it."
          onChange={(levelId, updates) =>
            updateValues((source) => ({
              ...source,
              levels: source.levels.map((level) =>
                level.levelId === levelId ? { ...level, ...updates } : level,
              ),
            }))
          }
        />
      </SectionCard>

      <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-5 py-3">
        <span className="text-xs text-muted-foreground">
          {isDirty ? (
            <span className="font-medium text-amber-600">Unsaved changes</span>
          ) : saveState === 'saved' ? (
            <span className="flex items-center gap-1.5 font-medium text-emerald-600">
              <Check className="h-3.5 w-3.5" />
              {config ? 'All changes saved' : 'Configuration created'}
            </span>
          ) : config ? (
            'No changes'
          ) : (
            'Ready to create'
          )}
        </span>
        <Button
          onClick={handleSave}
          disabled={
            saveState === 'saving' || !isValid || (!isDirty && !!config)
          }
          size="sm"
          className="min-w-[130px]"
        >
          {saveState === 'saving' ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {config ? 'Save Changes' : 'Create Config'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
