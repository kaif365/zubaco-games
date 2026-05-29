interface Props {
  timeRemainingMs: number;
  wordTimeRemainingMs: number;
  currentIndex: number;
  total: number;
  solved: number;
}

export function GameHeader({ timeRemainingMs, wordTimeRemainingMs, currentIndex, total, solved }: Props) {
  const totalSec = Math.ceil(timeRemainingMs / 1000);
  const wordSec = Math.ceil(wordTimeRemainingMs / 1000);
  const isLow = totalSec <= 10;

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex flex-col items-start">
        <span className="text-xs text-gray-400 uppercase">Word</span>
        <span className="text-lg font-bold">{Math.min(currentIndex + 1, total)} / {total}</span>
      </div>

      <div className="flex flex-col items-center">
        <span className={`text-3xl font-mono font-bold ${isLow ? 'text-red-400 animate-pulse' : 'text-white'}`}>
          {totalSec}s
        </span>
        <div className="w-16 h-1.5 bg-gray-700 rounded-full mt-1 overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-100"
            style={{ width: `${(wordSec / 6) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col items-end">
        <span className="text-xs text-gray-400">Solved</span>
        <span className="text-lg font-bold text-green-400">{solved}</span>
      </div>
    </div>
  );
}
