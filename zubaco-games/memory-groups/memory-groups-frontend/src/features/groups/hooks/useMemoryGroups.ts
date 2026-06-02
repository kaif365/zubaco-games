import { useState, useCallback, useRef, useEffect } from 'react';
import type { GameConfig, WordGroup } from '../../../types/game';
import { selectWordSet, shuffleWords } from '../engine/wordBank';
import { calculateScore } from '../engine/scorer';

type Phase = 'idle' | 'memorize' | 'play' | 'ended';

export function useMemoryGroups() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [shuffledWords, setShuffledWords] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [submittedGroups, setSubmittedGroups] = useState<string[][]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const correctGroupsRef = useRef<WordGroup[]>([]);
  const configRef = useRef<GameConfig | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const startTimeRef = useRef(0);
  const isPausedRef = useRef(false);
  const pausedAtRef = useRef(0);

  const startGame = useCallback((seed: number, config: GameConfig) => {
    configRef.current = config;
    const wordSet = selectWordSet(seed);
    correctGroupsRef.current = wordSet.groups;
    const allWords = wordSet.groups.flatMap((g) => g.words);
    const shuffled = shuffleWords(allWords, seed);
    setShuffledWords(shuffled);
    setSelectedWords([]);
    setSubmittedGroups([]);
    setScore(0);
    setPhase('memorize');
    setTimeLeft(config.timeLimitMs);

    setTimeout(() => {
      setPhase('play');
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        if (isPausedRef.current) return;
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = Math.max(0, config.timeLimitMs - elapsed);
        setTimeLeft(remaining);
        if (remaining <= 0) { clearInterval(timerRef.current); setPhase('ended'); }
      }, 100);
    }, config.showDurationMs);
  }, []);

  const toggleWord = useCallback((word: string) => {
    if (phase !== 'play') return;
    setSelectedWords((prev) => prev.includes(word) ? prev.filter((w) => w !== word) : prev.length < (configRef.current?.groupSize ?? 3) ? [...prev, word] : prev);
  }, [phase]);

  const submitGroup = useCallback(() => {
    if (!configRef.current || selectedWords.length !== configRef.current.groupSize) return;
    const newGroups = [...submittedGroups, [...selectedWords]];
    setSubmittedGroups(newGroups);
    setSelectedWords([]);
    if (newGroups.length >= (configRef.current.totalGroups)) {
      clearInterval(timerRef.current);
      const timeRemaining = Math.max(0, configRef.current.timeLimitMs - (Date.now() - startTimeRef.current));
      const result = calculateScore(newGroups, correctGroupsRef.current, timeRemaining, configRef.current);
      setScore(result.finalScore);
      setPhase('ended');
    }
  }, [selectedWords, submittedGroups]);

  useEffect(() => { return () => { clearInterval(timerRef.current); }; }, []);

  // Pause timer on tab switch
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && phase === 'play') {
        isPausedRef.current = true;
        pausedAtRef.current = Date.now();
      } else if (!document.hidden && isPausedRef.current) {
        isPausedRef.current = false;
        const pauseDuration = Date.now() - pausedAtRef.current;
        startTimeRef.current += pauseDuration;
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [phase]);

  return { phase, shuffledWords, selectedWords, submittedGroups, score, timeLeft, startGame, toggleWord, submitGroup };
}
