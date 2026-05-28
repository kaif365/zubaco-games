interface TutorialProps {
  onComplete: () => void;
}

const STEPS = [
  { title: 'Welcome!', desc: 'Remove all arrows from the board to win.', icon: '🎯' },
  { title: 'Tap to Move', desc: 'Tap an arrow to try removing it. It will slide in the direction it points.', icon: '👆' },
  { title: 'Clear Path', desc: 'An arrow can only move if nothing is blocking its path to the edge.', icon: '✅' },
  { title: 'Order Matters', desc: 'Remove arrows in the right order. Think ahead!', icon: '🧩' },
  { title: 'Lives & Timer', desc: 'You have 6 lives. Wrong moves lose a life. Beat the clock!', icon: '⏱️' },
  { title: 'Power-ups', desc: 'Use Hints to highlight a correct arrow, or Undo to take back a move.', icon: '💡' },
];

export function Tutorial({ onComplete }: TutorialProps) {
  return (
    <div className="flex flex-col gap-4 px-4 py-6 w-full max-w-sm mx-auto">
      <h2 className="text-xl font-bold text-white text-center">How to Play</h2>

      <div className="flex flex-col gap-3">
        {STEPS.map((step, i) => (
          <div key={i} className="flex items-start gap-3 p-3 bg-gray-800/60 rounded-xl">
            <div className="text-2xl flex-shrink-0">{step.icon}</div>
            <div>
              <div className="text-sm font-medium text-white">{step.title}</div>
              <div className="text-xs text-gray-400 mt-0.5">{step.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onComplete}
        className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all mt-2"
      >
        Got it! Let's Play
      </button>
    </div>
  );
}
