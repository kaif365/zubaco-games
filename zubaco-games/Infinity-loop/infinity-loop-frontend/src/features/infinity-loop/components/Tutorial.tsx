"use client";

import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";

const STEPS = [
  {
    title: "Welcome to Infinity Loop",
    description: "A relaxing puzzle where you connect tiles to form closed loops.",
    icon: "♾️",
  },
  {
    title: "Tap to Rotate",
    description: "Tap any tile to rotate it 90° clockwise. Each tile has connection points.",
    icon: "🔄",
  },
  {
    title: "Form Closed Loops",
    description: "Connect all tile lines so they form closed loops — no open ends!",
    icon: "🔗",
  },
  {
    title: "No Open Ends",
    description: "Every connection must lead to another tile. Dangling ends mean the puzzle isn't solved.",
    icon: "🚫",
  },
  {
    title: "Fewer Moves = More Stars",
    description: "Solve puzzles efficiently to earn 3 stars. Use hints if you get stuck!",
    icon: "⭐",
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
                i === step ? "bg-emerald-400 scale-125" : i < step ? "bg-emerald-600" : "bg-slate-600"
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
            className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
          >
            {step === STEPS.length - 1 ? "Start Playing" : "Next"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
