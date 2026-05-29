"use client";

interface GameOverProps {
  onRetry: () => void;
}

export function GameOver({ onRetry }: GameOverProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10 rounded-sm">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 flex flex-col items-center gap-4 shadow-xl text-center">
        <div className="text-5xl">💔</div>
        <h3 className="text-slate-800 text-2xl font-bold">Out of Lives!</h3>
        <p className="text-slate-400 text-sm">
          Think before you tap — only clear arrows move.
        </p>
        <button
          onClick={onRetry}
          className="mt-2 px-6 py-2 rounded-full bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
