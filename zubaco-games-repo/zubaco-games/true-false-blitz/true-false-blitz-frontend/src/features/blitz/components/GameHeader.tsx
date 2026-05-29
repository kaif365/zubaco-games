interface Props {
  timeRemainingMs: number;
  currentIndex: number;
  total: number;
  streak: number;
  answeredCount: number;
}

export function GameHeader({ timeRemainingMs, currentIndex, total, streak, answeredCount }: Props) {
  const seconds = Math.ceil(timeRemainingMs / 1000);
  const isLow = seconds <= 10;

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex flex-col items-start">
        <span className="text-xs text-gray-400 uppercase tracking-wider">Question</span>
        <span className="text-lg font-bold">{Math.min(currentIndex + 1, total)} / {total}</span>
      </div>

      <div className="flex flex-col items-center">
        <span className={`text-3xl font-mono font-bold ${isLow ? 'text-red-400 animate-pulse' : 'text-white'}`}>
          {seconds}s
        </span>
      </div>

      <div className="flex flex-col items-end gap-0.5">
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400">Streak</span>
          <span className="text-lg font-bold text-yellow-400">{streak}??</span>
        </div>
        <span className="text-xs text-gray-400">Answered: {answeredCount}</span>
      </div>
    </div>
  );
}
