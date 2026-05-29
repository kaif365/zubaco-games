
import { APP_COLOR } from "@/theme/color";
import type { PointerEvent, ReactNode } from "react";

interface ControlButtonProps {
  readonly direction: "UP" | "DOWN" | "LEFT" | "RIGHT";
  readonly icon: ReactNode;
}

export function ControlButton({ direction, icon }: ControlButtonProps) {
  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    window.dispatchEvent(
      new CustomEvent("maze-move", { detail: { direction } }),
    );
  };

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      aria-label={`Move ${direction.toLowerCase()}`}
      className="w-16 h-16 border-2 rounded-2xl flex items-center justify-center active:scale-95 transition-all shadow-xl"
      style={{
        background: APP_COLOR.panel,
        borderColor: APP_COLOR.accentSoft20,
        color: APP_COLOR.accent,
      }}
    >
      {icon}
    </button>
  );
}
