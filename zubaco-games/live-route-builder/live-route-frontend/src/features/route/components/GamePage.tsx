import { useState, useCallback, useRef, useEffect } from 'react';
import { RouteCanvas } from './RouteCanvas';
import { GameHeader } from './GameHeader';
import { Tutorial } from './Tutorial';
import { MenuScreen } from './MenuScreen';
import { LevelSelector, LEVELS, getHighestLevel, setHighestLevel, getLevelStars, setLevelStars, type LevelConfig } from './LevelSelector';
import { Settings } from './Settings';
import { StatsScreen, updateStats } from './StatsScreen';
import { Achievements, AchievementPopup, checkAchievements, type AchievementId } from './Achievements';
import { DailyChallenge, isDailyCompleted, completeDailyChallenge, getDailyLevel } from './DailyChallenge';
import { Confetti } from './Confetti';
import { PauseDialog } from './PauseDialog';
import { useRouteGame } from '../hooks/useRouteGame';
import { useGameSession } from '../hooks/useGameSession';
import type { GameConfig } from '../../../types/game';

// ─── Types ───────────────────────────────────────────────────────────────────

type GamePhase =
  | 'tutorial'
  | 'menu'
  | 'levels'
  | 'settings'
  | 'stats'
  | 'achievements'
  | 'daily'
  | 'playing'
  | 'result';

// ─── Component ───────────────────────────────────────────────────────────────

