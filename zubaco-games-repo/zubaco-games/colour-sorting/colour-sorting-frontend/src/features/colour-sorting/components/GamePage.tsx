import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { StageConfig } from '@/types/game';
import { useGameSession } from '../hooks/useGameSession';
import { useBallSort } from '../hooks/useBallSort';
import { useAudio } from '@/app/hooks/useAudio';
import { TubeComponent } from './TubeComponent';
import { GameHeader } from './GameHeader';
import { Confetti } from './Confetti';
import { LevelSelector } from './LevelSelector';
import { Settings } from './Settings';
import { Achievements, AchievementPopup, checkAchievements } from './Achievements';
import { StatsScreen, updatePlayerStats } from './StatsScreen';
import { DailyChallenge, getDailyConfig, completeDailyChallenge, isDailyCompleted } from './DailyChallenge';
import { Tutorial, isTutorialDone } from './Tutorial';

const DEFAULT_STAGE_ID = '00000000-0000-0000-0000-000000000001';
const LEVEL_KEY = 'zubaco_colour_sort_level';

type Screen = 'tutorial' | 'menu' | 'levels' | 'settings' | 'achievements' | 'stats' | 'daily' | 'playing' | 'result';

function getHighestLevel(): number {
  try {
    return parseInt(localStorage.getItem(LEVEL_KEY) || '1', 10);
  } catch {
    return 1;
  }
}

function setHighestLevel(level: number): void {
  const current = getHighestLevel();
  if (level > current) {
    localStorage.setItem(LEVEL_KEY, String(level));
  }
}

