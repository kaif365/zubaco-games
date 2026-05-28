import { ControlButton } from "@/components/atoms/control-button";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from "lucide-react";

interface MazeControlsProps {
  readonly inputDisabled?: boolean;
}

export function MazeControls({ inputDisabled = false }: MazeControlsProps) {
  return (
    <div className="mt-1 flex flex-col items-center gap-2">
      <div
        className={`grid grid-cols-3 gap-3${inputDisabled ? " pointer-events-none opacity-90" : ""}`}
      >
        <div />
        <ControlButton direction="UP" icon={<ChevronUp size={32} />} />
        <div />
        <ControlButton direction="LEFT" icon={<ChevronLeft size={32} />} />
        <ControlButton direction="DOWN" icon={<ChevronDown size={32} />} />
        <ControlButton direction="RIGHT" icon={<ChevronRight size={32} />} />
      </div>
    </div>
  );
}
