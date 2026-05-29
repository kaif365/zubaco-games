import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/20 text-primary',
        secondary: 'border-border bg-muted text-muted-foreground',
        success: 'border-emerald-500/40 bg-emerald-500/20 text-emerald-200',
        danger: 'border-rose-500/40 bg-rose-500/20 text-rose-200',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

/**
 * Badge.
 *
 * @param {BadgeProps} props - Component props.
 * @param {string | undefined} props.className - The class name.
 * @param {"default" | "success" | "danger" | "secondary" | null | undefined} props.variant - The variant.
 *
 * @returns {JSX.Element} The rendered element.
 */
export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
