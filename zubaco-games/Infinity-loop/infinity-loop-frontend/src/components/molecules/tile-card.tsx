// /components/molecules/tile-card.tsx
"use client";

import { TilePiece } from "@/components/atoms/tile-piece";
import { GridCell } from "@/types/tile";
import { motion } from "motion/react";

interface Props {
  readonly cell: GridCell;
  readonly primaryColor: string;
  readonly glowColor: string;
  readonly accentColor: string;
  readonly onClick: () => void;
  readonly isHinted?: boolean;
}

export const TileCard = ({
  cell,
  primaryColor,
  glowColor,
  accentColor: _accentColor,
  onClick,
  isHinted,
}: Props) => {
  const hintedClassName = isHinted ? "ring-1 ring-sky-400/20 rounded-full" : "";
  const hintedScaleAnimation = isHinted ? [1, 1.1, 1] : 1;
  const hintedScaleTransition = isHinted
    ? { repeat: Infinity, duration: 2 }
    : { duration: 0.2 };
  const tileColor = isHinted ? "#FFF" : primaryColor;
  const tileGlow = isHinted ? "rgba(255,255,255,0.8)" : glowColor;
  const showCorrectnessGlow = cell.isCorrect && !isHinted;

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      data-accent-color={_accentColor}
      className={`cursor-pointer w-[80px] h-[80px] sm:w-[110px] sm:h-[110px] flex items-center justify-center relative group ${hintedClassName}`}
    >
      <motion.div
        animate={{
          rotate: cell.rotation * 90,
          scale: hintedScaleAnimation,
        }}
        transition={{
          rotate: { type: "spring", stiffness: 260, damping: 25 },
          scale: hintedScaleTransition,
        }}
        className="w-full h-full"
      >
        <TilePiece
          type={cell.type}
          color={tileColor}
          glow={tileGlow}
          isConnected={cell.isCorrect || Boolean(isHinted)}
        />
      </motion.div>

      {/* Hint Pulse */}
      {isHinted && (
        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [0, 0.4, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute inset-0 rounded-full bg-white/20 blur-xl pointer-events-none"
        />
      )}

      {/* Correctness indication */}
      {showCorrectnessGlow && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.15 }}
          className="absolute inset-0 rounded-full bg-white blur-xl pointer-events-none"
        />
      )}
    </motion.div>
  );
};
