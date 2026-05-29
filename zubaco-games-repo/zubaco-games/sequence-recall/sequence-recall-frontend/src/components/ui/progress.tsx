import { cn } from '@/lib/utils';

interface ProgressProps {
  value: number;
  className?: string;
}

/**
 * Progress.
 *
 * @param {ProgressProps} props - Component props.
 * @param {number} props.value - The value.
 * @param {string | undefined} [props.className] - The class name.
 *
 * @returns {JSX.Element} The rendered element.
 */
export function Progress({ value, className }: ProgressProps) {
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-muted/70', className)}>
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${String(Math.max(0, Math.min(100, value)))}%` }}
      />
    </div>
  );
}
