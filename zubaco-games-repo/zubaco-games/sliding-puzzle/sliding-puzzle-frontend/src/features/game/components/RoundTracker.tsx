import type { RoundScore } from '@/types/sliding-puzzle';

interface RoundTrackerProps {
  currentRound: number;
  totalRounds: number;
  roundScores: RoundScore[];
}

export default function RoundTracker({
  currentRound,
  totalRounds,
  roundScores,
}: Readonly<RoundTrackerProps>) {
  const scoreMap = new Map(roundScores.map((r) => [r.roundNumber, r.score]));

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span
        style={{
          color: '#9f9ca5',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          marginRight: 2,
        }}
      >
        Round
      </span>
      {Array.from({ length: totalRounds }, (_, i) => {
        const roundNum = i + 1;
        const score = scoreMap.get(roundNum);
        const isActive = roundNum === currentRound;
        const isDone = score !== undefined && score !== null;

        return (
          <div
            key={roundNum}
            title={isDone ? `Score: ${String(score)}` : undefined}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              transition: 'all 0.2s ease',
              border: isActive
                ? '1px solid rgba(232,176,32,0.6)'
                : isDone
                  ? '1px solid rgba(110,226,56,0.4)'
                  : '1px solid rgba(255,255,255,0.12)',
              background: isActive
                ? 'rgba(232,176,32,0.15)'
                : isDone
                  ? 'rgba(110,226,56,0.1)'
                  : 'rgba(255,255,255,0.04)',
              color: isActive ? '#e8b020' : isDone ? '#6ee238' : 'rgba(159,156,165,0.7)',
              boxShadow: isActive ? '0 0 12px rgba(232,176,32,0.2)' : 'none',
            }}
          >
            {roundNum}
          </div>
        );
      })}
    </div>
  );
}
