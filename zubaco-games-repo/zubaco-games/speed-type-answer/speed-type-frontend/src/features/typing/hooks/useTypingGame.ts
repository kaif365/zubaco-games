import { useState, useRef, useCallback } from 'react';
import type { Question, Answer, GameConfig, StartGameResponse, SubmitResponse } from '../../../types/game';
import httpClient from '../../../services/httpClient';
import { selectQuestions } from '../engine/questionBank';
import { computeFinalSeed } from '../engine/random';

type Phase = 'idle' | 'flash' | 'type' | 'result' | 'finished';

export function useTypingGame() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SubmitResponse | null>(null);

  const questionsRef = useRef<Question[]>([]);
  const sessionIdRef = useRef('');
  const flashTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const answerTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const questionStartRef = useRef(0);

  const startGame = useCallback(async () => {
    setLoading(true);
    try {
      const clientSeed = crypto.randomUUID();
      const { data } = await httpClient.post<{ data: StartGameResponse }>('/game/start', { clientSeed });
      const resp = data.data;
      sessionIdRef.current = resp.gameSessionId;
      setConfig(resp.config);

      const finalSeed = computeFinalSeed(resp.serverSeed, clientSeed, 0);
      questionsRef.current = selectQuestions(finalSeed, resp.config.totalQuestions);
      setQuestionIndex(0);
      setAnswers([]);
      setScore(0);
      setResult(null);
      showQuestion(0, resp.config);
    } finally { setLoading(false); }
  }, []);

  const showQuestion = (idx: number, cfg: GameConfig) => {
    const q = questionsRef.current[idx];
    if (!q) { setPhase('finished'); return; }
    setCurrentQuestion(q);
    setPhase('flash');
    flashTimerRef.current = setTimeout(() => {
      setPhase('type');
      questionStartRef.current = Date.now();
      answerTimerRef.current = setTimeout(() => submitAnswer('', idx, cfg), cfg.answerTimeMs);
    }, cfg.flashDurationMs);
  };

  const submitAnswer = (userAnswer: string, idx: number, cfg: GameConfig) => {
    if (answerTimerRef.current) clearTimeout(answerTimerRef.current);
    const q = questionsRef.current[idx]!;
    const responseTimeMs = Date.now() - questionStartRef.current;
    const isCorrect = userAnswer.trim().toLowerCase() === q.answer.toLowerCase();
    let pts = 0;
    if (isCorrect) {
      pts = cfg.pointsPerCorrect;
      const speedRatio = Math.max(0, 1 - responseTimeMs / cfg.answerTimeMs);
      pts += Math.round(speedRatio * cfg.speedBonusMax);
    }
    setScore(prev => prev + pts);
    const ans: Answer = { questionId: q.id, userAnswer: userAnswer.trim(), timestamp: Date.now(), responseTimeMs };
    setAnswers(prev => [...prev, ans]);
    setPhase('result');
    const nextIdx = idx + 1;
    setQuestionIndex(nextIdx);
    setTimeout(() => showQuestion(nextIdx, cfg), 1500);
  };

  const handleTypedAnswer = (userAnswer: string) => {
    if (phase !== 'type' || !config) return;
    submitAnswer(userAnswer, questionIndex, config);
  };

  const finishGame = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await httpClient.post<{ data: SubmitResponse }>('/game/submit', { gameSessionId: sessionIdRef.current, answers, clientScore: score });
      setResult(data.data);
    } finally { setLoading(false); }
  }, [answers, score]);

  return { phase, config, currentQuestion, questionIndex, answers, score, loading, result, startGame, handleTypedAnswer, finishGame };
}
