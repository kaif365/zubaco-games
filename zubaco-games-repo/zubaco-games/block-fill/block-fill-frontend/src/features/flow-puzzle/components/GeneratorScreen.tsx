import { Copy, ArrowLeft, Play, Wand2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { FlowDifficultyKey } from '@/features/flow-puzzle/config/gameConfig';
import type { FlowLevelPack } from '@/features/flow-puzzle/types';

interface GeneratorScreenProps {
  packs: FlowLevelPack[];
  selectedPackId: string;
  generatedJson: string;
  generatorRows: number;
  generatorCols: number;
  selectedDifficulty: FlowDifficultyKey;
  difficultyOptions: { value: FlowDifficultyKey; label: string }[];
  onSelectPack: (packId: string) => void;
  onChangeGeneratorRows: (value: number) => void;
  onChangeGeneratorCols: (value: number) => void;
  onChangeDifficulty: (value: FlowDifficultyKey) => void;
  onGenerate: () => void;
  onCopyGeneratedJson: () => void;
  onDownloadGeneratedJson: () => void;
  onPlay: () => void;
  onBack: () => void;
}

export function GeneratorScreen({
  packs,
  selectedPackId,
  generatedJson,
  generatorRows,
  generatorCols,
  selectedDifficulty,
  difficultyOptions,
  onSelectPack,
  onChangeGeneratorRows,
  onChangeGeneratorCols,
  onChangeDifficulty,
  onGenerate,
  onCopyGeneratedJson,
  onDownloadGeneratedJson,
  onPlay,
  onBack,
}: GeneratorScreenProps) {
  const selectedPack = packs.find((pack) => pack.id === selectedPackId) ?? packs[0];

  return (
    <Card className="relative overflow-hidden rounded-[2rem] border-white/12 bg-slate-950/65 shadow-[0_20px_80px_rgba(0,0,0,0.4)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(92,242,255,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(255,75,189,0.16),transparent_28%)]" />
      <CardContent className="relative z-10 px-6 py-8 sm:px-10 sm:py-12">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-100/70">Level Generator</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
              Generate Pack JSON
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
              Create the next guaranteed-solvable level JSON for a difficulty pack, then save it
              into the matching folder so it appears in the game.
            </p>
          </div>
          <Button
            variant="ghost"
            className="rounded-full text-slate-100 hover:bg-white/8"
            onClick={onBack}
          >
            <ArrowLeft size={16} />
            Back To Home
          </Button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {packs.map((pack) => {
            const isSelected = selectedPackId === pack.id;

            return (
              <button
                key={pack.id}
                type="button"
                onClick={() => onSelectPack(pack.id)}
                className={`rounded-[1.65rem] border p-5 text-left transition-all ${
                  isSelected
                    ? 'border-cyan-300/45 bg-cyan-300/10 shadow-[0_0_30px_rgba(92,242,255,0.14)]'
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-cyan-100/70">
                      {pack.name}
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
                      Multiple Grid Sizes
                    </h3>
                  </div>
                  <div className="rounded-full border border-white/12 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
                    {pack.levels.length} levels
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">{pack.themeName}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-8 grid gap-5 xl:grid-cols-[minmax(20rem,24rem)_minmax(0,1fr)] xl:items-start">
          <div className="rounded-[1.65rem] border border-white/10 bg-white/5 p-5 sm:p-6 xl:sticky xl:top-6">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-100/70">Selected Pack</p>
            <h3 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-white">
              {selectedPack?.name}
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">{selectedPack?.themeName}</p>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.2em] text-cyan-100/70">
                Rows
                <input
                  type="number"
                  min={2}
                  value={generatorRows}
                  onChange={(event) => onChangeGeneratorRows(Number(event.target.value))}
                  className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm normal-case tracking-normal text-white"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.2em] text-cyan-100/70">
                Cols
                <input
                  type="number"
                  min={2}
                  value={generatorCols}
                  onChange={(event) => onChangeGeneratorCols(Number(event.target.value))}
                  className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm normal-case tracking-normal text-white"
                />
              </label>
            </div>
            <label className="mt-3 flex flex-col gap-1 text-xs uppercase tracking-[0.2em] text-cyan-100/70">
              Difficulty
              <select
                value={selectedDifficulty}
                onChange={(event) => onChangeDifficulty(event.target.value as FlowDifficultyKey)}
                className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm normal-case tracking-normal text-white"
              >
                {difficultyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-6 grid gap-3">
              <Button
                size="lg"
                className="rounded-full bg-cyan-300 px-8 text-slate-950 shadow-[0_0_24px_rgba(92,242,255,0.45)] hover:bg-cyan-200"
                onClick={onPlay}
              >
                <Play size={18} />
                Play Selected
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="rounded-full bg-white/8 text-white hover:bg-white/12"
                onClick={onGenerate}
              >
                <Wand2 size={18} />
                Generate JSON
              </Button>
            </div>
          </div>

          <div className="rounded-[1.65rem] border border-white/10 bg-white/5 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-100/70">
                  Generated Level
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  Save this into `src/features/flow-puzzle/data/levels/
                  {selectedPack?.name.toLowerCase()}/` to add the level into the game.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  className="rounded-full border-white/15 text-white hover:bg-white/10"
                  onClick={onDownloadGeneratedJson}
                  disabled={!generatedJson}
                >
                  <Download size={16} />
                  Download
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full border-white/15 text-white hover:bg-white/10"
                  onClick={onCopyGeneratedJson}
                  disabled={!generatedJson}
                >
                  <Copy size={16} />
                  Copy
                </Button>
              </div>
            </div>

            <textarea
              className="mt-4 min-h-[20rem] w-full rounded-[1.25rem] border border-white/10 bg-slate-950/85 p-4 font-mono text-xs leading-6 text-slate-200 sm:min-h-[24rem]"
              value={generatedJson}
              readOnly
              placeholder="Choose a difficulty and click Generate JSON."
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
