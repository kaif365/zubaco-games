import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TUTORIAL_KEY = 'zubaco_flash_spot_tutorial_done';

const STEPS = [
  { icon: '👁️', title: 'Watch the Grid', desc: 'A grid of coloured shapes is shown. Pay close attention!' },
  { icon: '✨', title: 'Spot Changes', desc: 'Cells will briefly change colour, shape, size, or opacity.' },
  { icon: '👆', title: 'Tap Fast', desc: 'Tap the cell while it's changing to score points.' },
  { icon: '❌', title: 'Avoid Mistakes', desc: 'Tapping an unchanged cell costs you penalty points.' },
  { icon: '🔥', title: 'Build Combos', desc: 'Consecutive correct taps build a streak multiplier!' },
  { icon: '⏱️', title: 'Beat the Clock', desc: 'Score as many points as possible before time runs out.' },
];

export function isTutorialDone(): boolean {
  return localStorage.getItem(TUTORIAL_KEY) === 'true';
}

function markTutorialDone(): void {
  localStorage.setItem(TUTORIAL_KEY, 'true');
}

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

  const current = STEPS[step]!;

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-game-bg px-6">
      {/* Progress dots */}
      <div className="mb-8 flex gap-2">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-2 w-2 rounded-full transition-colors ${i <= step ? 'bg-game-accent' : 'bg-white/20'}`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col items-center gap-4 text-center"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-game-accent/20 text-4xl">
            {current.icon}
          </div>
          <h2 className="text-xl font-bold text-white">{current.title}</h2>
          <p className="max-w-xs text-sm text-gray-300">{current.desc}</p>
        </motion.div>
      </AnimatePresence>

      <div className="mt-10 flex gap-4">
        <button
          onClick={handleSkip}
          className="rounded-lg px-5 py-2.5 text-sm text-gray-400 hover:text-white"
        >
          Skip
        </button>
        <button
          onClick={handleNext}
          className="rounded-xl bg-game-accent px-8 py-3 text-sm font-semibold text-white shadow-lg"
        >
          {step < STEPS.length - 1 ? 'Next' : "Let's Play!"}
        </button>
      </div>
    </div>
  );
}
