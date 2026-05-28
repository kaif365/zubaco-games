// /components/templates/game-template.tsx
"use client";

import { NightSkyBackground } from "@/components/organisms/night-sky-background";
import { AnimatePresence, motion } from "motion/react";

interface Props {
  readonly children: React.ReactNode;
  readonly theme: { primary: string; glow: string; background: string };
}

export const GameTemplate = ({ children, theme }: Props) => {
  return (
    <div
      className="min-h-dvh w-full selection:bg-sky-500/30 flex flex-col items-center transition-colors duration-1000 relative overflow-hidden"
      style={{
        backgroundColor: theme.background,
      }}
    >
      <NightSkyBackground theme={theme} />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1]"
        animate={{ opacity: [0.12, 0.2, 0.12] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: `radial-gradient(circle at 50% 38%, ${theme.primary}4d 0%, transparent 62%)`,
        }}
      />

      <main className="relative z-10 w-full flex-1 min-h-0">
        <div className="mx-auto flex min-h-dvh w-full flex-col px-4 sm:px-6">
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, filter: "blur(2px)" }}
              transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
              className="w-full flex flex-1 min-h-0 flex-col items-center"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};
