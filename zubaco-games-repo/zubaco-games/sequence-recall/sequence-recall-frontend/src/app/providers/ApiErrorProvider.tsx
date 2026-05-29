import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { ApiErrorBanner } from '@/components/shared/ApiErrorBanner';
import type { AlertVariant } from '@/components/ui/alert';

export interface ApiErrorState {
  variant: AlertVariant;
  title: string;
  description: string;
}

interface ShowApiErrorInput {
  title: string;
  description: string;
  variant?: AlertVariant;
}

interface ApiErrorContextValue {
  apiError: ApiErrorState | null;
  showApiError: (input: ShowApiErrorInput) => void;
  clearApiError: () => void;
}

const ApiErrorContext = createContext<ApiErrorContextValue | null>(null);

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

export function useApiError(): ApiErrorContextValue {
  const ctx = useContext(ApiErrorContext);
  if (!ctx) {
    throw new Error('useApiError must be used within ApiErrorProvider');
  }
  return ctx;
}
