import { Alert } from '@/components/ui/Alert';

const API_ERROR_AUTO_CLOSE_MS = 2000;

type AlertVariant = 'info' | 'success' | 'error' | 'warning';

interface ApiErrorBannerProps {
  variant: AlertVariant;
  title: string;
  description: string;
  onClose: () => void;
}

export function ApiErrorBanner({ variant, title, description, onClose }: ApiErrorBannerProps) {
  if (!title && !description) return null;

  return (
    <div className="fixed left-1/2 bottom-[max(18px,env(safe-area-inset-bottom))] z-40 w-[calc(100vw-32px)] max-w-[520px] -translate-x-1/2 shadow-2xl">
      <Alert
        variant={variant}
        title={title}
        description={description}
        onClose={onClose}
        autoCloseMs={API_ERROR_AUTO_CLOSE_MS}
      />
    </div>
  );
}
