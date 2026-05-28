import { memo } from 'react';
import { Alert } from '@/components/ui/Alert';

interface ErrorScreenProps {
  message?: string;
  retryLabel?: string;
  onRetry?: () => void;
}

const ErrorScreen = memo(({ message = 'Something went wrong.', retryLabel = 'RETRY', onRetry }: ErrorScreenProps) => (
  <div style={{
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: '16px', padding: '80px 24px', textAlign: 'center',
    height: '100%',
  }}>
    <Alert
      variant="error"
      title="Error"
      description={message}
      actionLabel={onRetry ? retryLabel : undefined}
      onAction={onRetry}
    />
  </div>
));

ErrorScreen.displayName = 'ErrorScreen';
export { ErrorScreen };
