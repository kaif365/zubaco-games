import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import type { TapResult } from '@/types/game';
import { appConfig } from '@app/config/appConfig';
import { useAudio } from '@/audio/useAudio';

import { generateRound } from '../engine/changeGenerator';
import type { GeneratedRound, ScheduledChange } from '../engine/changeGenerator';
import { calculateScore } from '../engine/scorer';
import { useGameSession } from '../hooks/useGameSession';
import { useGameTimer } from '../hooks/useGameTimer';

import { GameGrid } from './GameGrid';
import { GameHeader } from './GameHeader';
import { Tutorial, isTutorialDone } from './Tutorial';
import { MenuScreen } from './MenuScreen';
import { LevelSelector, getHighestLevel, setHighestLevel, setLevelStars } from './LevelSelector';
import { Settings } from './Settings';
import { StatsScreen, updateStats } from './StatsScreen';
import { Achievements, AchievementPopup, checkAchievements } from './Achievements';
import { DailyChallenge, isDailyCompleted, completeDailyChallenge, getDailyLevel } from './DailyChallenge';
import { Confetti } from './Confetti';
import { PauseDialog } from './PauseDialog';

// Level configs matching backend levelConfig.ts
const LEVEL_CONFIGS = [
  { timeLimit: 60000, gridSize: 4, changeCount: 8, changeIntervalMs: 3000, displayDurationMs: 2000, pointsPerCorrectTap: 20, penaltyPerWrongTap: 10, bonusTimeRatio: 10 },
  { timeLimit: 55000, gridSize: 4, changeCount: 10, changeIntervalMs: 2800, displayDurationMs: 1800, pointsPerCorrectTap: 20, penaltyPerWrongTap: 10, bonusTimeRatio: 10 },
  { timeLimit: 50000, gridSize: 5, changeCount: 12, changeIntervalMs: 2600, displayDurationMs: 1600, pointsPerCorrectTap: 20, penaltyPerWrongTap: 10, bonusTimeRatio: 10 },
  { timeLimit: 48000, gridSize: 5, changeCount: 13, changeIntervalMs: 2400, displayDurationMs: 1400, pointsPerCorrectTap: 20, penaltyPerWrongTap: 10, bonusTimeRatio: 10 },
  { timeLimit: 45000, gridSize: 5, changeCount: 15, changeIntervalMs: 2200, displayDurationMs: 1200, pointsPerCorrectTap: 20, penaltyPerWrongTap: 10, bonusTimeRatio: 10 },
  { timeLimit: 42000, gridSize: 6, changeCount: 17, changeIntervalMs: 2000, displayDurationMs: 1100, pointsPerCorrectTap: 20, penaltyPerWrongTap: 10, bonusTimeRatio: 10 },
  { timeLimit: 40000, gridSize: 6, changeCount: 18, changeIntervalMs: 1800, displayDurationMs: 1000, pointsPerCorrectTap: 20, penaltyPerWrongTap: 10, bonusTimeRatio: 10 },
  { timeLimit: 38000, gridSize: 6, changeCount: 20, changeIntervalMs: 1600, displayDurationMs: 900, pointsPerCorrectTap: 20, penaltyPerWrongTap: 10, bonusTimeRatio: 10 },
  { timeLimit: 35000, gridSize: 7, changeCount: 22, changeIntervalMs: 1400, displayDurationMs: 800, pointsPerCorrectTap: 20, penaltyPerWrongTap: 10, bonusTimeRatio: 10 },
  { timeLimit: 30000, gridSize: 7, changeCount: 25, changeIntervalMs: 1200, displayDurationMs: 700, pointsPerCorrectTap: 20, penaltyPerWrongTap: 10, bonusTimeRatio: 10 },
];

function getConfig(level: number) {
  return LEVEL_CONFIGS[Math.max(0, Math.min(9, level - 1))]!;
}

type Screen = 'tutorial' | 'menu' | 'levels' | 'settings' | 'stats' | 'achievements' | 'daily' | 'playing' | 'result';

