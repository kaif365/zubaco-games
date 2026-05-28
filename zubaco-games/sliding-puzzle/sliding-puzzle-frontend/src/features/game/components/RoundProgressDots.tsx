import type { RoundScore } from '@/types/sliding-puzzle';

import '../styles/game.css';

interface RoundProgressDotsProps {
  currentRound: number;
  totalRounds: number;
  roundScores: RoundScore[];
}

export default function RoundProgressDots({
  currentRound,
  totalRounds,
  roundScores,
}: Readonly<RoundProgressDotsProps>) {
  const scoreMap = new Map(roundScores.map((r) => [r.roundNumber, r.score]));

  return (
    <div className="puzzle-round-dots" aria-label="Round progress">
      {Array.from({ length: totalRounds }, (_, i) => {
        const roundNum = i + 1;
        const score = scoreMap.get(roundNum);
        const isDone = score !== undefined && score !== null;
        const isCurrent = roundNum === currentRound;

        let modifier = '';
        if (isDone) modifier = 'puzzle-round-dot--done';
        else if (isCurrent) modifier = 'puzzle-round-dot--current';

        return (
          <span key={roundNum} className={`puzzle-round-dot${modifier ? ` ${modifier}` : ''}`} />
        );
      })}
    </div>
  );
}
