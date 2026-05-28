import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

export interface ThemedSelectOption<T extends string> {
  value: T;
  label: string;
}

interface ThemedSelectProps<T extends string> {
  label: string;
  value: T;
  options: readonly ThemedSelectOption<T>[];
  onChange: (nextValue: T) => void;
  className?: string;
}

/**
 * Themed select.
 *
 * @param {ThemedSelectProps<T>} props - Component props.
 * @param {string} props.label - The label.
 * @param {T} props.value - The value.
 * @param {readonly ThemedSelectOption<T>[]} props.options - Function options.
 * @param {(nextValue: T) => void} props.onChange - The on change.
 * @param {string | undefined} [props.className] - The class name.
 *
 * @returns {JSX.Element} The rendered element.
 */
export function ThemedSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: ThemedSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    /**
     * On pointer down.
     *
     * @param {MouseEvent} event - The event.
     *
     * @returns {void} No return value.
     */
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, []);

  const selectedLabel = options.find((option) => option.value === value)?.label ?? value;

  return (
    <div ref={rootRef} className={cn('space-y-1 text-right ', className)}>
      <p className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100/70">
        {label}
      </p>
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setOpen((prev) => !prev);
          }}
          className="flex h-9 min-w-[120px] items-center justify-between rounded-md border border-cyan-200/30 bg-slate-900/80 px-3 text-sm font-medium text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.08)] transition-colors hover:border-cyan-300/55 hover:bg-slate-800/90"
        >
          <span>{selectedLabel}</span>
          <span className="text-cyan-300/80">{open ? '▲' : '▼'}</span>
        </button>
        {open ? (
          <div className="absolute right-0 top-11 z-40 min-w-[120px] overflow-hidden rounded-md border border-cyan-200/30 bg-slate-950/95 shadow-[0_10px_30px_rgba(2,6,23,0.55)]">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`block w-full px-3 py-2 text-left text-sm transition-colors ${
                  value === option.value
                    ? 'bg-cyan-400/20 text-cyan-100'
                    : 'text-cyan-100/85 hover:bg-cyan-400/10'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
