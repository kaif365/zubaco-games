import { useState, useEffect, useCallback, useRef } from 'react';
import type { StageConfig } from '@/types/game';
import { useAudio } from '@/hooks/useAudio';
import { useGameSession } from '../hooks/useGameSession';
import { useGrid } from '../hooks/useGrid';
import { GridCell } from './GridCell';
import { NumberPad } from './NumberPad';
import { GameHeader } from './GameHeader';
import { MenuScreen } from './MenuScreen';
import { LevelSelector } from './LevelSelector';
import { Settings } from './Settings';
import { StatsScreen } from './StatsScreen';
import { Achievements } from './Achievements';
import { DailyChallenge, markDailyComplete } from './DailyChallenge';
import { PauseDialog } from './PauseDialog';
import { Confetti } from './Confetti';
import { InstructionScreen } from '@/components/InstructionScreen';
import { ResultScreen } from '@/components/ResultScreen';

type AppPhase = 'menu' | 'levels' | 'daily' | 'achievements' | 'stats' | 'settings' | 'game';

const DEFAULT_CONFIG: StageConfig = {
  gridSize: 6,
  revealDurationMs: 1000,
  hideIntervalMs: 3000,
  timeLimitMs: 120000,
  pointsPerCorrect: 10,
  timeBonusMultiplier: 2,
};

export function GamePage() {
  const [config, setConfig] = useState<StageConfig>(DEFAULT_CONFIG);
  const [seed, setSeed] = useState<number | null>(null);
  const [gameSessionId, setGameSessionId] = useState<string | null>(null);
  const [appPhase, setAppPhase] = useState<AppPhase>('menu');
  const [isDaily, setIsDaily] = useState(false);
  const { loading, error, startGame: startSession, submitResult } = useGameSession();

  const game = useGrid(config, seed);
  const { play } = useAudio();
  const prevAnswerCountRef = useRef(0);

  const handleStart = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const stageId = params.get('stageId') || 'number-grid-stage-1';
    const session = await startSession(stageId);
    if (session) {
      setConfig(session.config || DEFAULT_CONFIG);
      setSeed(session.seed);
      setGameSessionId(session.gameSessionId);
    }
  }, [startSession]);

  useEffect(() => {
    if (seed !== null && game.phase === 'idle') {
      game.startGame();
      play('start');
    }
  }, [seed, game.phase, game.startGame, play]);

  useEffect(() => {
    if (game.phase === 'finished' && game.score && gameSessionId) {
      submitResult(gameSessionId, game.answers, game.score.finalScore);
      play('complete');
      if (isDaily) markDailyComplete();
    }
  }, [game.phase, game.score, gameSessionId, game.answers, submitResult, isDaily, play]);

  // Play 'tap' sound on each cell value change
  useEffect(() => {
    const currentCount = game.playerAnswers.size;
    if (currentCount > prevAnswerCountRef.current) {
      play('tap');
    }
    prevAnswerCountRef.current = currentCount;
  }, [game.playerAnswers.size, play]);

  // Countdown tick for last 10 seconds
  useEffect(() => {
    if (
      game.phase === 'filling' &&
      game.timeRemainingMs <= 10000 &&
      game.timeRemainingMs > 0
    ) {
      const secondsLeft = Math.ceil(game.timeRemainingMs / 1000);
      const nextTick = game.timeRemainingMs - (secondsLeft - 1) * 1000;
      if (nextTick <= 1000) {
        play('countdown');
      }
    }
  }, [game.phase, Math.ceil(game.timeRemainingMs / 1000), play]);

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
  if (appPhase === 'levels') return <LevelSelector onSelect={() => { setAppPhase('game'); handleStart(); }} onBack={() => setAppPhase('menu')} />;
  if (appPhase === 'daily') return <DailyChallenge onPlay={() => { setIsDaily(true); setAppPhase('game'); handleStart(); }} onBack={() => setAppPhase('menu')} />;
  if (appPhase === 'achievements') return <Achievements onBack={() => setAppPhase('menu')} />;
  if (appPhase === 'stats') return <StatsScreen onBack={() => setAppPhase('menu')} />;
  if (appPhase === 'settings') return <Settings onBack={() => setAppPhase('menu')} />;

  // ─── Game Flow ─────────────────────────────────────────────────────────
  if (game.phase === 'idle') {
    return (
      <InstructionScreen onStart={handleStart} loading={loading} />
    );
  }

  if (game.phase === 'finished' && game.score) {
    return <ResultScreen score={game.score.finalScore} success={true} onReplay={() => { setIsDaily(false); setAppPhase('menu'); }} isDaily={isDaily} />;
  }

  const totalCells = config.gridSize * config.gridSize;
  const gridIndices = Array.from({ length: totalCells }, (_, i) => i);

  return (
    <div className="flex flex-col min-h-screen py-2">
      <GameHeader
        timeRemainingMs={game.timeRemainingMs}
        filledCount={game.playerAnswers.size}
        totalCells={totalCells}
      />

      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-3">
        <div className={`grid gap-1.5 w-full max-w-xs`} style={{ gridTemplateColumns: `repeat(${config.gridSize}, 1fr)` }}>
          {gridIndices.map((idx) => {
            const row = Math.floor(idx / config.gridSize);
            const col = idx % config.gridSize;
            const cell = game.grid[idx];
            const isRevealed = game.revealedIndices.has(idx);
            const key = `${row}-${col}`;
            const playerAnswer = game.playerAnswers.get(key);

            return (
              <GridCell
                key={key}
                row={row}
                col={col}
                revealedValue={isRevealed ? cell?.value ?? null : null}
                playerValue={playerAnswer?.value ?? null}
                isSelected={game.selectedCell?.row === row && game.selectedCell?.col === col}
                onSelect={game.selectCell}
              />
            );
          })}
        </div>

        {game.selectedCell && (
          <div className="mt-2 w-full">
            <p className="text-center text-sm text-gray-400 mb-2">
              Cell ({game.selectedCell.row + 1}, {game.selectedCell.col + 1}) � Pick a number:
            </p>
            <NumberPad
              maxValue={totalCells}
              onSubmit={game.submitCellValue}
              disabled={game.phase !== 'filling'}
            />
          </div>
        )}

        <button onClick={game.finishEarly}
          className="mt-3 px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium">
          Submit Early
        </button>
      </div>
    </div>
  );
}
