import { useCallback, useMemo, useState, type ReactNode } from 'react';

import { ApiErrorBanner } from '@/components/shared/ApiErrorBanner';
import {
  ApiErrorContext,
  type ApiErrorState,
  type ShowApiErrorInput,
} from '@/hooks/useApiError';

interface ApiErrorProviderProps {
  children: ReactNode;
}

export function ApiErrorProvider({ children }: ApiErrorProviderProps) {
  const [apiError, setApiError] = useState<ApiErrorState | null>(null);
  const [errorKey, setErrorKey] = useState(0);

  const showApiError = useCallback((input: ShowApiErrorInput) => {
    setApiError({
      variant: input.variant ?? 'error',
      title: input.title,
      description: input.description,
    });
    setErrorKey((key) => key + 1);
  }, []);

  const clearApiError = useCallback(() => {
    setApiError(null);
  }, []);

  const value = useMemo(
    () => ({ apiError, showApiError, clearApiError }),
    [apiError, showApiError, clearApiError],
  );

  return (
    <ApiErrorContext.Provider value={value}>
      {children}
      {apiError ? (
        <ApiErrorBanner
          key={errorKey}
          variant={apiError.variant}
          title={apiError.title}
          description={apiError.description}
          onClose={clearApiError}
        />
      ) : null}
    </ApiErrorContext.Provider>
  );
}