export function GamePage() {
  // Phase management
  const [phase, setPhase] = useState<GamePhase>(() => {
    return localStorage.getItem('live-route-tutorial-seen') === 'true' ? 'menu' : 'tutorial';
  });

  // Game state
  const [currentLevel, setCurrentLevel] = useState<LevelConfig>(LEVELS[0]);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [unlockedAchievement, setUnlockedAchievement] = useState<AchievementId | null>(null);
  const [isDailyMode, setIsDailyMode] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);

  const { visibleNodes, edges, status, score, timeLeft, startGame: startEngine, connectNode, endGame } = useRouteGame();
  const { startGame: startSession, submitGame } = useGameSession();

  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Track elapsed time
  useEffect(() => {
    if (phase !== 'playing' || status !== 'playing' || isPaused) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = undefined; }
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, status, isPaused]);

  // Watch for game end
  useEffect(() => {
    if (status === 'ended' && phase === 'playing') {
      handleGameEnd();
    }
  }, [status]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleTutorialComplete = useCallback(() => {
    localStorage.setItem('live-route-tutorial-seen', 'true');
    setPhase('menu');
  }, []);

  const startLevel = async (config: LevelConfig, daily: boolean) => {
    setCurrentLevel(config);
    setCombo(0);
    setMaxCombo(0);
    setIsPaused(false);
    setShowConfetti(false);
    setIsDailyMode(daily);
    setTimeElapsed(0);

    const gameConfig: GameConfig = {
      nodeIntervalMs: 2000,
      totalNodes: config.nodeCount,
      timeLimitMs: config.timeLimitMs,
      canvasWidth: 600,
      canvasHeight: 500,
    };

    try {
      const res = await startSession(`live-route-builder-stage-${config.level}`);
      startEngine(res.seed, res.config || gameConfig);
    } catch {
      // Fallback to local if API unavailable
      const seed = Date.now();
      startEngine(seed, gameConfig);
    }
    setPhase('playing');
  };

  const handlePlay = useCallback(() => {
    const highest = getHighestLevel();
    const config = LEVELS[Math.min(highest - 1, LEVELS.length - 1)];
    startLevel(config, false);
  }, []);

  const handleLevelSelect = useCallback((config: LevelConfig) => {
    startLevel(config, false);
  }, []);

  const handleDailyPlay = useCallback(() => {
    const dailyLevel = getDailyLevel();
    const config = LEVELS[Math.min(dailyLevel - 1, LEVELS.length - 1)];
    startLevel(config, true);
  }, []);

  const handleConnect = useCallback((fromId: number, toId: number) => {
    connectNode(fromId, toId);
    setCombo((prev) => {
      const next = prev + 1;
      setMaxCombo((max) => Math.max(max, next));
      return next;
    });
  }, [connectNode]);

  const handleGameEnd = () => {
    setShowConfetti(true);

    // Calculate stars based on path efficiency
    // Score already includes efficiency calculation
    const efficiency = edges.length > 0 ? Math.min(100, score / edges.length) : 0;
    let stars = 1;
    if (efficiency >= 90 || score >= currentLevel.nodeCount * 15) stars = 3;
    else if (efficiency >= 70 || score >= currentLevel.nodeCount * 10) stars = 2;

    // Persist progress
    if (!isDailyMode) {
      setLevelStars(currentLevel.level, stars);
      setHighestLevel(currentLevel.level + 1);
    }

    // Update stats
    const isFast = timeElapsed < (currentLevel.timeLimitMs / 1000) * 0.5;
    const isPerfect = stars === 3;
    const gamesPlayed = getStoredValue('totalGamesPlayed') + 1;
    const wins = getStoredValue('totalWins') + 1;

    const stats = updateStats({
      totalGamesPlayed: gamesPlayed,
      totalWins: wins,
      addEdges: edges.length,
      bestEfficiency: efficiency,
      maxStreak: maxCombo,
      highestLevel: currentLevel.level,
      perfectGames: isPerfect ? (getStoredValue('perfectGames') + 1) : undefined,
      fastCompletions: isFast ? (getStoredValue('fastCompletions') + 1) : undefined,
      addTime: timeElapsed,
      highestScore: score,
    });

    // Check achievements
    const newAchievements = checkAchievements({
      totalWins: stats?.totalWins ?? 1,
      maxStreak: maxCombo,
      perfectGames: stats?.perfectGames ?? 0,
      fastCompletions: stats?.fastCompletions ?? 0,
      totalGamesPlayed: stats?.totalGamesPlayed ?? 1,
      highestLevel: currentLevel.level,
      highestScore: score,
    });

    if (newAchievements.length > 0) {
      setUnlockedAchievement(newAchievements[0]);
    }

    if (isDailyMode) {
      completeDailyChallenge();
    }

    // Submit to backend
    submitGame(edges, score).catch(() => { /* offline — outbox handles */ });

    setTimeout(() => { setShowConfetti(false); setPhase('result'); }, 3000);
  };

  const handleRestart = useCallback(() => {
    startLevel(currentLevel, isDailyMode);
  }, [currentLevel, isDailyMode]);

  const handleNextLevel = useCallback(() => {
    const nextIdx = Math.min(currentLevel.level, LEVELS.length - 1);
    startLevel(LEVELS[nextIdx], false);
  }, [currentLevel]);

  const handleExitToMenu = useCallback(() => {
    endGame();
    setPhase('menu');
  }, [endGame]);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <AchievementPopup achievementId={unlockedAchievement} onDismiss={() => setUnlockedAchievement(null)} />
      <Confetti active={showConfetti} />

      {phase === 'tutorial' && <Tutorial onComplete={handleTutorialComplete} />}
      {phase === 'menu' && (
        <MenuScreen
          onPlay={handlePlay}
          onLevels={() => setPhase('levels')}
          onDaily={() => setPhase('daily')}
          onAchievements={() => setPhase('achievements')}
          onStats={() => setPhase('stats')}
          onSettings={() => setPhase('settings')}
        />
      )}
      {phase === 'levels' && <LevelSelector onSelect={handleLevelSelect} onBack={() => setPhase('menu')} />}
      {phase === 'settings' && <Settings onBack={() => setPhase('menu')} />}
      {phase === 'stats' && <StatsScreen onBack={() => setPhase('menu')} />}
      {phase === 'achievements' && <Achievements onBack={() => setPhase('menu')} />}
      {phase === 'daily' && <DailyChallenge onPlay={handleDailyPlay} onBack={() => setPhase('menu')} />}

      {phase === 'playing' && (
        <div className="max-w-2xl mx-auto p-4 pt-16 relative">
          <GameHeader
            score={score}
            timeLeft={timeLeft}
            nodesVisible={visibleNodes.length}
            totalNodes={currentLevel.nodeCount}
            level={isDailyMode ? undefined : currentLevel.level}
            combo={combo}
            onPause={() => setIsPaused(true)}
            onMute={() => {/* handled by settings */}}
          />
          <div className="relative aspect-[6/5]">
            <RouteCanvas visibleNodes={visibleNodes} edges={edges} onConnect={handleConnect} disabled={status === 'ended' || isPaused} />
          </div>
          {status === 'playing' && (
            <button onClick={() => { endGame(); }} className="mt-4 w-full py-3 bg-green-600 hover:bg-green-500 rounded-lg font-bold text-white transition-colors">
              Submit Early
            </button>
          )}
          <PauseDialog
            isOpen={isPaused}
            onResume={() => setIsPaused(false)}
            onRestart={handleRestart}
            onExit={handleExitToMenu}
            edges={edges.length}
            timeElapsed={timeElapsed}
            level={currentLevel.level}
          />
        </div>
      )}

      {phase === 'result' && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-slate-950 p-6">
          <div className="text-center">
            <div className="mb-4 text-5xl">🎉</div>
            <h2 className="text-2xl font-bold text-white mb-2">{isDailyMode ? 'Daily Complete!' : 'Route Complete!'}</h2>
            {!isDailyMode && <p className="text-slate-400 mb-2">Level {currentLevel.level}</p>}
            <div className="mb-4 flex justify-center gap-1">
              {[1, 2, 3].map((s) => (
                <span key={s} className={`text-2xl ${s <= getLevelStars(currentLevel.level) ? 'text-amber-400' : 'text-slate-600'}`}>★</span>
              ))}
            </div>
            <p className="text-sm text-slate-400 mb-6">
              {edges.length} edges • Score: {score} • {formatTime(timeElapsed)}
            </p>
            <div className="space-y-2 max-w-xs mx-auto">
              {currentLevel.level < LEVELS.length && !isDailyMode && (
                <button onClick={handleNextLevel} className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white">
                  Next Level →
                </button>
              )}
              <button onClick={handleRestart} className="w-full rounded-xl bg-slate-700 px-4 py-3 text-sm font-semibold text-white">
                Replay
              </button>
              <button onClick={handleExitToMenu} className="w-full rounded-xl px-4 py-3 text-sm text-slate-400">
                Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getStoredValue(key: string): number {
  try {
    const raw = localStorage.getItem('live-route-stats');
    if (raw) return JSON.parse(raw)[key] || 0;
  } catch { /* ignore */ }
  return 0;
}
