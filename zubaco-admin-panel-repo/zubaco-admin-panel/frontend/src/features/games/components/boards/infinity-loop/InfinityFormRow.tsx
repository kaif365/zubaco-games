interface InfinityFormRowProps {
  readonly label: string;
  readonly children: React.ReactNode;
  readonly helperText?: string;
}

export const InfinityFormRow = ({
  label,
  children,
  helperText,
}: InfinityFormRowProps) => (
  <label className="grid gap-2 text-sm text-white">
    <span className="font-semibold tracking-wide text-white">{label}</span>
    {children}
    {helperText ? (
      <span className="text-xs text-white/70">{helperText}</span>
    ) : null}
  </label>
);
