import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TUTORIAL_KEY = 'zubaco_colour_sort_tutorial_done';

export function isTutorialDone(): boolean {
  return localStorage.getItem(TUTORIAL_KEY) === 'true';
}

export function markTutorialDone(): void {
  localStorage.setItem(TUTORIAL_KEY, 'true');
}

const STEPS = [
  {
    title: 'Welcome to Colour Sort!',
    description: 'Sort coloured balls into tubes so each tube contains only one colour.',
    icon: '🧪',
  },
  {
    title: 'Tap to Select',
    description: 'Tap a tube to pick up the top ball(s). Same-colour balls on top move together!',
    icon: '👆',
  },
  {
    title: 'Tap to Place',
    description: 'Tap another tube to place the ball. It can only go on the same colour or into an empty tube.',
    icon: '🎯',
  },
  {
    title: 'Beat the Clock',
    description: 'Sort all tubes before time runs out! Fewer moves = higher score.',
    icon: '⏱️',
  },
  {
    title: 'Use Power-ups',
    description: 'Stuck? Use Undo to reverse moves. Restart to try again from scratch.',
    icon: '✨',
  },
  {
    title: 'Earn Achievements',
    description: 'Complete challenges, build combos, and climb levels to unlock badges!',
    icon: '🏆',
  },
];

interface TutorialProps {
  onComplete: () => void;
}

export function Tutorial({ onComplete }: TutorialProps) {
  const [step, setStep] = useState(0);

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      markTutorialDone();
      onComplete();
    }
  };

  const handleSkip = () => {
    markTutorialDone();
    onComplete();
  };

  const current = STEPS[step];

  return (
    <motion.div
      className="flex flex-col items-center gap-6 px-4 py-8 w-full max-w-sm mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Progress dots */}
      <div className="flex gap-2">
        {STEPS.map((_, idx) => (
          <div
            key={idx}
            className={`w-2 h-2 rounded-full transition-all ${
              idx === step ? 'bg-indigo-400 w-6' : idx < step ? 'bg-indigo-600' : 'bg-gray-600'
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          className="flex flex-col items-center gap-4 text-center"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="text-6xl"
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            {current.icon}
          </motion.div>

          <h3 className="text-xl font-bold text-white">{current.title}</h3>
          <p className="text-sm text-gray-300 leading-relaxed max-w-xs">{current.description}</p>
        </motion.div>
      </AnimatePresence>

      <div className="flex gap-3 w-full mt-4">
        <button
          onClick={handleSkip}
          className="flex-1 py-3 rounded-xl bg-gray-700/60 text-sm text-gray-300 hover:bg-gray-600/60 transition-colors"
        >
          Skip
        </button>
        <motion.button
          onClick={handleNext}
          className="flex-1 py-3 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
          whileTap={{ scale: 0.97 }}
        >
          {step < STEPS.length - 1 ? 'Next' : 'Start'}
        </motion.button>
      </div>
    </motion.div>
  );
}