export function GamePage() {
  const [screen, setScreen] = useState<Screen>(() => isTutorialDone() ? 'menu' : 'tutorial');
  const [currentLevel, setCurrentLevel] = useState(1);
  const [isDaily, setIsDaily] = useState(false);
  const [round, setRound] = useState<GeneratedRound | null>(null);
  const [activeChanges, setActiveChanges] = useState<Set<number>>(new Set());
  const [taps, setTaps] = useState<TapResult[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [feedback, setFeedback] = useState<{ cellId: number; correct: boolean } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [paused, setPaused] = useState(false);
  const [achievementPopup, setAchievementPopup] = useState<{ title: string; icon: string } | null>(null);
  const [muted, setMuted] = useState(() => localStorage.getItem('zubaco_flash_spot_sound') === 'false');

  const { play } = useAudio();
  const { startGame, submitResult } = useGameSession();
  const gameSessionIdRef = useRef<string | null>(null);
  const changesRef = useRef<ScheduledChange[]>([]);
  const roundStartRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);
  const pauseOffsetRef = useRef<number>(0);

  const config = getConfig(currentLevel);

  const handleExpire = useCallback(() => {
    setScreen('result');
    if (!muted) play('gameOver');
  }, [muted, play]);

  const timer = useGameTimer({
    durationMs: config.timeLimit,
    onExpire: handleExpire,
  });

  // Start game for a specific level
  const startLevel = useCallback(async (level: number, daily = false) => {
    setCurrentLevel(level);
    setIsDaily(daily);
    setTaps([]);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setShowConfetti(false);
    setPaused(false);
    pauseOffsetRef.current = 0;

    const cfg = getConfig(level);

    try {
      const response = await startGame(appConfig.socket.stageId);
      gameSessionIdRef.current = response.gameSessionId;

      const generated = generateRound({
        gridSize: response.config?.gridSize ?? cfg.gridSize,
        changeCount: response.config?.changeCount ?? cfg.changeCount,
        changeIntervalMs: response.config?.changeIntervalMs ?? cfg.changeIntervalMs,
        displayDurationMs: response.config?.displayDurationMs ?? cfg.displayDurationMs,
        seed: response.seed,
      });

      setRound(generated);
      changesRef.current = generated.changes;
      setScreen('playing');
      roundStartRef.current = Date.now();
      timer.start();
    } catch {
      // Fallback for local dev
      const generated = generateRound({
        gridSize: cfg.gridSize,
        changeCount: cfg.changeCount,
        changeIntervalMs: cfg.changeIntervalMs,
        displayDurationMs: cfg.displayDurationMs,
        seed: Date.now(),
      });
      setRound(generated);
      changesRef.current = generated.changes;
      setScreen('playing');
      roundStartRef.current = Date.now();
      timer.start();
    }
  }, [startGame, timer]);

  // Animation loop
  useEffect(() => {
    if (screen !== 'playing' || paused) return;

    const tick = () => {
      const elapsed = Date.now() - roundStartRef.current - pauseOffsetRef.current;
      const newActive = new Set<number>();
      for (const change of changesRef.current) {
        if (elapsed >= change.activateAt && elapsed < change.revertAt) {
          newActive.add(change.cellId);
        }
      }
      setActiveChanges(newActive);
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [screen, paused]);

  // Timer warning sound
  useEffect(() => {
    if (screen === 'playing' && timer.timeRemaining <= 10000 && timer.timeRemaining > 9000 && !muted) {
      play('timerWarning');
    }
  }, [screen, timer.timeRemaining, muted, play]);

  // Handle cell tap
  const handleCellTap = useCallback((cellId: number) => {
    if (screen !== 'playing' || paused) return;

    const elapsed = Date.now() - roundStartRef.current - pauseOffsetRef.current;
    const isChanging = changesRef.current.some(
      (c) => c.cellId === cellId && elapsed >= c.activateAt && elapsed < c.revertAt,
    );

    const tap: TapResult = { cellId, isCorrect: isChanging, timestamp: Date.now() };
    setTaps((prev) => [...prev, tap]);
    setFeedback({ cellId, correct: isChanging });

    if (isChanging) {
      setScore((prev) => prev + config.pointsPerCorrectTap);
      setCombo((prev) => {
        const next = prev + 1;
        setMaxCombo((m) => Math.max(m, next));
        if (next === 3 && !muted) play('combo');
        return next;
      });
      if (!muted) play('spotHit');
    } else {
      setScore((prev) => Math.max(0, prev - config.penaltyPerWrongTap));
      setCombo(0);
      if (!muted) play('spotMiss');
    }

    setTimeout(() => setFeedback(null), 400);
  }, [screen, paused, config, muted, play]);

  // Submit on game end
  useEffect(() => {
    if (screen !== 'result') return;

    const result = calculateScore(taps, config, timer.timeRemaining);
    setScore(result.score);

    // Determine stars: ≥90% accuracy = 3★, ≥70% = 2★, otherwise 1★
    const stars = result.accuracy >= 0.9 ? 3 : result.accuracy >= 0.7 ? 2 : 1;
    const won = result.correctTaps > 0;

    if (won) {
      setShowConfetti(true);
      if (!muted) play('levelComplete');
      if (!isDaily) {
        setHighestLevel(currentLevel + 1);
        setLevelStars(currentLevel, stars);
      } else {
        completeDailyChallenge(result.score);
      }
    }

    // Update stats
    updateStats({
      score: result.score,
      level: currentLevel,
      correctTaps: result.correctTaps,
      wrongTaps: result.wrongTaps,
      streak: maxCombo,
      accuracy: result.accuracy,
      won,
    });

    // Check achievements
    const achievement = checkAchievements({
      gamesPlayed: 1, wins: won ? 1 : 0, highScore: result.score,
      bestStreak: maxCombo, bestAccuracy: result.accuracy, highestLevel: currentLevel,
    });
    if (achievement) setAchievementPopup(achievement);

    // Submit to server
    if (gameSessionIdRef.current) {
      submitResult(gameSessionIdRef.current, taps, result.score).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  const handlePause = () => setPaused(true);
  const handleResume = () => setPaused(false);
  const handleRestart = () => startLevel(currentLevel, isDaily);
  const handleExitToMenu = () => { setScreen('menu'); setPaused(false); };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    localStorage.setItem('zubaco_flash_spot_sound', String(!next));
  };

  // --- SCREEN ROUTING ---

  if (screen === 'tutorial') {
    return <Tutorial onComplete={() => setScreen('menu')} />;
  }

  if (screen === 'menu') {
    return (
      <MenuScreen
        onPlay={() => startLevel(getHighestLevel())}
        onLevels={() => setScreen('levels')}
        onDaily={() => setScreen('daily')}
        onAchievements={() => setScreen('achievements')}
        onStats={() => setScreen('stats')}
        onSettings={() => setScreen('settings')}
        dailyCompleted={isDailyCompleted()}
      />
    );
  }

  if (screen === 'levels') {
    return <LevelSelector onSelect={(lv) => startLevel(lv)} onBack={() => setScreen('menu')} />;
  }

  if (screen === 'settings') {
    return <Settings onClose={() => setScreen('menu')} />;
  }

  if (screen === 'stats') {
    return <StatsScreen onClose={() => setScreen('menu')} />;
  }

  if (screen === 'achievements') {
    return <Achievements onClose={() => setScreen('menu')} />;
  }

  if (screen === 'daily') {
    return <DailyChallenge onPlay={(lv) => startLevel(lv, true)} onBack={() => setScreen('menu')} />;
  }

  if (screen === 'result') {
    const result = calculateScore(taps, config, timer.timeRemaining);
    const stars = result.accuracy >= 0.9 ? 3 : result.accuracy >= 0.7 ? 2 : 1;
    const won = result.correctTaps > 0;

    return (
      <div className="flex h-screen flex-col items-center justify-center bg-game-bg px-6">
        <Confetti show={showConfetti} />
        <AchievementPopup achievement={achievementPopup} onDismiss={() => setAchievementPopup(null)} />

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-sm rounded-2xl bg-white/5 p-6 text-center"
        >
          <h2 className={`text-2xl font-bold ${won ? 'text-emerald-400' : 'text-red-400'}`}>
            {won ? 'Level Complete!' : 'Time\'s Up!'}
          </h2>

          <div className="mt-2 text-xs text-yellow-400">
            {'★'.repeat(stars)}{'☆'.repeat(3 - stars)}
          </div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="mt-4 text-4xl font-bold text-white"
          >
            {result.score}
          </motion.div>
          <div className="text-xs text-gray-400">points</div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-white/5 p-2">
              <div className="text-sm font-bold text-emerald-400">{result.correctTaps}</div>
              <div className="text-xs text-gray-500">Correct</div>
            </div>
            <div className="rounded-lg bg-white/5 p-2">
              <div className="text-sm font-bold text-red-400">{result.wrongTaps}</div>
              <div className="text-xs text-gray-500">Wrong</div>
            </div>
            <div className="rounded-lg bg-white/5 p-2">
              <div className="text-sm font-bold text-game-accent">{Math.round(result.accuracy * 100)}%</div>
              <div className="text-xs text-gray-500">Accuracy</div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-lg bg-white/5 p-2">
              <div className="font-bold text-white">{maxCombo}</div>
              <div className="text-gray-500">Best Streak</div>
            </div>
            <div className="rounded-lg bg-white/5 p-2">
              <div className="font-bold text-white">{result.timeBonus}</div>
              <div className="text-gray-500">Time Bonus</div>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setScreen('menu')}
              className="flex-1 rounded-xl bg-white/10 py-3 text-sm font-medium text-gray-200"
            >
              Menu
            </button>
            {currentLevel < 10 && won && (
              <button
                onClick={() => startLevel(currentLevel + 1)}
                className="flex-1 rounded-xl bg-game-accent py-3 text-sm font-semibold text-white"
              >
                Next Level →
              </button>
            )}
            {!won && (
              <button
                onClick={() => startLevel(currentLevel, isDaily)}
                className="flex-1 rounded-xl bg-game-accent py-3 text-sm font-semibold text-white"
              >
                Retry
              </button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // PLAYING state
  return (
    <div className="flex h-screen flex-col bg-game-bg p-4">
      <AchievementPopup achievement={achievementPopup} onDismiss={() => setAchievementPopup(null)} />

      <GameHeader
        score={score}
        timeRemaining={timer.timeRemaining}
        totalTime={config.timeLimit}
        level={isDaily ? undefined : currentLevel}
        combo={combo}
        muted={muted}
        onMuteToggle={toggleMute}
        onPause={handlePause}
      />

      <div className="flex flex-1 items-center justify-center">
        {round && (
          <GameGrid
            grid={round.grid}
            gridSize={config.gridSize}
            activeChanges={activeChanges}
            changes={changesRef.current}
            onCellTap={handleCellTap}
            feedback={feedback}
          />
        )}
      </div>

      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 rounded-full px-6 py-2 font-game text-sm font-bold ${
              feedback.correct
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            {feedback.correct ? '+20' : '-10'}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {paused && (
          <PauseDialog
            onResume={handleResume}
            onRestart={handleRestart}
            onExit={handleExitToMenu}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
