import { useState, useCallback, useEffect } from 'react';
import { useArrowGame } from '@/hooks/useArrowGame';
import { useAudio } from '@/hooks/useAudio';
import { Board } from '@/components/game/Board';
import { GameHeader } from '@/components/game/GameHeaderNew';
import { GameResult } from '@/components/game/GameResult';
import { LevelSelector } from '@/components/game/LevelSelector';
import { Settings } from '@/components/game/Settings';
import { Achievements, checkAndUnlockAchievements, getAchievementById } from '@/components/game/Achievements';
import { StatsScreen, updateStats } from '@/components/game/StatsScreen';
import { DailyChallenge } from '@/components/game/DailyChallenge';
import { Tutorial } from '@/components/game/Tutorial';
import { Confetti } from '@/components/game/Confetti';
import { LEVELS } from '@/lib/game/levels';

type Screen = 'tutorial' | 'menu' | 'levels' | 'settings' | 'achievements' | 'stats' | 'daily' | 'playing' | 'result';

function getUnlockedLevel(): number {
  const stored = localStorage.getItem('arrowgame_unlocked_level');
  return stored ? Math.max(1, parseInt(stored, 10)) : 1;
}

function setUnlockedLevel(level: number) {
  const current = getUnlockedLevel();
  if (level > current) localStorage.setItem('arrowgame_unlocked_level', String(level));
}

function hasSeenTutorial(): boolean {
  return localStorage.getItem('arrowgame_tutorial_done') === 'true';
}

