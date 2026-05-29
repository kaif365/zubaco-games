interface Props {
  timeRemainingMs: number;
  filledCount: number;
  totalCells: number;
}

export function GameHeader({ timeRemainingMs, filledCount, totalCells }: Props) {
  const sec = Math.ceil(timeRemainingMs / 1000);
  const isLow = sec <= 15;

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex flex-col items-start">
        <span className="text-xs text-gray-400 uppercase">Filled</span>
        <span className="text-lg font-bold">{filledCount} / {totalCells}</span>
      </div>
      <div className="flex flex-col items-center">
        <span className={`text-3xl font-mono font-bold ${isLow ? 'text-red-400 animate-pulse' : 'text-white'}`}>
          {sec}s
        </span>
      </div>
      <div className="flex flex-col items-end">
        <span className="text-xs text-gray-400">Watch the grid!</span>
        <span className="text-xs text-green-400">Numbers pulse in groups</span>
      </div>
    </div>
  );
}
