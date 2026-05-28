import React, { useEffect, useState } from 'react';
import { Info, CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

type AlertVariant = 'info' | 'success' | 'error' | 'warning';

interface AlertProps {
  readonly variant: AlertVariant;
  readonly title: string;
  readonly description?: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
  readonly onClose?: () => void;
}

const variantStyles: Record<AlertVariant, {
  wrapper: string;
  iconBg: string;
  icon: string;
  text: string;
  btn: string;
  Icon: React.ElementType;
}> = {
  info: {
    wrapper: 'bg-blue-950/90 border border-blue-500/50',
    iconBg: 'bg-blue-500/20',
    icon: 'text-blue-300',
    text: 'text-blue-100',
    btn: 'bg-blue-600 hover:bg-blue-500 text-white border-transparent',
    Icon: Info,
  },
  success: {
    wrapper: 'bg-emerald-950/90 border border-emerald-500/50',
    iconBg: 'bg-emerald-500/20',
    icon: 'text-emerald-300',
    text: 'text-emerald-100',
    btn: 'bg-emerald-700 hover:bg-emerald-600 text-white border-transparent',
    Icon: CheckCircle,
  },
  error: {
    wrapper: 'bg-red-950/90 border border-red-500/50',
    iconBg: 'bg-red-500/20',
    icon: 'text-red-300',
    text: 'text-red-100',
    btn: 'bg-red-700 hover:bg-red-600 text-white border-transparent',
    Icon: XCircle,
  },
  warning: {
    wrapper: 'bg-amber-950/30 border border-amber-500/50',
    iconBg: 'bg-amber-500/20',
    icon: 'text-amber-300',
    text: 'text-amber-100',
    btn: 'bg-amber-700 hover:bg-amber-600 text-white border-transparent',
    Icon: AlertCircle,
  },
};

export function Alert({
  variant,
  title,
  description,
  actionLabel,
  onAction,
  onClose,
}: AlertProps) {
  const styles = variantStyles[variant];
  const { Icon } = styles;
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setIsAnimated(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleClose = () => {
    setIsAnimated(false);
    if (onClose) {
      setTimeout(onClose, 300);
    }
  };

  return (
    <div
      className={`flex items-center gap-3.5 rounded-xl px-4 py-3.5 w-full max-w-[520px] mx-auto transition-all duration-300 ease-out transform ${isAnimated ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'} ${styles.wrapper}`}
    >
      <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${styles.iconBg}`}>
        <Icon className={`w-[17px] h-[17px] ${styles.icon}`} />
      </div>

      <div className="flex-1 min-w-0 font-sans">
        <p className={`text-sm font-bold leading-snug ${styles.text}`}>{title}</p>
        {description && (
          <p className={`text-[13px] font-normal leading-[1.4] opacity-85 mt-0.5 ${styles.text}`}>
            {description}
          </p>
        )}
      </div>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className={`flex-shrink-0 text-[13px] font-semibold px-4 py-1.5 rounded-lg border transition-opacity ${styles.btn}`}
        >
          {actionLabel}
        </button>
      )}

      {onClose && (
        <button
          type="button"
          onClick={handleClose}
          className={`flex-shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors ${styles.text}`}
          aria-label="Dismiss alert"
        >
          <X className="w-[18px] h-[18px]" />
        </button>
      )}
    </div>
  );
}