export default function ArrowGamePage() {
  const [screen, setScreen] = useState<Screen>(hasSeenTutorial() ? 'menu' : 'tutorial');
  const [currentLevel, setCurrentLevel] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [achievementPopup, setAchievementPopup] = useState<string | null>(null);

  const { state, removeArrow, wrongMove, undo, resetLevel, nextLevel, gotoLevel, useHint } = useArrowGame(currentLevel);
  const { play } = useAudio();

  // Track game end
  useEffect(() => {
    if (state.status === 'won' && screen === 'playing') {
      play('complete');
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);

      // Update stats
      const levelNum = state.levelIndex + 1;
      updateStats(true, state.score, levelNum, state.maxStreak);
      setUnlockedLevel(levelNum + 1);

      // Check achievements
      const stats = JSON.parse(localStorage.getItem('arrowgame_stats') || '{}');
      const newAch = checkAndUnlockAchievements({
        totalWins: stats.totalWins || 0,
        maxStreak: state.maxStreak,
        highestLevel: levelNum,
        highScore: state.score,
        totalGames: stats.totalGames || 0,
        perfectGames: state.lives === 6 ? 1 : 0,
        fastCompletions: state.timeRemainingMs > state.timeLimitMs / 2 ? 1 : 0,
        noUndoWins: state.undoStack.length === 0 ? 1 : 0,
      });
      if (newAch) {
        const ach = getAchievementById(newAch);
        if (ach) setAchievementPopup(`${ach.icon} ${ach.title}`);
      }

      setTimeout(() => setScreen('result'), 1500);
    } else if (state.status === 'gameover' && screen === 'playing') {
      play('incorrect');
      updateStats(false, 0, state.levelIndex + 1, state.maxStreak);
      setTimeout(() => setScreen('result'), 800);
    }
  }, [state.status]);

  // Dismiss achievement popup
  useEffect(() => {
    if (achievementPopup) {
      const t = setTimeout(() => setAchievementPopup(null), 3000);
      return () => clearTimeout(t);
    }
  }, [achievementPopup]);

  const handleStartLevel = useCallback((index: number) => {
    setCurrentLevel(index);
    gotoLevel(index);
    play('start');
    setScreen('playing');
  }, [gotoLevel, play]);

  const handleRemove = useCallback((id: string) => {
    play('correct');
    removeArrow(id);
  }, [removeArrow, play]);

  const handleWrongMove = useCallback(() => {
    play('incorrect');
    wrongMove();
  }, [wrongMove, play]);

  const handleUndo = useCallback(() => {
    play('tap');
    undo();
  }, [undo, play]);

  const handleHint = useCallback(() => {
    play('tap');
    useHint();
  }, [useHint, play]);

  const handleRestart = useCallback(() => {
    play('tap');
    resetLevel();
  }, [resetLevel, play]);

  const handleNextLevel = useCallback(() => {
    const next = Math.min(currentLevel + 1, LEVELS.length - 1);
    setCurrentLevel(next);
    gotoLevel(next);
    play('start');
    setScreen('playing');
  }, [currentLevel, gotoLevel, play]);

  const handleTutorialDone = useCallback(() => {
    localStorage.setItem('arrowgame_tutorial_done', 'true');
    setScreen('menu');
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center px-4 py-6 overflow-y-auto">
      {showConfetti && <Confetti />}

      {/* Achievement popup */}
      {achievementPopup && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg animate-bounce">
          {achievementPopup}
        </div>
      )}

      {/* TUTORIAL */}
      {screen === 'tutorial' && <Tutorial onComplete={handleTutorialDone} />}

      {/* MAIN MENU */}
      {screen === 'menu' && (
        <div className="flex flex-col items-center gap-5 py-8 w-full max-w-xs">
          <div className="text-5xl mb-2 animate-pulse">➡️</div>
          <h1 className="text-3xl font-black text-white">Arrow Puzzle</h1>
          <p className="text-sm text-gray-400 text-center">
            Remove all arrows by tapping them in the right order!
          </p>

          <div className="flex flex-col gap-3 w-full mt-4">
            <button onClick={() => handleStartLevel(getUnlockedLevel() - 1)}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all text-lg shadow-lg shadow-amber-500/20">
              ▶ Play
            </button>
            <button onClick={() => setScreen('levels')}
              className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-all">
              📋 Levels
            </button>
            <button onClick={() => setScreen('daily')}
              className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-all">
              📅 Daily Challenge
            </button>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setScreen('achievements')}
                className="py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-all text-sm">
                🏆
              </button>
              <button onClick={() => setScreen('stats')}
                className="py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-all text-sm">
                📊
              </button>
              <button onClick={() => setScreen('settings')}
                className="py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-all text-sm">
                ⚙️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEVELS */}
      {screen === 'levels' && (
        <LevelSelector
          unlockedLevel={getUnlockedLevel()}
          onSelect={handleStartLevel}
          onClose={() => setScreen('menu')}
        />
      )}

      {/* SETTINGS */}
      {screen === 'settings' && <Settings onClose={() => setScreen('menu')} />}

      {/* ACHIEVEMENTS */}
      {screen === 'achievements' && <Achievements onClose={() => setScreen('menu')} />}

      {/* STATS */}
      {screen === 'stats' && <StatsScreen onClose={() => setScreen('menu')} />}

      {/* DAILY */}
      {screen === 'daily' && (
        <DailyChallenge onPlay={handleStartLevel} onClose={() => setScreen('menu')} />
      )}

      {/* PLAYING */}
      {screen === 'playing' && state.status === 'playing' && (
        <>
          <GameHeader
            timeRemainingMs={state.timeRemainingMs}
            moveCount={state.moves}
            lives={state.lives}
            comboStreak={state.comboStreak}
            undoCount={state.undoStack.length}
            solved={false}
            onUndo={handleUndo}
            onRestart={handleRestart}
            onHint={handleHint}
            level={state.levelIndex + 1}
          />
          <div className="mt-6">
            <Board
              board={state.board}
              gridSize={LEVELS[state.levelIndex]?.gridSize || 4}
              hintId={state.hintId}
              disabled={false}
              onRemove={(id) => handleRemove(id)}
              onWrongMove={handleWrongMove}
            />
          </div>
          <p className="text-center text-gray-500 text-xs mt-4">
            Tap an arrow to remove it (must have clear path)
          </p>
        </>
      )}

      {/* RESULT */}
      {screen === 'result' && (
        <GameResult
          won={state.status === 'won'}
          score={state.score}
          level={state.levelIndex + 1}
          moves={state.moves}
          timeRemainingMs={state.timeRemainingMs}
          maxStreak={state.maxStreak}
          onNextLevel={handleNextLevel}
          onRetry={() => { resetLevel(); setScreen('playing'); }}
          onMenu={() => setScreen('menu')}
        />
      )}
    </div>
  );
}
