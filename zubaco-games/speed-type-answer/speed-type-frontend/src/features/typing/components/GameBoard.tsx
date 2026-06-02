import { AnimatePresence } from 'framer-motion';
import { useTypingGame } from '../hooks/useTypingGame';
import { QuestionFlash } from './QuestionFlash';
import { AnswerInput } from './AnswerInput';
import { InstructionScreen } from '../../../components/InstructionScreen';
import { ResultScreen } from '../../../components/ResultScreen';
import { markDailyComplete } from './DailyChallenge';

interface GameBoardProps {
  onReturnToMenu?: () => void;
  isDaily?: boolean;
}

export function GameBoard({ onReturnToMenu, isDaily }: GameBoardProps) {
  const { phase, config, currentQuestion, questionIndex, score, loading, result, startGame, handleTypedAnswer } = useTypingGame();

  if (phase === 'idle') return (
    <InstructionScreen onStart={startGame} loading={loading} />
  );

  if (phase === 'finished') {
    if (isDaily) markDailyComplete();
    return (
      <ResultScreen score={result?.finalScore ?? score} success={true} onReplay={onReturnToMenu ?? startGame} isDaily={isDaily} />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-4">
      <div className="flex justify-between w-full max-w-lg text-gray-400">
        <span>Q {questionIndex + 1}/{config?.totalQuestions}</span><span>Score: {score}</span>
      </div>
      <AnimatePresence mode="wait">
        {phase === 'flash' && currentQuestion && <QuestionFlash key="flash" text={currentQuestion.text} />}
        {phase === 'type' && config && <AnswerInput key="type" onSubmit={handleTypedAnswer} timeLimit={config.answerTimeMs} />}
        {phase === 'result' && <div key="result" className="text-center text-xl text-gray-300">Next question...</div>}
      </AnimatePresence>
    </div>
  );
}
