"use client";

import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Check,
  Loader2,
  Save,
  Timer,
  Layers,
  Trophy,
  BookOpen,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  WRONG_MOVE_HANDLING,
  WRONG_MOVE_HANDLING_SELECT_OPTIONS,
} from "@/constants/wrong-move-handling";
import type { SequenceGameConfig as SequenceConfig } from "@/types/game-config";
import { useSaveGameConfig } from "../../hooks/useStageGameConfig";
import { useToast } from "@/providers/ToastProvider";

interface SequenceGameConfigProps {
  gameId?: string;
  config: SequenceConfig;
  gameName: string;
  stageId: string;
  configDataUpdatedAt: number;
}

type SaveState = "idle" | "saving" | "saved";

const LIMITS = {
  timeLimit: { min: 30, max: 180, step: 15 },
  flashDelay: { min: 100, max: 1000, step: 50 },
  levelDelay: { min: 0, max: 5, step: 1 },
  sequence: { min: 1, max: 30 },
  scorePerClick: { min: 1, max: 500 },
  bonusTimeRatio: { min: 1, max: 10 },
} as const;

function formatSeconds(s: number): string {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem === 0 ? `${m} min` : `${m}m ${rem}s`;
}

function formatDelaySeconds(s: number): string {
  return Number.isInteger(s) ? `${s}s` : `${s.toFixed(1)}s`;
}

// ─── Slider ──────────────────────────────────────────────────────────────────

function Slider({
  value,
  min,
  max,
  step,
  onChange,
  formatLabel,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  formatLabel: (v: number) => string;
}) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {formatLabel(min)}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatLabel(max)}
        </span>
      </div>
      <div className="relative h-5 flex items-center">
        <div className="absolute w-full h-1.5 rounded-full bg-muted" />
        <div
          className="absolute h-1.5 rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute w-full opacity-0 cursor-pointer h-5 z-10"
        />
        <div
          className="absolute h-4 w-4 rounded-full bg-primary border-2 border-background shadow-md pointer-events-none transition-all"
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>
    </div>
  );
}

// ─── Stepper ─────────────────────────────────────────────────────────────────

function Stepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="flex h-8 w-8 items-center justify-center rounded-l-md border border-r-0 border-input bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-base leading-none"
      >
        −
      </button>
      <div className="flex h-8 w-10 items-center justify-center border-y border-input bg-background text-sm font-bold tabular-nums select-none min-h-[40px]">
        {value}
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="flex h-8 w-8 items-center justify-center rounded-r-md border border-l-0 border-input bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-base leading-none"
      >
        +
      </button>
    </div>
  );
}

// ─── Slider row ──────────────────────────────────────────────────────────────

function SliderRow({
  label,
  description,
  value,
  min,
  max,
  step,
  onChange,
  formatLabel,
}: {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  formatLabel: (v: number) => string;
}) {
  return (
    <div className="py-4 border-b border-border last:border-0 space-y-2.5">
      <div>
        <div className="flex gap-2 mb-1">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <span className="rounded-full bg-primary/15 px-3 py-0.5 text-xs font-medium text-primary tabular-nums">{formatLabel(value)}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
        formatLabel={formatLabel}
      />
    </div>
  );
}

// ─── Sequence range (min + max side by side with shared visual bar) ───────────