export function GamePage() {
  const { startGame: startSession, submitResult, sessionId, loading, error } = useGameSession();
  const [config, setConfig] = useState<StageConfig | null>(null);
  const [seed, setSeed] = useState<number | null>(null);
  const [serverScore, setServerScore] = useState<number | undefined>(undefined);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [screen, setScreen] = useState<Screen>(() => isTutorialDone() ? 'menu' : 'tutorial');
  const [showConfetti, setShowConfetti] = useState(false);
  const [achievementPopup, setAchievementPopup] = useState<{ title: string; icon: string } | null>(null);
  const [isDaily, setIsDaily] = useState(false);
  const [usedUndo, setUsedUndo] = useState(false);

  const { play } = useAudio();

  const {
    tubes,
    selectedTube,
    moves,
    solved,
    timeRemainingMs,
    score,
    gameActive,
    lastInvalidTube,
    lastCompletedTube,
    flyingBall,
    undoStack,
    comboStreak,
    maxStreak,
    startGame,
    restartGame,
    tapTube,
    finishGame,
    undo,
  } = useBallSort(config, seed);

  const handleStartLevel = useCallback(async (level: number) => {
    setCurrentLevel(level);
    setIsDaily(false);
    setUsedUndo(false);
    const session = await startSession(DEFAULT_STAGE_ID, level);
    if (session) {
      setConfig(session.config);
      setSeed(session.seed);
      setGameStarted(true);
      setScreen('playing');
      play('start');
    }
  }, [startSession, play]);

  const handleStartDaily = useCallback(async () => {
    const daily = getDailyConfig();
    setCurrentLevel(daily.level);
    setIsDaily(true);
    setUsedUndo(false);
    const session = await startSession(DEFAULT_STAGE_ID, daily.level);
    if (session) {
      setConfig(session.config);
      setSeed(session.seed);
      setGameStarted(true);
      setScreen('playing');
      play('start');
    }
  }, [startSession, play]);

  // Start game when config+seed are ready
  useEffect(() => {
    if (gameStarted && config && seed !== null) {
      startGame();
      setGameStarted(false);
    }
  }, [gameStarted, config, seed, startGame]);

  // Sound effects for game events
  useEffect(() => {
    if (flyingBall) play('correct');
  }, [flyingBall, play]);

  useEffect(() => {
    if (lastInvalidTube !== null) play('incorrect');
  }, [lastInvalidTube, play]);

  useEffect(() => {
    if (lastCompletedTube !== null) play('complete');
  }, [lastCompletedTube, play]);

  useEffect(() => {
    if (timeRemainingMs > 0 && timeRemainingMs <= 10000 && gameActive) {
      play('countdown');
    }
  }, [Math.ceil(timeRemainingMs / 1000), gameActive, play]);

  // Tube tap sound
  const handleTapTube = useCallback((idx: number) => {
    play('tap');
    tapTube(idx);
  }, [tapTube, play]);

  // Undo with tracking
  const handleUndo = useCallback(() => {
    setUsedUndo(true);
    undo();
  }, [undo]);

  // Auto-submit when solved
  useEffect(() => {
    if (solved && gameActive) {
      handleFinish();
    }
  }, [solved]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeRemainingMs <= 0 && gameActive && !solved) {
      handleFinish();
    }
  }, [timeRemainingMs]);

  const handleFinish = useCallback(async () => {
    const result = finishGame();
    if (!result || !sessionId) {
      setScreen('result');
      return;
    }

    // Update local stats
    const timeTaken = config ? config.timeLimitMs - (result.score.finalScore > 0 ? timeRemainingMs : 0) : 0;
    const stats = updatePlayerStats({
      score: result.score.finalScore,
      won: solved,
      level: currentLevel,
      moves: moves.length,
      maxStreak: result.maxStreak,
      timeMs: timeTaken,
    });

    // Check achievements
    const newAchievements = checkAchievements({
      totalWins: stats.totalWins,
      maxStreak: result.maxStreak,
      highestScore: stats.highestScore,
      highestLevel: stats.highestLevel,
      totalGames: stats.totalGames,
      usedUndo,
      hadInvalidMove: false,
      timeRemainingPercent: config ? (timeRemainingMs / config.timeLimitMs) * 100 : 0,
    });

    if (newAchievements.length > 0) {
      const ACHIEVEMENT_MAP: Record<string, { title: string; icon: string }> = {
        first_win: { title: 'First Victory', icon: '🏆' },
        streak_5: { title: 'On Fire', icon: '🔥' },
        streak_10: { title: 'Unstoppable', icon: '⚡' },
        perfect: { title: 'Perfectionist', icon: '💎' },
        speed: { title: 'Speed Demon', icon: '⏱️' },
        persistence: { title: 'Dedicated', icon: '🎯' },
        level_5: { title: 'Rising Star', icon: '⭐' },
        level_10: { title: 'Master', icon: '👑' },
        high_score: { title: 'High Scorer', icon: '📈' },
        flawless: { title: 'Flawless', icon: '✨' },
      };
      const first = ACHIEVEMENT_MAP[newAchievements[0]];
      if (first) setAchievementPopup(first);
    }

    // Level progression
    if (solved) {
      setHighestLevel(currentLevel + 1);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);

      if (isDaily) {
        completeDailyChallenge(result.score.finalScore);
      }
    }

    // Submit to server
    const response = await submitResult(sessionId, result.moves, result.score.finalScore, solved);
    if (response) setServerScore(response.finalScore);

    setScreen('result');
  }, [finishGame, submitResult, sessionId, solved, config, timeRemainingMs, currentLevel, moves.length, usedUndo, isDaily]);

  const handlePlayAgain = useCallback(() => {
    setServerScore(undefined);
    setScreen('menu');
  }, []);

  const handleNextLevel = useCallback(() => {
    setServerScore(undefined);
    const next = Math.min(currentLevel + 1, 10);
    handleStartLevel(next);
  }, [currentLevel, handleStartLevel]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 p-4 flex flex-col items-center">
      <div className="w-full max-w-lg mx-auto">
        <Confetti active={showConfetti} />

        {/* Achievement popup */}
        <AnimatePresence>
          {achievementPopup && (
            <AchievementPopup
              title={achievementPopup.title}
              icon={achievementPopup.icon}
              onDone={() => setAchievementPopup(null)}
            />
          )}
        </AnimatePresence>

        {error && (
          <div className="text-red-400 text-sm text-center mb-3 p-2 bg-red-500/10 rounded-lg">{error}</div>
        )}

        {/* TUTORIAL */}
        {screen === 'tutorial' && (
          <Tutorial onComplete={() => setScreen('menu')} />
        )}

        {/* MAIN MENU */}
        {screen === 'menu' && (
          <motion.div
            className="flex flex-col items-center gap-5 py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="text-5xl mb-2"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 3 }}
            >
              🧪
            </motion.div>
            <h1 className="text-3xl font-black text-white">Colour Sort</h1>
            <p className="text-sm text-gray-400 text-center max-w-xs">
              Sort balls by colour before time runs out!
            </p>

            <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
              <motion.button
                onClick={() => setScreen('levels')}
                className="w-full py-3.5 rounded-xl bg-emerald-600 text-base font-semibold text-white shadow-lg 
                  shadow-emerald-600/20 hover:bg-emerald-500 transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                ▶ Play
              </motion.button>

              <motion.button
                onClick={() => setScreen('daily')}
                className={`w-full py-3 rounded-xl text-sm font-medium transition-all
                  ${isDailyCompleted()
                    ? 'bg-gray-700/60 text-gray-400'
                    : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500'
                  }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                📅 Daily Challenge {isDailyCompleted() && '✓'}
              </motion.button>

              <div className="grid grid-cols-3 gap-2 mt-2">
                <button
                  onClick={() => setScreen('achievements')}
                  className="py-2.5 rounded-xl bg-gray-800/80 text-xs text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  🏆 Badges
                </button>
                <button
                  onClick={() => setScreen('stats')}
                  className="py-2.5 rounded-xl bg-gray-800/80 text-xs text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  📊 Stats
                </button>
                <button
                  onClick={() => setScreen('settings')}
                  className="py-2.5 rounded-xl bg-gray-800/80 text-xs text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  ⚙️ Settings
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* LEVEL SELECTOR */}
        {screen === 'levels' && (
          <LevelSelector
            highestUnlocked={getHighestLevel()}
            onSelect={handleStartLevel}
            onBack={() => setScreen('menu')}
          />
        )}

        {/* SETTINGS */}
        {screen === 'settings' && (
          <Settings onClose={() => setScreen('menu')} />
        )}

        {/* ACHIEVEMENTS */}
        {screen === 'achievements' && (
          <Achievements onClose={() => setScreen('menu')} />
        )}

        {/* STATS */}
        {screen === 'stats' && (
          <StatsScreen onClose={() => setScreen('menu')} />
        )}

        {/* DAILY CHALLENGE */}
        {screen === 'daily' && (
          <DailyChallenge onPlay={handleStartDaily} onClose={() => setScreen('menu')} />
        )}

        {/* PLAYING */}
        {screen === 'playing' && gameActive && (
          <>
            <GameHeader
              timeRemainingMs={timeRemainingMs}
              moveCount={moves.length}
              solved={solved}
              comboStreak={comboStreak}
              undoCount={undoStack.length}
              onUndo={handleUndo}
              onRestart={restartGame}
              level={currentLevel}
            />
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              {tubes.map((tube, idx) => (
                <TubeComponent
                  key={tube.id}
                  tube={tube}
                  index={idx}
                  isSelected={selectedTube === idx}
                  isInvalid={lastInvalidTube === idx}
                  isJustCompleted={lastCompletedTube === idx}
                  onTap={handleTapTube}
                />
              ))}
            </div>
            <p className="text-center text-gray-500 text-xs mt-4">
              Tap source tube, then tap destination tube
            </p>
          </>
        )}

        {/* RESULT SCREEN */}
        {screen === 'result' && score && (
          <motion.div
            className="flex flex-col items-center gap-5 px-4 py-8"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {/* Result icon */}
            <motion.div
              className={`flex h-20 w-20 items-center justify-center rounded-full ${solved ? 'bg-emerald-500/20' : 'bg-orange-500/20'}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              {solved ? (
                <span className="text-4xl">🎉</span>
              ) : (
                <span className="text-4xl">⏰</span>
              )}
            </motion.div>

            <h2 className="text-2xl font-bold text-white">
              {solved ? 'Puzzle Solved!' : 'Time\'s Up!'}
            </h2>

            {/* Score */}
            <motion.div
              className="text-5xl font-black text-emerald-400"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
            >
              {serverScore ?? score.finalScore}
            </motion.div>
            <span className="text-sm text-gray-400 -mt-3">points</span>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-4 text-center w-full max-w-xs">
              <div className="p-3 bg-gray-800/60 rounded-xl">
                <div className="text-lg font-bold text-blue-400">{score.sortedTubes}/{score.totalColorTubes}</div>
                <div className="text-xs text-gray-400">Sorted</div>
              </div>
              <div className="p-3 bg-gray-800/60 rounded-xl">
                <div className="text-lg font-bold text-purple-400">{moves.length}</div>
                <div className="text-xs text-gray-400">Moves</div>
              </div>
              <div className="p-3 bg-gray-800/60 rounded-xl">
                <div className="text-lg font-bold text-orange-400">{maxStreak}</div>
                <div className="text-xs text-gray-400">Best Streak</div>
              </div>
            </div>

            {/* Bonus breakdown */}
            <div className="w-full max-w-xs space-y-1 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Base Score</span>
                <span className="text-white">{score.sortedTubes * 100}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Efficiency Bonus</span>
                <span className="text-green-400">+{score.efficiencyBonus}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Time Bonus</span>
                <span className="text-yellow-400">+{score.timeBonus}</span>
              </div>
              {isDaily && (
                <div className="flex justify-between text-gray-400">
                  <span>Daily Bonus (1.5x)</span>
                  <span className="text-indigo-400">Applied!</span>
                </div>
              )}
            </div>

            {/* Level info */}
            <div className="text-xs text-gray-500">
              Level {currentLevel} · {isDaily ? 'Daily Challenge' : 'Normal Mode'}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 w-full max-w-xs mt-2">
              <button
                onClick={handlePlayAgain}
                className="flex-1 py-3 rounded-xl bg-gray-700 text-sm font-medium text-white hover:bg-gray-600 transition-colors"
              >
                Menu
              </button>
              {solved && currentLevel < 10 && !isDaily && (
                <motion.button
                  onClick={handleNextLevel}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Next Level →
                </motion.button>
              )}
              {!solved && (
                <motion.button
                  onClick={() => handleStartLevel(currentLevel)}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
                  whileTap={{ scale: 0.98 }}
                >
                  Retry
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
