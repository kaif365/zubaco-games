import { motion } from "motion/react";
import type { ComponentProps, ReactNode } from "react";

import { useFadeSlideMotion } from "@/components/motion/use-fade-slide-motion";

interface FadeSlideProps
  extends Omit<ComponentProps<typeof motion.div>, "children"> {
  readonly children: ReactNode;
}

export function FadeSlide({
  children,
  className,
  ...rest
}: Readonly<FadeSlideProps>) {
  const motionProps = useFadeSlideMotion();
  return (
    <motion.div className={className} {...motionProps} {...rest}>
      {children}
    </motion.div>
  );
}
