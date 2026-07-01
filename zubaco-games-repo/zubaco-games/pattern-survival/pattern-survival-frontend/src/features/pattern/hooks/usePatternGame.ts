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
  // Per-round input timestamps (ms). Each completed round contributes one array
  // of tap times, sent to the backend as `roundTimings` for hesitation analysis.
  const roundTimingsRef = useRef<number[][]>([]);
  const currentRoundTapsRef = useRef<number[]>([]);

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
    roundTimingsRef.current = [];
    currentRoundTapsRef.current = [];
    setTimeLeft(config.timeLimitMs);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
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
    const tapTime = Math.round(performance.now());
    const newInput = [...playerInput, cellIdx];
    setPlayerInput(newInput);

    const currentStep = newInput.length - 1;
    if (newInput[currentStep] !== sequence[currentStep]) {
      // Wrong! Game over. Discard this incomplete round's timings.
      currentRoundTapsRef.current = [];
      clearInterval(timerRef.current);
      setPhase('ended');
      return;
    }

    currentRoundTapsRef.current.push(tapTime);

    if (newInput.length === sequence.length) {
      // Completed round
      const config = configRef.current;
      const newRound = round + 1;
      // Commit this round's tap timings (one entry per completed round).
      roundTimingsRef.current.push(currentRoundTapsRef.current);
      currentRoundTapsRef.current = [];
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

  const getRoundTimings = useCallback((): number[][] => roundTimingsRef.current, []);

  return { phase, round, score, perfectRounds, cellColors, highlightIdx, playerInput, sequence, timeLeft, startGame, tapCell, getRoundTimings };
}
