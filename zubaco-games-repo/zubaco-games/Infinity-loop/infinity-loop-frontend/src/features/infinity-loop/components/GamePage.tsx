"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Tutorial } from "./Tutorial";
import { MenuScreen } from "./MenuScreen";
import { LevelSelector, LEVELS, getHighestLevel, setHighestLevel, getLevelStars, setLevelStars, type LevelConfig } from "./LevelSelector";
import { Settings } from "./Settings";
import { StatsScreen, updateStats } from "./StatsScreen";
import { Achievements, AchievementPopup, checkAchievements, type AchievementId } from "./Achievements";
import { DailyChallenge, isDailyCompleted, completeDailyChallenge, getDailyLevel } from "./DailyChallenge";
import { Confetti } from "./Confetti";
import { PauseDialog } from "./PauseDialog";
import { GameHeader } from "./GameHeader";

// ─── Types ───────────────────────────────────────────────────────────────────

type GamePhase =
  | "tutorial"
  | "menu"
  | "levels"
  | "settings"
  | "stats"
  | "achievements"
  | "daily"
  | "playing"
  | "result";

// ─── Component ───────────────────────────────────────────────────────────────

export function GamePage() {
  // Phase management
  const [phase, setPhase] = useState<GamePhase>(() => {
    if (typeof window === "undefined") return "tutorial";
    return localStorage.getItem("infinity-loop-tutorial-seen") === "true" ? "menu" : "tutorial";
  });

  // Game state
  const [currentLevel, setCurrentLevel] = useState<LevelConfig>(LEVELS[0]);
  const [moves, setMoves] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isWon, setIsWon] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [unlockedAchievement, setUnlockedAchievement] = useState<AchievementId | null>(null);
  const [isDailyMode, setIsDailyMode] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer management
  useEffect(() => {
    if (phase !== "playing" || isPaused || isWon) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, isPaused, isWon]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleTutorialComplete = useCallback(() => {
    localStorage.setItem("infinity-loop-tutorial-seen", "true");
    setPhase("menu");
  }, []);

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

  const startLevel = (config: LevelConfig, daily: boolean) => {
    setCurrentLevel(config);
    setMoves(0);
    setCombo(0);
    setMaxCombo(0);
    setScore(0);
    setTimeElapsed(0);
    setIsPaused(false);
    setIsWon(false);
    setShowConfetti(false);
    setIsDailyMode(daily);
    setPhase("playing");
  };

  const handleTileRotate = useCallback((correct: boolean) => {
    setMoves((prev) => prev + 1);
    if (correct) {
      setCombo((prev) => {
        const next = prev + 1;
        setMaxCombo((max) => Math.max(max, next));
        return next;
      });
      // Score: base 10 + combo bonus
      setScore((prev) => prev + 10 + combo * 5);
    } else {
      setCombo(0);
    }
  }, [combo]);

  const handleWin = useCallback(() => {
    setIsWon(true);
    setShowConfetti(true);

    // Calculate stars
    const optimalMoves = currentLevel.width * currentLevel.height; // rough approximation
    let stars = 1;
    if (moves <= optimalMoves + 2) stars = 3;
    else if (moves <= Math.floor(optimalMoves * 1.5)) stars = 2;

    // Persist progress
    setLevelStars(currentLevel.level, stars);
    setHighestLevel(currentLevel.level + 1);

    // Update stats
    const isFast = currentLevel.timeLimitSeconds
      ? timeElapsed < currentLevel.timeLimitSeconds * 0.5
      : false;
    const isPerfect = moves <= optimalMoves + 2;

    const stats = updateStats({
      totalGamesPlayed: (getStoredGamesPlayed() + 1),
      totalWins: (getStoredWins() + 1),
      addMoves: moves,
      bestMoves: moves,
      maxStreak: maxCombo,
      highestLevel: currentLevel.level,
      perfectGames: isPerfect ? (getStoredPerfect() + 1) : undefined,
      fastCompletions: isFast ? (getStoredFast() + 1) : undefined,
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

    // Daily challenge completion
    if (isDailyMode) {
      completeDailyChallenge();
    }

    // Auto-dismiss confetti
    setTimeout(() => setShowConfetti(false), 4000);
  }, [currentLevel, moves, timeElapsed, maxCombo, score, isDailyMode]);

  const handleNextLevel = useCallback(() => {
    const nextIdx = Math.min(currentLevel.level, LEVELS.length - 1);
    startLevel(LEVELS[nextIdx], false);
  }, [currentLevel]);

  const handleRestart = useCallback(() => {
    startLevel(currentLevel, isDailyMode);
  }, [currentLevel, isDailyMode]);

  const handleExitToMenu = useCallback(() => {
    setPhase("menu");
  }, []);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      {/* Achievement Popup (always available) */}
      <AchievementPopup
        achievementId={unlockedAchievement}
        onDismiss={() => setUnlockedAchievement(null)}
      />

      {/* Confetti */}
      <Confetti active={showConfetti} />

      {/* Phase Router */}
      {phase === "tutorial" && (
        <Tutorial onComplete={handleTutorialComplete} />
      )}

      {phase === "menu" && (
        <MenuScreen
          onPlay={handlePlay}
          onLevels={() => setPhase("levels")}
          onDaily={() => setPhase("daily")}
          onAchievements={() => setPhase("achievements")}
          onStats={() => setPhase("stats")}
          onSettings={() => setPhase("settings")}
        />
      )}

      {phase === "levels" && (
        <LevelSelector onSelect={handleLevelSelect} onBack={() => setPhase("menu")} />
      )}

      {phase === "settings" && (
        <Settings onBack={() => setPhase("menu")} />
      )}

      {phase === "stats" && (
        <StatsScreen onBack={() => setPhase("menu")} />
      )}

      {phase === "achievements" && (
        <Achievements onBack={() => setPhase("menu")} />
      )}

      {phase === "daily" && (
        <DailyChallenge onPlay={handleDailyPlay} onBack={() => setPhase("menu")} />
      )}

      {phase === "playing" && (
        <>
          <GameHeader
            level={currentLevel.level}
            moves={moves}
            combo={combo}
            timeElapsed={timeElapsed}
            timeLimit={currentLevel.timeLimitSeconds}
            onPause={() => setIsPaused(true)}
            onMute={() => {/* handled by settings */}}
          />
          <PauseDialog
            isOpen={isPaused}
            onResume={() => setIsPaused(false)}
            onRestart={handleRestart}
            onExit={handleExitToMenu}
            moves={moves}
            timeElapsed={timeElapsed}
            level={currentLevel.level}
          />
          {/* The actual game grid is rendered by the existing GameSection/GameProvider */}
          {/* This orchestrator provides the surrounding UI chrome */}
        </>
      )}

      {phase === "result" && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-slate-950 p-6">
          <div className="text-center">
            <div className="mb-4 text-5xl">🎉</div>
            <h2 className="text-2xl font-bold text-white mb-2">Level Complete!</h2>
            <p className="text-slate-400 mb-2">Level {currentLevel.level}</p>
            <div className="mb-4 flex justify-center gap-1">
              {[1, 2, 3].map((s) => (
                <span key={s} className={`text-2xl ${s <= getLevelStars(currentLevel.level) ? "text-amber-400" : "text-slate-600"}`}>★</span>
              ))}
            </div>
            <p className="text-sm text-slate-400 mb-6">
              {moves} moves • {formatTime(timeElapsed)} • Score: {score}
            </p>
            <div className="space-y-2 max-w-xs mx-auto">
              {currentLevel.level < LEVELS.length && (
                <button
                  onClick={handleNextLevel}
                  className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
                >
                  Next Level →
                </button>
              )}
              <button
                onClick={handleRestart}
                className="w-full rounded-xl bg-slate-700 px-4 py-3 text-sm font-semibold text-white"
              >
                Replay
              </button>
              <button
                onClick={handleExitToMenu}
                className="w-full rounded-xl px-4 py-3 text-sm text-slate-400"
              >
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
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getStoredGamesPlayed(): number {
  try {
    const raw = localStorage.getItem("infinity-loop-stats");
    if (raw) return JSON.parse(raw).totalGamesPlayed || 0;
  } catch { /* ignore */ }
  return 0;
}

function getStoredWins(): number {
  try {
    const raw = localStorage.getItem("infinity-loop-stats");
    if (raw) return JSON.parse(raw).totalWins || 0;
  } catch { /* ignore */ }
  return 0;
}

function getStoredPerfect(): number {
  try {
    const raw = localStorage.getItem("infinity-loop-stats");
    if (raw) return JSON.parse(raw).perfectGames || 0;
  } catch { /* ignore */ }
  return 0;
}

function getStoredFast(): number {
  try {
    const raw = localStorage.getItem("infinity-loop-stats");
    if (raw) return JSON.parse(raw).fastCompletions || 0;
  } catch { /* ignore */ }
  return 0;
}
