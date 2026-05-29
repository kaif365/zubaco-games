import { createContext, useContext } from 'react';

export type AlertVariant = 'info' | 'success' | 'error' | 'warning';

export interface ApiErrorState {
  variant: AlertVariant;
  title: string;
  description: string;
}

export interface ShowApiErrorInput {
  title: string;
  description: string;
  variant?: AlertVariant;
}

export interface ApiErrorContextValue {
  apiError: ApiErrorState | null;
  showApiError: (input: ShowApiErrorInput) => void;
  clearApiError: () => void;
}

export const ApiErrorContext = createContext<ApiErrorContextValue | null>(null);

export function useApiError(): ApiErrorContextValue {
  const ctx = useContext(ApiErrorContext);
  if (!ctx) {
    throw new Error('useApiError must be used within ApiErrorProvider');
  }
  return ctx;
}
