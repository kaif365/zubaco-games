import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TUTORIAL_KEY = 'zubaco_block_fill_tutorial_done';

export function isTutorialDone(): boolean {
  return localStorage.getItem(TUTORIAL_KEY) === 'true';
}

export function markTutorialDone(): void {
  localStorage.setItem(TUTORIAL_KEY, 'true');
}

const STEPS = [
  {
    title: 'Welcome to Block Fill!',
    description: 'Connect coloured dots by drawing paths to fill every cell on the board.',
    icon: '🧩',
  },
  {
    title: 'Draw Paths',
    description: 'Drag from one dot to its matching colour. Your path must connect both dots.',
    icon: '✏️',
  },
  {
    title: 'Fill the Board',
    description: 'Every cell must be covered. No empty spaces allowed — plan your routes!',
    icon: '🎯',
  },
  {
    title: 'Beat the Clock',
    description: 'Solve puzzles before time runs out. Faster completion means a higher score!',
    icon: '⏱️',
  },
  {
    title: 'Level Up',
    description: 'Progress through rounds of increasing difficulty. Master each grid size!',
    icon: '🚀',
  },
  {
    title: "Let's Go!",
    description: 'Start filling blocks and climb the leaderboard. Good luck!',
    icon: '🏆',
  },
];

interface TutorialCarouselProps {
  onComplete: () => void;
}

export function TutorialCarousel({ onComplete }: TutorialCarouselProps) {
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
      className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-4 py-8 w-full max-w-sm mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Progress dots */}
      <div className="flex gap-2">
        {STEPS.map((_, idx) => (
          <div
            key={idx}
            className={`h-2 rounded-full transition-all duration-300 ${
              idx === step ? 'w-6 bg-indigo-400' : idx < step ? 'w-2 bg-indigo-600' : 'w-2 bg-gray-600'
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
            initial={{ scale: 0.5, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
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
          className="flex-1 py-3 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20"
          whileTap={{ scale: 0.97 }}
        >
          {step < STEPS.length - 1 ? 'Next' : "Let's Go!"}
        </motion.button>
      </div>
    </motion.div>
  );
}
