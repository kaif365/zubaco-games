interface GameResultProps {
  won: boolean;
  score: number;
  level: number;
  moves: number;
  timeRemainingMs: number;
  maxStreak: number;
  onNextLevel: () => void;
  onRetry: () => void;
  onMenu: () => void;
}

export function GameResult({ won, score, level, moves, timeRemainingMs, maxStreak, onNextLevel, onRetry, onMenu }: GameResultProps) {
  const timeBonus = Math.floor(timeRemainingMs / 1000) * 5;
  const streakBonus = maxStreak * 20;

  return (
    <div className="flex flex-col items-center gap-5 px-4 py-8 w-full max-w-sm mx-auto">
      <div className="text-5xl">{won ? '🎉' : '💔'}</div>

      <h2 className={`text-2xl font-black ${won ? 'text-emerald-400' : 'text-red-400'}`}>
        {won ? 'Level Complete!' : 'Game Over'}
      </h2>

      {/* Score breakdown */}
      <div className="w-full bg-gray-800/60 rounded-xl p-4 flex flex-col gap-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Level</span>
          <span className="text-white font-medium">{level}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Moves</span>
          <span className="text-white font-medium">{moves}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Best Streak</span>
          <span className="text-amber-400 font-medium">{maxStreak}x</span>
        </div>
        {won && (
          <>
            <div className="border-t border-gray-700 my-1" />
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Time Bonus</span>
              <span className="text-green-400 font-medium">+{timeBonus}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Streak Bonus</span>
              <span className="text-orange-400 font-medium">+{streakBonus}</span>
            </div>
            <div className="border-t border-gray-700 my-1" />
            <div className="flex justify-between text-base font-bold">
              <span className="text-white">Total Score</span>
              <span className="text-amber-400">{score}</span>
            </div>
          </>
        )}
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-2 w-full">
        {won ? (
          <button
            onClick={onNextLevel}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all"
          >
            Next Level →
          </button>
        ) : (
          <button
            onClick={onRetry}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all"
          >
            Try Again
          </button>
        )}
        <button
          onClick={onMenu}
          className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-xl transition-all"
        >
          Back to Menu
        </button>
      </div>
    </div>
  );
}
