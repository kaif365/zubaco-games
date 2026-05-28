// /components/organisms/win-overlay.tsx
"use client";

import { Button } from "@/components/atoms/button";
import { Typography } from "@/components/atoms/typography";
import { useTranslation } from "react-i18next";
import { ChevronRight, PartyPopper } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface Props {
  readonly isOpen: boolean;
  readonly onNext: () => void;
  readonly onRestart: () => void;
  readonly moves: number;
  readonly accentColor: string;
}

export const WinOverlay = ({
  isOpen,
  onNext,
  onRestart,
  moves,
  accentColor,
}: Props) => {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/10 backdrop-blur-[1px] p-6"
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 20 }}
            animate={{
              scale: [1, 1.01, 1],
              opacity: 1,
              y: 0,
              boxShadow: [
                "0 0 0 1px rgba(16,185,129,0.5), 0 0 18px rgba(16,185,129,0.45)",
                "0 0 0 2px rgba(16,185,129,0.95), 0 0 34px rgba(16,185,129,0.95)",
                "0 0 0 1px rgba(16,185,129,0.5), 0 0 18px rgba(16,185,129,0.45)",
              ],
              borderColor: [
                "rgba(16,185,129,0.5)",
                "rgba(16,185,129,0.95)",
                "rgba(16,185,129,0.5)",
              ],
            }}
            exit={{ scale: 0.94, opacity: 0, y: 20 }}
            transition={{
              scale: { duration: 1.4, repeat: Infinity, ease: "easeInOut" },
              boxShadow: {
                duration: 1.4,
                repeat: Infinity,
                ease: "easeInOut",
              },
              opacity: { duration: 0.25, ease: "easeOut" },
              y: { duration: 0.25, ease: "easeOut" },
            }}
            className="border p-10 rounded-3xl max-w-sm w-full text-center flex flex-col items-center backdrop-blur-xl transition-all duration-1000 bg-slate-950/45"
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-6 border transition-all duration-1000"
              style={{
                backgroundColor: `${accentColor}22`,
                borderColor: `${accentColor}44`,
              }}
            >
              <PartyPopper
                className="w-10 h-10 transition-colors duration-1000"
                style={{ color: accentColor }}
              />
            </div>

            <Typography variant="h2" className="mb-2">
              {t("game.winToastTitle")}
            </Typography>
            <Typography className="mb-8 opacity-70">
              {t("game.finishDescriptionWon", { moves })}
            </Typography>

            <div className="w-full flex flex-col gap-3">
              <Button
                variant="outline"
                onClick={onRestart}
                className="w-full py-6 rounded-2xl border-slate-700/40 text-slate-100 hover:bg-white/5 font-semibold"
              >
                {t("game.replayLevel")}
              </Button>
              <Button
                onClick={onNext}
                className="w-full py-6 rounded-2xl text-slate-950 font-bold text-lg flex items-center justify-center gap-2 transition-all duration-500"
                style={{
                  backgroundColor: accentColor,
                  boxShadow: `0 0 20px ${accentColor}66`,
                }}
              >
                {t("game.nextLevel")}
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
