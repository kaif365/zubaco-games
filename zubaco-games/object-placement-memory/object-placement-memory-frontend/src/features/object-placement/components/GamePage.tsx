import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { DndContext, type DragEndEvent, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import type { ObjectItem, StageConfig } from '@/types/game';
import { useGameSession } from '../hooks/useGameSession';
import { useGamePhase } from '../hooks/useGamePhase';
import { GameHeader } from './GameHeader';
import { MemorizeGrid } from './MemorizeGrid';
import { RecallGrid } from './RecallGrid';
import { ObjectTray } from './ObjectTray';
import { MenuScreen } from './MenuScreen';
import { LevelSelector } from './LevelSelector';
import { Settings } from './Settings';
import { StatsScreen } from './StatsScreen';
import { Achievements } from './Achievements';
import { DailyChallenge, markDailyComplete } from './DailyChallenge';
import { InstructionScreen } from '@/app/components/InstructionScreen';
import { ResultScreen } from '@/app/components/ResultScreen';

type AppPhase = 'menu' | 'levels' | 'daily' | 'achievements' | 'stats' | 'settings' | 'game';

const DEFAULT_STAGE_ID = '00000000-0000-0000-0000-000000000001';

export function GamePage() {
  const { startGame, submitResult, sessionId, loading, error } = useGameSession();
  const [config, setConfig] = useState<StageConfig | null>(null);
  const [seed, setSeed] = useState<number | null>(null);
  const [serverScore, setServerScore] = useState<number | undefined>(undefined);
  const [appPhase, setAppPhase] = useState<AppPhase>('menu');
  const [isDaily, setIsDaily] = useState(false);

  const {
    phase,
    placements,
    trayObjects,
    userPlacements,
    timeRemainingMs,
    score,
    startMemorize,
    placeObject,
    removeObject,
    submitPlacements,
  } = useGamePhase(config, seed);

  // DnD sensors (pointer + touch for mobile)
  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } });
  const sensors = useSensors(pointerSensor, touchSensor);

  // Track which objects are already placed on the grid
  const placedObjectIds = useMemo(() => {
    const ids = new Set<string>();
    for (const obj of userPlacements.values()) {
      ids.add(obj.id);
    }
    return ids;
  }, [userPlacements]);

  // Handle starting the game
  const handleStart = useCallback(async () => {
    const session = await startGame(DEFAULT_STAGE_ID);
    if (session) {
      setConfig(session.config);
      setSeed(session.seed);
      // startMemorize will be triggered via effect when config+seed are set
      setTimeout(() => startMemorize(), 50);
    }
  }, [startGame, startMemorize]);

  // Handle drag end - place object on grid cell
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      const cellId = over.id as string;
      if (!cellId.startsWith('cell-')) return;

      const cellIndex = parseInt(cellId.replace('cell-', ''), 10);
      const object = active.data.current?.object as ObjectItem | undefined;
      if (!object) return;

      placeObject(cellIndex, object);
    },
    [placeObject],
  );

  // Handle submit
  const handleSubmit = useCallback(async () => {
    const result = submitPlacements();
    if (!result || !sessionId) return;

    const response = await submitResult(sessionId, result.attempts, result.score.finalScore);
    if (response) {
      setServerScore(response.finalScore);
    }
    if (isDaily) markDailyComplete();
  }, [submitPlacements, submitResult, sessionId, isDaily]);

  // Auto-submit when time runs out (guarded to fire only once)
  const autoSubmittedRef = useRef(false);
  useEffect(() => {
    if (phase === 'recall' && timeRemainingMs <= 0 && !autoSubmittedRef.current) {
      autoSubmittedRef.current = true;
      handleSubmit();
    }
  }, [phase, timeRemainingMs, handleSubmit]);

  // ─── Menu Screens ──────────────────────────────────────────────────────
  if (appPhase === 'menu') {
    return (
      <MenuScreen
        onPlay={() => setAppPhase('game')}
        onLevels={() => setAppPhase('levels')}
        onDaily={() => setAppPhase('daily')}
        onAchievements={() => setAppPhase('achievements')}
        onStats={() => setAppPhase('stats')}
        onSettings={() => setAppPhase('settings')}
      />
    );
  }
  if (appPhase === 'levels') return <LevelSelector onSelect={() => { setAppPhase('game'); }} onBack={() => setAppPhase('menu')} />;
  if (appPhase === 'daily') return <DailyChallenge onPlay={() => { setIsDaily(true); setAppPhase('game'); }} onBack={() => setAppPhase('menu')} />;
  if (appPhase === 'achievements') return <Achievements onBack={() => setAppPhase('menu')} />;
  if (appPhase === 'stats') return <StatsScreen onBack={() => setAppPhase('menu')} />;
  if (appPhase === 'settings') return <Settings onBack={() => setAppPhase('menu')} />;

  // ─── Game Flow ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 p-4 flex flex-col items-center">
      <div className="w-full max-w-md mx-auto">
        <h1 className="text-center text-xl font-bold text-white mb-4">
          Object Placement Memory
        </h1>

        {error && (
          <div className="text-red-400 text-sm text-center mb-3 p-2 bg-red-500/10 rounded-lg">
            {error}
          </div>
        )}

        {/* Idle / Start screen */}
        {phase === 'idle' && (
          <InstructionScreen onStart={handleStart} loading={loading} />
        )}

        {/* Memorize Phase */}
        {phase === 'memorize' && config && (
          <>
            <GameHeader
              phase={phase}
              timeRemainingMs={config.memorizeTimeMs}
              objectCount={config.objectCount}
              placedCount={0}
            />
            <MemorizeGrid gridSize={config.gridSize} placements={placements} />
            <p className="text-center text-yellow-400 text-sm mt-3 animate-pulse">
              Remember where each object is placed!
            </p>
          </>
        )}

        {/* Recall Phase */}
        {phase === 'recall' && config && (
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <GameHeader
              phase={phase}
              timeRemainingMs={timeRemainingMs}
              objectCount={config.objectCount}
              placedCount={placedObjectIds.size}
            />
            <RecallGrid
              gridSize={config.gridSize}
              userPlacements={userPlacements}
              onRemove={removeObject}
            />
            <ObjectTray objects={trayObjects} placedObjectIds={placedObjectIds} />
            <motion.button
              onClick={handleSubmit}
              className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl
                transition-colors disabled:opacity-50"
              disabled={placedObjectIds.size === 0}
              whileTap={{ scale: 0.97 }}
            >
              Submit ({placedObjectIds.size}/{config.objectCount})
            </motion.button>
          </DndContext>
        )}

        {/* Results */}
        {phase === 'submitted' && score && (
          <ResultScreen score={serverScore ?? score.finalScore} success={true} onReplay={() => { setIsDaily(false); setAppPhase('menu'); }} isDaily={isDaily} />
        )}
      </div>
    </div>
  );
}
