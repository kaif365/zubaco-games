import { LEVELS } from '@/lib/game/levels';

function getDailySeed(): number {
  const dateStr = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getDailyLevel(): number {
  const day = new Date().getDay();
  return day === 0 ? 6 : Math.min(day + 1, LEVELS.length - 1);
}

function hasDoneToday(): boolean {
  const stored = localStorage.getItem('arrowgame_daily_date');
  return stored === new Date().toISOString().slice(0, 10);
}

function markDailyDone(score: number) {
  const dateStr = new Date().toISOString().slice(0, 10);
  localStorage.setItem('arrowgame_daily_date', dateStr);
  localStorage.setItem('arrowgame_daily_score', String(score));
}

interface DailyChallengeProps {
  onPlay: (levelIndex: number) => void;
  onClose: () => void;
}

export function DailyChallenge({ onPlay, onClose }: DailyChallengeProps) {
  const done = hasDoneToday();
  const dailyLevel = getDailyLevel();
  const level = LEVELS[dailyLevel];
  const todayScore = localStorage.getItem('arrowgame_daily_score');

  return (
    <div className="flex flex-col gap-5 px-4 py-6 w-full max-w-sm mx-auto items-center">
      <div className="flex items-center justify-between w-full">
        <h2 className="text-xl font-bold text-white">Daily Challenge</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="text-4xl">📅</div>

      <div className="text-center">
        <div className="text-sm text-gray-400">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
        <div className="text-lg font-bold text-white mt-1">
          Level {level?.id}: {level?.title}
        </div>
        <div className="text-sm text-amber-400 mt-1">1.5× Score Bonus!</div>
      </div>

      {done ? (
        <div className="flex flex-col items-center gap-2 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
          <div className="text-green-400 font-bold">✓ Completed Today!</div>
          {todayScore && <div className="text-white">Score: {todayScore}</div>}
        </div>
      ) : (
        <button
          onClick={() => onPlay(dailyLevel)}
          className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all"
        >
          Play Daily Challenge
        </button>
      )}

      <div className="text-xs text-gray-500 text-center">
        New challenge every day at midnight
      </div>
    </div>
  );
}

export { getDailyLevel, hasDoneToday, markDailyDone };
