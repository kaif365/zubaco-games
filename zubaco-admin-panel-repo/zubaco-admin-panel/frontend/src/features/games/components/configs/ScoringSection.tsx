"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Trophy } from "lucide-react";

export interface ScoringLevel {
  id: string;
  name: string;
  maxScore: number;
}

export interface ScoringRule {
  label: string;
  value: string;
}

interface ScoringSectionProps {
  maxTimeBonus: number;
  levels: ScoringLevel[];
  onMaxTimeBonusChange: (v: number) => void;
  onLevelMaxScoreChange: (id: string, v: number) => void;
  rules?: ScoringRule[];
}

function parseNonNegativeInt(raw: string): number | null {
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 0) return null;
  return parsed;
}

export function ScoringSection({
  maxTimeBonus,
  levels,
  onMaxTimeBonusChange,
  onLevelMaxScoreChange,
  rules,
}: ScoringSectionProps) {
  return (
    <Card>
      <CardHeader className="px-6 pb-0 pt-5">
        <CardTitle className="flex items-center gap-2 text-sm">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Trophy className="h-3.5 w-3.5" />
          </span>
          Scoring
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-2 pt-1">
        <div className="flex items-center justify-between gap-6 py-4 border-b border-border">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Max Time Bonus</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Maximum bonus points awarded based on remaining time.
            </p>
          </div>
          <div className="shrink-0 w-36">
            <Input
              type="number"
              min={0}
              value={maxTimeBonus}
              onChange={(e) => {
                const v = parseNonNegativeInt(e.currentTarget.value);
                if (v !== null) onMaxTimeBonusChange(v);
              }}
              className="text-right tabular-nums"
            />
          </div>
        </div>

        {levels.map((level) => (
          <div
            key={level.id}
            className="flex items-center justify-between gap-6 py-4 border-b border-border last:border-0"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {level.name} Max Score
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Maximum score achievable on {level.name.toLowerCase()} difficulty.
              </p>
            </div>
            <div className="shrink-0 w-36">
              <Input
                type="number"
                min={0}
                value={level.maxScore}
                onChange={(e) => {
                  const v = parseNonNegativeInt(e.currentTarget.value);
                  if (v !== null) onLevelMaxScoreChange(level.id, v);
                }}
                className="text-right tabular-nums"
              />
            </div>
          </div>
        ))}

        {rules && rules.length > 0 && (
          <div className="mt-2 mb-2 rounded-lg bg-muted/40 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Scoring Reference
            </p>
            <div className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-1">
              {rules.map((rule) => (
                <div key={rule.label} className="contents">
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">{rule.label}</span>
                  <span className="text-[11px] font-medium text-foreground">{rule.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
