import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Card.
 *
 * @param {React.HTMLAttributes<HTMLDivElement>} props - Component props.
 * @param {string | undefined} props.className - The class name.
 *
 * @returns {JSX.Element} The rendered element.
 */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border !border-white/10 bg-card/90 text-card-foreground backdrop-blur',
        className,
      )}
      {...props}
    />
  );
}
/**
 * Card header.
 *
 * @param {React.HTMLAttributes<HTMLDivElement>} props - Component props.
 * @param {string | undefined} props.className - The class name.
 *
 * @returns {JSX.Element} The rendered element.
 */
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-row w-full justify-between align-center md:align-initial md:justify-start md:w-auto md:flex-col gap-3 md:p-0',
        className,
      )}
      {...props}
    />
  );
}
type CardTitleProps = React.HTMLAttributes<HTMLHeadingElement> & {
  children: React.ReactNode;
};

/**
 * Card title.
 *
 * @param {React.HTMLAttributes<HTMLHeadingElement> & { children: React.ReactNode; }} props - Component props.
 * @param {string | undefined} props.className - The class name.
 * @param {string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<AwaitedReactNode> | null | undefined} props.children - The children.
 *
 * @returns {JSX.Element} The rendered element.
 */
export function CardTitle({ className, children, ...props }: CardTitleProps) {
  return (
    <h3 className={cn('text-xl font-semibold leading-none tracking-tight', className)} {...props}>
      {children}
    </h3>
  );
}
/**
 * Card content.
 *
 * @param {React.HTMLAttributes<HTMLDivElement>} props - Component props.
 * @param {string | undefined} props.className - The class name.
 *
 * @returns {JSX.Element} The rendered element.
 */
export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5 pt-0 pb-0', className)} {...props} />;
}
/**
 * Card footer.
 *
 * @param {React.HTMLAttributes<HTMLDivElement>} props - Component props.
 * @param {string | undefined} props.className - The class name.
 *
 * @returns {JSX.Element} The rendered element.
 */
export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center p-5 pt-0 pb-0', className)} {...props} />;
}
