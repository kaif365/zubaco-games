import { useState, useEffect, useCallback, useRef } from 'react';
import type { StageConfig } from '@/types/game';
import { useGameSession } from '../hooks/useGameSession';
import { useUnscramble } from '../hooks/useUnscramble';
import { useAudio } from '@/hooks/useAudio';
import { LetterTile } from './LetterTile';
import { WordDisplay } from './WordDisplay';
import { GameHeader } from './GameHeader';
import { InstructionScreen } from '@/components/InstructionScreen';
import { ResultScreen } from '@/components/ResultScreen';
import { MenuScreen } from './MenuScreen';
import { LevelSelector } from './LevelSelector';
import { DailyChallenge, markDailyComplete } from './DailyChallenge';
import { Achievements } from './Achievements';
import { StatsScreen, updateStats } from './StatsScreen';
import { Settings } from './Settings';
import { PauseDialog } from './PauseDialog';
import { Confetti } from './Confetti';

type AppPhase = 'menu' | 'levels' | 'daily' | 'achievements' | 'stats' | 'settings' | 'game';

const DEFAULT_CONFIG: StageConfig = {
  totalWords: 15,
  wordTimeMs: 6000,
  timeLimitMs: 90000,
  pointsPerWord: 15,
  timeBonusPerSecond: 1,
};

/* ---------- Inner game component ---------- */
function UnscrambleGame({ onReturnToMenu, isDaily }: { onReturnToMenu: () => void; isDaily?: boolean }) {
  const [config, setConfig] = useState<StageConfig>(DEFAULT_CONFIG);
  const [seed, setSeed] = useState<number | null>(null);
  const [gameSessionId, setGameSessionId] = useState<string | null>(null);
  const { loading, error, startGame: startSession, submitResult } = useGameSession();

  const game = useUnscramble(config, seed);
  const { play } = useAudio();
  const statsSavedRef = useRef(false);

  const handleStart = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const stageId = params.get('stageId') || 'word-unscramble-stage-1';
    const session = await startSession(stageId);
    if (session) {
      setConfig(session.config || DEFAULT_CONFIG);
      setSeed(session.seed);
      setGameSessionId(session.gameSessionId);
    }
  }, [startSession]);

  // Auto-start once seed is available
  useEffect(() => {
    if (seed !== null && game.phase === 'idle') {
      game.startGame();
      play('start');
    }
  }, [seed, game.phase, game.startGame]);

  // Submit when finished
  useEffect(() => {
    if (game.phase === 'finished' && game.score && gameSessionId) {
      submitResult(gameSessionId, game.answers, game.score.finalScore);
      if (isDaily) markDailyComplete(game.score.finalScore);
      play('complete');
    }
  }, [game.phase, game.score, gameSessionId, game.answers, submitResult, isDaily]);

  // Sound on letter select (tap)
  const prevSelectedCount = useRef(game.selectedIndices.length);
  useEffect(() => {
    if (game.selectedIndices.length > prevSelectedCount.current) {
      play('tap');
    }
    prevSelectedCount.current = game.selectedIndices.length;
  }, [game.selectedIndices.length, play]);

  // Sound on word solved (correct) or countdown
  const prevWordIndex = useRef(game.currentWordIndex);
  useEffect(() => {
    if (game.currentWordIndex > prevWordIndex.current) {
      play('correct');
    }
    prevWordIndex.current = game.currentWordIndex;
  }, [game.currentWordIndex, play]);

  // Countdown sound in last 10 seconds
  useEffect(() => {
    if (game.phase !== 'playing') return;
    const secs = Math.ceil(game.timeRemainingMs / 1000);
    if (secs <= 10 && secs > 0) play('countdown');
  }, [game.phase, Math.ceil(game.timeRemainingMs / 1000), play]);

  // Keyboard support
  useEffect(() => {
    if (game.phase !== 'playing' || !game.currentWord) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Backspace') {
        game.deselectLetter();
        return;
      }
      const key = e.key.toUpperCase();
      if (key.length !== 1 || key < 'A' || key > 'Z') return;

      // Find first unselected tile matching this letter
      const scrambled = game.currentWord!.scrambled;
      for (let i = 0; i < scrambled.length; i++) {
        if (scrambled[i] === key && !game.selectedIndices.includes(i)) {
          game.selectLetter(i);
          break;
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [game.phase, game.currentWord, game.selectedIndices, game.selectLetter, game.deselectLetter]);

  // Idle
  if (game.phase === 'idle') {
    return (
      <InstructionScreen onStart={handleStart} loading={loading} />
    );
  }

  // Finished
  if (game.phase === 'finished' && game.score) {
    if (!statsSavedRef.current) {
      statsSavedRef.current = true;
      updateStats({
        score: game.score.finalScore,
        wordsSolved: game.score.wordsSolved,
        wordsAttempted: config.totalWords,
        perfect: game.score.wordsSolved === config.totalWords,
        timeMs: config.timeLimitMs - game.timeRemainingMs,
      });
    }
    const isPerfect = game.score.wordsSolved === config.totalWords;
    return (
      <>
        <Confetti active={isPerfect || game.score.finalScore >= 180} />
        <ResultScreen score={game.score.finalScore} success={true} onReplay={onReturnToMenu} isDaily={isDaily} />
      </>
    );
  }

  // Playing
  const solved = game.answers.filter((a) => a.solved).length;

  return (
    <div className="flex flex-col justify-between min-h-screen py-4">
      <GameHeader
        timeRemainingMs={game.timeRemainingMs}
        wordTimeRemainingMs={game.wordTimeRemainingMs}
        currentIndex={game.currentIndex}
        total={config.totalWords}
        solved={solved}
      />

      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        {game.currentWord && (
          <>
            <WordDisplay
              built={game.currentBuilt}
              targetLength={game.currentWord.word.length}
              onBackspace={game.deselectLetter}
            />

            <div className="flex flex-wrap justify-center gap-3 px-4 max-w-sm">
              {game.currentWord.scrambled.map((letter, idx) => (
                <LetterTile
                  key={`${game.currentIndex}-${idx}`}
                  letter={letter}
                  index={idx}
                  selected={game.selectedIndices.includes(idx)}
                  onSelect={game.selectLetter}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="h-16" />
    </div>
  );
}

/* ---------- Main GamePage with appPhase state machine ---------- */
export function GamePage() {
  const [appPhase, setAppPhase] = useState<AppPhase>('menu');
  const [isDaily, setIsDaily] = useState(false);

  switch (appPhase) {
    case 'menu':
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
    case 'levels':
      return (
        <LevelSelector
          onSelectLevel={() => setAppPhase('game')}
          onBack={() => setAppPhase('menu')}
        />
      );
    case 'daily':
      return (
        <DailyChallenge
          onStart={() => { setIsDaily(true); setAppPhase('game'); }}
          onBack={() => setAppPhase('menu')}
        />
      );
    case 'achievements':
      return <Achievements onBack={() => setAppPhase('menu')} />;
    case 'stats':
      return <StatsScreen onBack={() => setAppPhase('menu')} />;
    case 'settings':
      return <Settings onBack={() => setAppPhase('menu')} />;
    case 'game':
      return <UnscrambleGame onReturnToMenu={() => { setIsDaily(false); setAppPhase('menu'); }} isDaily={isDaily} />;
  }
}
