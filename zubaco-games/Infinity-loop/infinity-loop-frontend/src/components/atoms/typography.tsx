// /components/atoms/typography.tsx
import { cn } from "@/utils/core";

interface Props extends React.HTMLAttributes<HTMLHeadingElement> {
  variant?: 'h1' | 'h2' | 'h3' | 'p' | 'small';
}

export const Typography = ({ children, variant = 'p', className, ...props }: Props) => {
  const baseClasses = "text-slate-100 transition-colors";
  
  switch (variant) {
    case 'h1':
      return <h1 className={cn("text-4xl font-bold tracking-tighter sm:text-6xl", baseClasses, className)} {...props}>{children}</h1>;
    case 'h2':
      return <h2 className={cn("text-2xl font-semibold tracking-tight", baseClasses, className)} {...props}>{children}</h2>;
    case 'h3':
      return <h3 className={cn("text-xl font-medium", baseClasses, className)} {...props}>{children}</h3>;
    case 'small':
      return <small className={cn("text-xs font-medium uppercase tracking-widest text-default-400", className)} {...props}>{children}</small>;
    default:
      return <p className={cn("text-base text-slate-300", className)} {...props}>{children}</p>;
  }
};
