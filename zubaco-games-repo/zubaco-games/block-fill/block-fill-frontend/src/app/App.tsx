import { FlowPuzzleGameShell } from '@/features/flow-puzzle/components/FlowPuzzleGameShell';
import { TiltToPortraitOverlay } from '@/components/TiltToPortraitOverlay';
import { GAME_ROUTE, GENERATOR_ROUTE, HOME_ROUTE, SETTINGS_ROUTE, STATS_ROUTE } from '@/app/routes';
import { useAppRoute } from '@/app/useAppRoute';
import { useCompactLandscape } from '@/hooks/useCompactLandscape';
import { GeneratorScreen } from '@/features/flow-puzzle/components/GeneratorScreen';
import { SettingsScreen } from '@/features/flow-puzzle/components/SettingsScreen';
import { StatsScreen } from '@/features/flow-puzzle/components/StatsScreen';
import {
  DEFAULT_FLOW_PACK_ID,
  FLOW_DIFFICULTY_CONFIG,
  type FlowDifficultyKey,
} from '@/features/flow-puzzle/config/gameConfig';
import { flowLevelPacks } from '@/features/flow-puzzle/data/mockLevels';
import { generateDifficultyLevel } from '@/features/flow-puzzle/utils/levelGenerator';
import { useEffect, useState } from 'react';
import { applyDocumentStageTheme } from '@/utils/applyDocumentStageTheme';
import { resolveUserStageNumber } from '@/utils/resolveUserStageNumber';
import { setUnauthorizedHandler } from '@/app/api/apiClient'; // TODO(temp): 401 dev-session refresh
import { clearAuthSession } from '@/app/authSession'; // TODO(temp): 401 dev-session refresh

export function App() {
  const { route, navigate } = useAppRoute();

  // TODO(temp): 401 dev-session refresh — remove when real auth is in place
  useEffect(() => { setUnauthorizedHandler(() => { clearAuthSession(); window.location.replace('/'); }); }, []);
  // end TODO(temp)

  useEffect(() => {
    applyDocumentStageTheme(resolveUserStageNumber());
  }, []);
  const isCompactLandscape = useCompactLandscape();
  const [selectedPackId, setSelectedPackId] = useState<string>(DEFAULT_FLOW_PACK_ID);
  const [selectedGeneratorDifficulty, setSelectedGeneratorDifficulty] =
    useState<FlowDifficultyKey>('easy');
  const [generatedJson, setGeneratedJson] = useState('');
  const [generatorRows, setGeneratorRows] = useState<number>(5);
  const [generatorCols, setGeneratorCols] = useState<number>(5);

  const resolveDifficulty = (packId: string) =>
    (
      Object.entries(FLOW_DIFFICULTY_CONFIG) as [
        FlowDifficultyKey,
        (typeof FLOW_DIFFICULTY_CONFIG)[FlowDifficultyKey],
      ][]
    ).find(([, config]) => config.packId === packId)?.[0];

  const handleSelectPack = (packId: string) => {
    setSelectedPackId(packId);
    const pack = flowLevelPacks.find((entry) => entry.id === packId);
    const mappedDifficulty = resolveDifficulty(packId);
    if (mappedDifficulty) {
      setSelectedGeneratorDifficulty(mappedDifficulty);
    }
    const latestLevel = pack?.levels[pack.levels.length - 1];
    if (!latestLevel) return;
    setGeneratorRows(latestLevel.rows ?? latestLevel.gridSize ?? 5);
    setGeneratorCols(latestLevel.cols ?? latestLevel.gridSize ?? 5);
  };

  const handleGenerate = () => {
    const pack = flowLevelPacks.find((entry) => entry.id === selectedPackId);
    if (!pack) return;
    const level = generateDifficultyLevel(selectedGeneratorDifficulty, pack.levels.length + 1, {
      rows: generatorRows,
      cols: generatorCols,
    });
    setGeneratedJson(JSON.stringify(level, null, 2));
  };

  const handleCopyGeneratedJson = async () => {
    if (!generatedJson || typeof navigator === 'undefined' || !navigator.clipboard) return;
    await navigator.clipboard.writeText(generatedJson);
  };

  const handleDownloadGeneratedJson = () => {
    if (!generatedJson || typeof window === 'undefined' || typeof document === 'undefined') return;
    const pack = flowLevelPacks.find((entry) => entry.id === selectedPackId);
    const filename = `level-${String((pack?.levels.length ?? 0) + 1).padStart(2, '0')}.json`;
    const blob = new Blob([generatedJson], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="h-[100dvh] overflow-hidden font-sans bg-[#1c1b20]">
        <div className="pointer-events-none absolute inset-0 bg-glow h-60 w-full gradient-layer-top" />
        <div className="pointer-events-none absolute inset-0 z-[0] bg-mandala opacity-20" />
        <div
          className={`relative z-[2] mx-auto flex w-full items-center justify-center  ${
            route === GENERATOR_ROUTE ? 'max-w-[96rem]' : ''
          }`}
        >
          {route !== GENERATOR_ROUTE ? (
            // <Button
            //   type="button"
            //   variant="secondary"
            //   className="fixed bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/12 bg-slate-950/85 px-5 text-white shadow-[0_18px_45px_rgba(2,6,23,0.4)] backdrop-blur md:bottom-auto md:left-auto md:right-6 md:top-6 md:translate-x-0"
            //   onClick={() => navigate(GENERATOR_ROUTE)}
            // >
            //   Open Generator
            // </Button>
            <></>
          ) : null}

          {route === GENERATOR_ROUTE ? (
            <GeneratorScreen
              packs={flowLevelPacks}
              selectedPackId={selectedPackId}
              generatedJson={generatedJson}
              generatorRows={generatorRows}
              generatorCols={generatorCols}
              selectedDifficulty={selectedGeneratorDifficulty}
              difficultyOptions={(
                Object.entries(FLOW_DIFFICULTY_CONFIG) as [
                  FlowDifficultyKey,
                  (typeof FLOW_DIFFICULTY_CONFIG)[FlowDifficultyKey],
                ][]
              ).map(([value, config]) => ({
                value,
                label: config.label,
              }))}
              onSelectPack={handleSelectPack}
              onChangeGeneratorRows={setGeneratorRows}
              onChangeGeneratorCols={setGeneratorCols}
              onChangeDifficulty={setSelectedGeneratorDifficulty}
              onGenerate={handleGenerate}
              onCopyGeneratedJson={() => void handleCopyGeneratedJson()}
              onDownloadGeneratedJson={handleDownloadGeneratedJson}
              onPlay={() => navigate(GAME_ROUTE)}
              onBack={() => navigate(HOME_ROUTE)}
            />
          ) : route === SETTINGS_ROUTE ? (
            <div className="mx-auto max-w-2xl px-4 py-8">
              <SettingsScreen onBack={() => navigate(HOME_ROUTE)} />
            </div>
          ) : route === STATS_ROUTE ? (
            <div className="mx-auto max-w-2xl px-4 py-8">
              <StatsScreen onBack={() => navigate(HOME_ROUTE)} />
            </div>
          ) : (
            <div className="relative w-full min-w-0">
              <FlowPuzzleGameShell />
              {isCompactLandscape ? <TiltToPortraitOverlay /> : null}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
