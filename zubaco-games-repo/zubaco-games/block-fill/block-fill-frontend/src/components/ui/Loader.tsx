interface LoaderProps {
  text?: string;
}

/** Full-area centered spinner with optional label. */
export function Loader({ text }: LoaderProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/20 border-t-[#8b5cf6]" />
      {text ? <p className="text-xs text-white">{text}</p> : null}
    </div>
  );
}
