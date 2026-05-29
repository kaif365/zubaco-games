import { useReducedMotion, type Transition } from "motion/react";

const DEFAULT_TRANSITION: Transition = { duration: 0.22, ease: "easeOut" };

export function useFadeSlideMotion() {
  const reduceMotion = useReducedMotion();

  return {
    initial: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 },
    animate: reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 },
    exit: reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 },
    transition: reduceMotion
      ? ({ duration: 0.12 } satisfies Transition)
      : DEFAULT_TRANSITION,
  };
}
