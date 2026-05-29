import { useMemo } from "react";
import { cn } from "@/utils/cn";

const HEX_COLOR_REGEX = /^#?[0-9a-fA-F]{6}$/;

interface InfinityColorPickerProps {
  readonly value: string;
  readonly onChange: (nextColor: string) => void;
  readonly className?: string;
}

const normalizeHexColor = (raw: string): string => {
  const normalized = raw.trim();
  if (!HEX_COLOR_REGEX.test(normalized)) return "#7dd3fc";
  return normalized.startsWith("#") ? normalized : `#${normalized}`;
};

export const InfinityColorPicker = ({
  value,
  onChange,
  className,
}: InfinityColorPickerProps) => {
  const normalizedValue = useMemo(() => normalizeHexColor(value), [value]);

  return (
    <div
      className={cn(
        // Match `Input` base styling (bg-card, ring-1 on focus-visible).
        "flex h-9 w-full min-w-0 items-center gap-2 rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors focus-within:outline-none focus-within:ring-0",
        className,
      )}
    >
      <span
        className="h-6 w-6 shrink-0 rounded border border-white/20"
        style={{ backgroundColor: normalizedValue }}
        aria-hidden
      />
      <input
        type="color"
        aria-label="Choose board color"
        value={normalizedValue}
        onChange={(event) => onChange(event.target.value)}
        className="h-6 w-6 shrink-0 cursor-pointer appearance-none rounded border-0 bg-transparent p-0"
      />
      <input
        key={normalizedValue}
        defaultValue={normalizedValue}
        aria-label="Board color hex value"
        className="w-full border-0 bg-transparent font-medium text-white outline-none focus-visible:outline-none"
        onBlur={(event) => {
          const nextColor = normalizeHexColor(event.target.value);
          event.target.value = nextColor;
          onChange(nextColor);
        }}
      />
    </div>
  );
};
