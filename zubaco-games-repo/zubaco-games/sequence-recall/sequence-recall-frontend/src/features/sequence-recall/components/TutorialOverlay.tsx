import { motion } from 'framer-motion';
import { Hand, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TutorialStep } from '@/types/game';

interface TutorialOverlayProps {
  open: boolean;
  step: TutorialStep | null;
  currentIndex: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const demoTiles = [
  'from-emerald-300/85 to-emerald-700/90',
  'from-rose-300/85 to-rose-700/90',
  'from-blue-300/85 to-blue-700/90',
  'from-yellow-200/85 to-yellow-600/90',
];

const demoHandPaths = [
  [
    { x: '-55%', y: '-55%' },
    { x: '55%', y: '-55%' },
    { x: '55%', y: '55%' },
  ],
  [
    { x: '55%', y: '-55%' },
    { x: '-55%', y: '55%' },
    { x: '55%', y: '55%' },
  ],
  [
    { x: '-55%', y: '55%' },
    { x: '-55%', y: '-55%' },
    { x: '55%', y: '-55%' },
  ],
];

export function TutorialOverlay({
  open,
  step,
  currentIndex,
  totalSteps,
  onNext,
  onSkip,
}: TutorialOverlayProps) {
  const { t } = useTranslation();

  if (!open || !step) return null;

  const handPath = demoHandPaths[currentIndex % demoHandPaths.length] ?? demoHandPaths[0];

  // Look up translated title/description by step id; fall back to step data if key not found
  const stepTitle = t(`tutorial.steps.${step.id}.title`, { defaultValue: step.title });
  const stepDescription = t(`tutorial.steps.${step.id}.description`, {
    defaultValue: step.description,
  });

  return (
    <div
      className="absolute inset-0 z-[1200] flex items-center justify-center rounded-2xl bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_38%),rgba(2,6,23,0.86)] p-4 backdrop-blur-sm"
      aria-live="polite"
    >
      <Card className="relative w-full max-w-md overflow-hidden rounded-[28px] border-cyan-300/25 bg-[linear-gradient(180deg,rgba(9,17,38,0.96),rgba(6,10,24,0.98))] shadow-[0_24px_60px_rgba(2,6,23,0.45)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
        <div className="pointer-events-none absolute left-8 top-8 h-28 w-28 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-8 right-8 h-28 w-28 rounded-full bg-fuchsia-400/10 blur-3xl" />

        <CardHeader className="relative space-y-3 pb-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-100/45">
                {t('tutorial.howToPlay')}
              </p>
              <CardTitle className="mt-1 text-xl text-cyan-50">{stepTitle}</CardTitle>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[13px] font-semibold uppercase tracking-[0.16em] text-cyan-100/75">
              {currentIndex + 1}/{totalSteps}
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative space-y-5">
          <div className="rounded-[22px] border border-cyan-200/10 bg-slate-950/35 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-cyan-100/45">
              <Sparkles size={12} />
              {t('tutorial.tileDemo')}
            </div>
            <div className="relative mx-auto mb-4 grid w-full max-w-[250px] grid-cols-2 gap-3">
              {demoTiles.map((tileClass, index) => (
                <motion.div
                  key={index}
                  className={`aspect-square rounded-[18px] border border-white/10 bg-gradient-to-br ${tileClass}`}
                  animate={{
                    scale: [1, currentIndex % demoTiles.length === index ? 1.06 : 1.02, 1],
                    opacity: [0.82, 1, 0.82],
                    boxShadow: [
                      '0 0 0 rgba(34,211,238,0)',
                      '0 0 24px rgba(255,255,255,0.14)',
                      '0 0 0 rgba(34,211,238,0)',
                    ],
                  }}
                  transition={{
                    duration: 1.6,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: index * 0.12,
                  }}
                />
              ))}
              <motion.div
                className="pointer-events-none absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-300/25 bg-slate-950/80 text-cyan-100 shadow-[0_8px_24px_rgba(2,6,23,0.35)]"
                animate={{
                  x: handPath.map((point) => point.x),
                  y: handPath.map((point) => point.y),
                  scale: [1, 1.08, 1],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <Hand size={18} />
              </motion.div>
            </div>
            <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-cyan-100/45">
              <Sparkles size={12} />
              {t('tutorial.instruction')}
            </div>
            <p className="text-sm leading-relaxed text-slate-200">{stepDescription}</p>
          </div>

          <div
            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            data-tutorial-target="controls"
          >
            <Button variant="ghost" className="text-slate-300 hover:text-cyan-100" onClick={onSkip}>
              {t('tutorial.skip')}
            </Button>
            <div className="flex gap-2">
              <Button className="bg-cyan-400 text-slate-950 hover:bg-cyan-300" onClick={onNext}>
                {currentIndex + 1 === totalSteps ? t('tutorial.startGame') : t('tutorial.next')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
