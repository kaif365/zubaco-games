import { useState, useCallback, useRef, useEffect } from 'react';
import type { GameConfig, CellColor } from '../../../types/game';
import { generateSequence, generateCellColors } from '../engine/sequenceGenerator';

type Phase = 'idle' | 'showing' | 'input' | 'ended';

export function usePatternGame() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [perfectRounds, setPerfectRounds] = useState(0);
  const [sequence, setSequence] = useState<number[]>([]);
  const [cellColors, setCellColors] = useState<CellColor[]>([]);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [playerInput, setPlayerInput] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const seedRef = useRef(0);
  const configRef = useRef<GameConfig | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const startTimeRef = useRef(0);
  const isPausedRef = useRef(false);
  const pausedAtRef = useRef(0);

  const showSequence = useCallback((seq: number[], flashMs: number) => {
    setPhase('showing');
    let i = 0;
    const show = () => {
      if (i < seq.length) {
        setHighlightIdx(seq[i]!);
        setTimeout(() => { setHighlightIdx(-1); setTimeout(show, 200); }, flashMs);
        i++;
      } else {
        setPhase('input');
        setPlayerInput([]);
      }
    };
    setTimeout(show, 500);
  }, []);

  const startGame = useCallback((seed: number, config: GameConfig) => {
    seedRef.current = seed;
    configRef.current = config;
    setRound(0);
    setScore(0);
    setPerfectRounds(0);
    setTimeLeft(config.timeLimitMs);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      if (isPausedRef.current) return;
      const remaining = Math.max(0, config.timeLimitMs - (Date.now() - startTimeRef.current));
      setTimeLeft(remaining);
      if (remaining <= 0) { clearInterval(timerRef.current); setPhase('ended'); }
    }, 100);

    const colors = generateCellColors(seed, 0, config.colors);
    setCellColors(colors);
    const seq = generateSequence(seed, 0, config.colors);
    setSequence(seq);
    showSequence(seq, config.flashDurationMs);
  }, [showSequence]);

  const tapCell = useCallback((cellIdx: number) => {
    if (phase !== 'input' || !configRef.current) return;
    const newInput = [...playerInput, cellIdx];
    setPlayerInput(newInput);

    const currentStep = newInput.length - 1;
    if (newInput[currentStep] !== sequence[currentStep]) {
      // Wrong! Game over
      clearInterval(timerRef.current);
      setPhase('ended');
      return;
    }

    if (newInput.length === sequence.length) {
      // Completed round
      const config = configRef.current;
      const newRound = round + 1;
      setRound(newRound);
      setScore((s) => s + config.pointsPerRound);
      setPerfectRounds((p) => p + 1);

      // Start next round
      const colors = generateCellColors(seedRef.current, newRound, config.colors);
      setCellColors(colors);
      const seq = generateSequence(seedRef.current, newRound, config.colors);
      setSequence(seq);
      showSequence(seq, config.flashDurationMs);
    }
  }, [phase, playerInput, sequence, round, showSequence]);

  useEffect(() => { return () => { clearInterval(timerRef.current); }; }, []);

  // Pause timer on tab switch
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && phase === 'input') {
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

  return { phase, round, score, perfectRounds, cellColors, highlightIdx, playerInput, sequence, timeLeft, startGame, tapCell };
}
