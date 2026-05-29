import { LEVELS } from '@/lib/game/levels';

interface LevelSelectorProps {
  unlockedLevel: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}

export function LevelSelector({ unlockedLevel, onSelect, onClose }: LevelSelectorProps) {
  return (
    <div className="flex flex-col gap-4 px-4 py-6 w-full max-w-sm mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Select Level</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {LEVELS.map((level, idx) => {
          const isUnlocked = idx < unlockedLevel;
          const isCurrent = idx === unlockedLevel - 1;
          return (
            <button
              key={level.id}
              onClick={() => isUnlocked && onSelect(idx)}
              disabled={!isUnlocked}
              className={`
                relative w-full aspect-square rounded-xl flex flex-col items-center justify-center
                text-sm font-bold transition-all
                ${isCurrent
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 scale-105'
                  : isUnlocked
                    ? 'bg-gray-700 text-white hover:bg-gray-600'
                    : 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                }
              `}
            >
              {isUnlocked ? (
                <span>{level.id}</span>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )}
              {isUnlocked && (
                <span className="text-[9px] text-gray-300 mt-0.5 truncate w-full text-center px-0.5">
                  {level.title}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
