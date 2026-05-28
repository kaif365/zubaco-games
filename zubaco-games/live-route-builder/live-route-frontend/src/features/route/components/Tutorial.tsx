import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const STEPS = [
  {
    title: 'Welcome to Live Route Builder',
    description: 'Build the most efficient route by connecting nodes as they appear in real-time.',
    icon: '🛤️',
  },
  {
    title: 'Nodes Appear Over Time',
    description: 'New nodes pop up on the canvas every few seconds. Watch for them!',
    icon: '📍',
  },
  {
    title: 'Click to Connect',
    description: 'Click one node, then click another to draw an edge between them.',
    icon: '🔗',
  },
  {
    title: 'Efficiency Matters',
    description: 'Shorter paths score higher. Connect nearby nodes for maximum efficiency.',
    icon: '📐',
  },
  {
    title: 'Beat the Clock',
    description: 'Connect as many nodes as efficiently as possible before time runs out. Earn up to 3 stars!',
    icon: '⏱️',
  },
];

interface TutorialProps {
  readonly onComplete: () => void;
}

export function Tutorial({ onComplete }: TutorialProps) {
  const [step, setStep] = useState(0);

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const skip = () => onComplete();
  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-2xl border border-slate-700/50 bg-slate-900/90 p-8 text-center shadow-2xl backdrop-blur-md"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
          >
            <div className="mb-4 text-5xl">{current.icon}</div>
            <h2 className="mb-3 text-xl font-bold text-white">{current.title}</h2>
            <p className="mb-6 text-sm text-slate-300 leading-relaxed">{current.description}</p>
          </motion.div>
        </AnimatePresence>

        {/* Progress dots */}
        <div className="mb-6 flex justify-center gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-all ${
                i === step ? 'bg-blue-400 scale-125' : i < step ? 'bg-blue-600' : 'bg-slate-600'
              }`}
            />
          ))}
        </div>

        <div className="flex justify-between">
          <button
            onClick={skip}
            className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Skip
          </button>
          <button
            onClick={next}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
          >
            {step === STEPS.length - 1 ? 'Start Playing' : 'Next'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