function SequenceRangeRow({
  label,
  description,
  minValue,
  maxValue,
  absMin,
  absMax,
  onMinChange,
  onMaxChange,
}: {
  label: string;
  description: string;
  minValue: number;
  maxValue: number;
  absMin: number;
  absMax: number;
  onMinChange: (v: number) => void;
  onMaxChange: (v: number) => void;
}) {
  const range = absMax - absMin;
  const minPct = ((minValue - absMin) / range) * 100;
  const maxPct = ((maxValue - absMin) / range) * 100;
  const trackRef = useRef<HTMLDivElement>(null);

  const onThumbPointerDown =
    (thumb: "min" | "max") => (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const target = e.currentTarget;

      const update = (clientX: number) => {
        const rect = trackRef.current?.getBoundingClientRect();
        if (!rect || rect.width <= 0) return;

        const ratio = (clientX - rect.left) / rect.width;
        const clampedRatio = Math.max(0, Math.min(1, ratio));
        const next = Math.round(absMin + clampedRatio * (absMax - absMin));
        if (thumb === "min") {
          onMinChange(Math.min(next, maxValue));
        } else {
          onMaxChange(Math.max(next, minValue));
        }
      };

      update(e.clientX);
      target.setPointerCapture(e.pointerId);

      const onMove = (ev: PointerEvent) => update(ev.clientX);
      const cleanup = () => {
        target.removeEventListener("pointermove", onMove);
        target.removeEventListener("pointerup", cleanup);
        target.removeEventListener("lostpointercapture", cleanup);
      };

      target.addEventListener("pointermove", onMove);
      target.addEventListener("pointerup", cleanup);
      target.addEventListener("lostpointercapture", cleanup);
    };

  return (
    <div className="py-4 border-b border-border last:border-0 space-y-3">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Min
          </p>
          <Stepper
            value={minValue}
            min={absMin}
            max={maxValue}
            onChange={onMinChange}
          />
          <p className="text-[10px] text-muted-foreground">
            Allowed: {absMin} – {maxValue}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Max
          </p>
          <Stepper
            value={maxValue}
            min={minValue}
            max={absMax}
            onChange={onMaxChange}
          />
          <p className="text-[10px] text-muted-foreground">
            Allowed: {minValue} – {absMax}
          </p>
        </div>
      </div>

      {/* Range bar */}
      <div className="space-y-1">
        <div ref={trackRef} className="relative h-5 flex items-center">
          <div className="absolute w-full h-1.5 bg-muted rounded-full" />
          <div
            className="absolute h-1.5 rounded-full bg-primary"
            style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-foreground border-2 border-background shadow-sm cursor-grab active:cursor-grabbing touch-none"
            style={{ left: `calc(${minPct}% - 6px)` }}
            onPointerDown={onThumbPointerDown("min")}
            role="slider"
            aria-label={`${label} minimum`}
            aria-valuemin={absMin}
            aria-valuemax={maxValue}
            aria-valuenow={minValue}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-foreground border-2 border-background shadow-sm cursor-grab active:cursor-grabbing touch-none"
            style={{ left: `calc(${maxPct}% - 6px)` }}
            onPointerDown={onThumbPointerDown("max")}
            role="slider"
            aria-label={`${label} maximum`}
            aria-valuemin={minValue}
            aria-valuemax={absMax}
            aria-valuenow={maxValue}
          />
        </div>
        <div className="flex justify-between">
          <span className="text-[10px] text-muted-foreground">{absMin}</span>
          <span className="text-[10px] text-muted-foreground">{absMax}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Stepper row ─────────────────────────────────────────────────────────────

function StepperRow({
  label,
  description,
  value,
  min,
  max,
  onChange,
  suffix,
}: {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-4 border-b border-border last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="shrink-0 flex items-center gap-2">
        <Stepper value={value} min={min} max={max} onChange={onChange} />
        {suffix && (
          <span className="text-xs text-muted-foreground w-5">{suffix}</span>
        )}
      </div>
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-0 px-6 pt-5">
        <CardTitle className="flex items-center gap-2 text-sm">
          <span className="flex items-center justify-center h-6 w-6 rounded-md bg-muted text-muted-foreground">
            {icon}
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-2 pt-1">{children}</CardContent>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function mergeConfig(c: SequenceConfig): SequenceConfig {
  return {
    ...c,
    levelDelay: c.levelDelay ?? 1,
    wrongMoveHandling: c.wrongMoveHandling ?? WRONG_MOVE_HANDLING.NEXT_SEQUENCE,
  };
}

function stripMeta(c: SequenceConfig) {
  const { id: _id, createdAt: _createdAt, ...rest } = c;
  return rest;
}

export function SequenceGameConfig({
  gameId,
  config,
  gameName,
}: SequenceGameConfigProps) {
  const [values, setValues] = useState<SequenceConfig>(() =>
    mergeConfig(config),
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const { mutateAsync } = useSaveGameConfig(gameId, gameName);
  const { toast } = useToast();

  const set = <K extends keyof SequenceConfig>(
    key: K,
    val: SequenceConfig[K],
  ) => setValues((prev) => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setSaveState("saving");
    try {
      await mutateAsync(values);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
      toast({ title: "Configuration saved", variant: "success" });
    } catch {
      setSaveState("idle");
      toast({
        title: "Failed to save configuration",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const isNewConfig = !config.id;
  const isDirty =
    JSON.stringify(stripMeta(values)) !==
    JSON.stringify(stripMeta(mergeConfig(config)));

  return (
    <div className="space-y-3">
      <div className="flex flex-col lg:flex-row gap-3 items-start">
        {/* Left column */}
        <div className="w-full space-y-3">
          <div className="space-y-3">
            <SectionCard icon={<Timer className="h-3.5 w-3.5" />} title="Time">
              <SliderRow
                label="Time Limit"
                description="Total time available per session."
                value={values.timeLimit}
                min={LIMITS.timeLimit.min}
                max={LIMITS.timeLimit.max}
                step={LIMITS.timeLimit.step}
                onChange={(v) => set("timeLimit", v)}
                formatLabel={formatSeconds}
              />
              <SliderRow
                label="Flash Delay"
                description="How long each tile stays lit during sequence playback."
                value={values.flashDelay}
                min={LIMITS.flashDelay.min}
                max={LIMITS.flashDelay.max}
                step={LIMITS.flashDelay.step}
                onChange={(v) => set("flashDelay", v)}
                formatLabel={(v) => `${v} ms`}
              />
              <SliderRow
                label="Level Delay"
                description="Pause before the next level starts."
                value={values.levelDelay}
                min={LIMITS.levelDelay.min}
                max={LIMITS.levelDelay.max}
                step={LIMITS.levelDelay.step}
                onChange={(v) => set("levelDelay", v)}
                formatLabel={formatDelaySeconds}
              />
            </SectionCard>

            <SectionCard
              icon={<Trophy className="h-3.5 w-3.5" />}
              title="Scoring"
            >
              <StepperRow
                label="Score per Click"
                description="Points awarded for each correct tap in a sequence."
                value={values.scorePerClick}
                min={LIMITS.scorePerClick.min}
                max={LIMITS.scorePerClick.max}
                onChange={(v) => set("scorePerClick", v)}
                suffix="pts"
              />
              <StepperRow
                label="Bonus Time Ratio"
                description="Multiplier applied to remaining time when awarding bonus score."
                value={values.bonusTimeRatio}
                min={LIMITS.bonusTimeRatio.min}
                max={LIMITS.bonusTimeRatio.max}
                onChange={(v) => set("bonusTimeRatio", v)}
                suffix="×"
              />
              <div className="py-4 text-xs text-muted-foreground space-y-1">
                <p>
                  <span className="font-semibold text-foreground">
                    Time Bonus
                  </span>{" "}
                  = float(Seconds Left * Bonus Time Ratio)
                </p>
                <p>
                  <span className="font-semibold text-foreground">
                    Final Score
                  </span>{" "}
                  = Successful Moves × ScorePerClick + Time Bonus
                </p>
              </div>
            </SectionCard>
          </div>

          <div className="space-y-3">
            <SectionCard
              icon={<Layers className="h-3.5 w-3.5" />}
              title="Sequence"
            >
              <SequenceRangeRow
                label="Sequence Length"
                description="The range of sequence lengths players will encounter during gameplay."
                minValue={values.minSequence}
                maxValue={values.maxSequence}
                absMin={LIMITS.sequence.min}
                absMax={LIMITS.sequence.max}
                onMinChange={(v) => set("minSequence", v)}
                onMaxChange={(v) => set("maxSequence", v)}
              />
              <div className="py-4 border-b border-border last:border-0 space-y-2.5">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Wrong move handling
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    What happens when the player taps the wrong tile.
                  </p>
                </div>
                <Select
                  value={String(
                    values.wrongMoveHandling ?? WRONG_MOVE_HANDLING.NEXT_SEQUENCE,
                  )}
                  onValueChange={(v) => set("wrongMoveHandling", Number(v))}
                >
                  <SelectTrigger
                    className="h-9 w-full rounded-md border-border bg-muted/30 px-3 text-sm text-foreground shadow-none transition-colors hover:bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary/40"
                    aria-label="Wrong move handling"
                  >
                    <SelectValue placeholder="Select behavior" />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-popover shadow-lg">
                    {WRONG_MOVE_HANDLING_SELECT_OPTIONS.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        className="text-sm focus:bg-primary/15 focus:text-foreground"
                        title={opt.description}
                      >
                        {opt.label} — {opt.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </SectionCard>

            <SectionCard icon={<BookOpen className="h-3.5 w-3.5" />} title="Demo">
              <div className="flex items-center justify-between py-4 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Enable Demo Round
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Show a tutorial round before the game begins.
                  </p>
                </div>
                <Switch
                  checked={values.enableDemo}
                  onCheckedChange={(checked) => set("enableDemo", checked)}
                  aria-label="Toggle demo mode"
                />
              </div>
              {values.enableDemo && (
                <SequenceRangeRow
                  label="Demo Sequence Length"
                  description="The range of sequence lengths used during the tutorial round."
                  minValue={values.demoMinSequence}
                  maxValue={values.demoMaxSequence}
                  absMin={LIMITS.sequence.min}
                  absMax={LIMITS.sequence.max}
                  onMinChange={(v) => set("demoMinSequence", v)}
                  onMaxChange={(v) => set("demoMaxSequence", v)}
                />
              )}
            </SectionCard>
          </div>
        </div>
      </div>

      {/* Save bar */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-5 py-3">
        <span className="text-xs text-muted-foreground">
          {isDirty ? (
            <span className="text-amber-600 font-medium">Unsaved changes</span>
          ) : saveState === "saved" ? (
            <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
              <Check className="h-3.5 w-3.5" />
              All changes saved
            </span>
          ) : (
            "No changes"
          )}
        </span>
        <Button
          onClick={handleSave}
          disabled={saveState === "saving" || (!isDirty && !isNewConfig)}
          size="sm"
          className="min-w-[130px]"
        >
          {saveState === "saving" ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
