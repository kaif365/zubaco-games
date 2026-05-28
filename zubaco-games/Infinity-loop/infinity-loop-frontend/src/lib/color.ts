export const isHexColor = (value: string): boolean =>
  /^#([0-9A-F]{6}|[0-9A-F]{3})$/i.test(value);

export const hexToRgba = (hex: string, alpha: number): string => {
  const sanitized = hex.replace("#", "");
  const normalized =
    sanitized.length === 3
      ? sanitized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : sanitized;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/** Blend hex toward white (0–1). Handy for “bright accent” pings on dark UI. */
export const mixHexTowardWhite = (hex: string, amount: number): string => {
  if (!isHexColor(hex)) {
    return hex;
  }
  const sanitized = hex.replace("#", "");
  const normalized =
    sanitized.length === 3
      ? sanitized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : sanitized;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  const t = Math.min(1, Math.max(0, amount));
  const blend = (channel: number) => Math.round(channel + (255 - channel) * t);
  const nr = blend(r);
  const ng = blend(g);
  const nb = blend(b);
  return `#${nr.toString(16).padStart(2, "0")}${ng.toString(16).padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
};
