// /components/atoms/tile-piece.tsx
"use client";

import { TileType } from "@/types/tile";
import { motion } from "motion/react";

interface Props {
  readonly type: TileType;
  readonly color: string;
  readonly glow: string;
  readonly isConnected: boolean;
}

export const TilePiece = ({ type, color, glow, isConnected }: Props) => {
  const strokeWidth = 12;
  const size = 100;
  const center = size / 2;
  const glowFilter = `drop-shadow(0 0 12px ${glow})`;
  const baseFilter = "drop-shadow(0 0 2px rgba(0,0,0,0.5))";
  const filter = isConnected ? glowFilter : baseFilter;

  const renderShape = () => {
    switch (type) {
      case TileType.CAP:
        return (
          <>
            <line
              x1={center}
              y1={center}
              x2={center}
              y2={0}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            <circle cx={center} cy={center} r={strokeWidth / 2} fill={color} />
          </>
        );
      case TileType.STRAIGHT:
        return (
          <line
            x1={center}
            y1={0}
            x2={center}
            y2={size}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        );
      case TileType.ELBOW:
        return (
          <path
            d={`M ${center} 0 A ${center} ${center} 0 0 1 ${size} ${center}`}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        );
      case TileType.TEE:
        return (
          <>
            <line
              x1={center}
              y1={0}
              x2={center}
              y2={size}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            <line
              x1={center}
              y1={center}
              x2={size}
              y2={center}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          </>
        );
      case TileType.CURVED_V:
        return (
          <>
            <line
              x1={center}
              y1={0}
              x2={center}
              y2={size}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            <path
              d={`M ${center} ${center - strokeWidth / 2} C ${center + size * 0.25} ${center - size * 0.18}, ${size - size * 0.12} ${center - size * 0.1}, ${size} ${center}`}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            <path
              d={`M ${center} ${center + strokeWidth / 2} C ${center + size * 0.25} ${center + size * 0.18}, ${size - size * 0.12} ${center + size * 0.1}, ${size} ${center}`}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          </>
        );
      case TileType.CROSS:
        return (
          <>
            <line
              x1={center}
              y1={0}
              x2={center}
              y2={size}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            <line
              x1={0}
              y1={center}
              x2={size}
              y2={center}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          </>
        );
      case TileType.EMPTY:
      default:
        return null;
    }
  };

  return (
    <div className="relative w-full h-full">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-full"
        style={{
          filter,
          transition: "all 0.4s ease-out",
        }}
      >
        <motion.g animate={{ stroke: color }} transition={{ duration: 0.4 }}>
          {renderShape()}
        </motion.g>
      </svg>
    </div>
  );
};
