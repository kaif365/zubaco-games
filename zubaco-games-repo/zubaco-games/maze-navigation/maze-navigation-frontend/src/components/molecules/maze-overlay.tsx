
import { useFadeSlideMotion } from "@/components/motion/use-fade-slide-motion";
import { APP_COLOR } from "@/theme/color";
import { motion } from "motion/react";
import type { ReactNode } from "react";

interface MazeOverlayProps {
  readonly children: ReactNode;
}

export function MazeOverlay({ children }: MazeOverlayProps) {
  const motionProps = useFadeSlideMotion();

  return (
    <motion.div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-md p-6 border-4"
      style={{
        background: APP_COLOR.overlay,
        borderColor: APP_COLOR.panelBorder,
      }}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}
