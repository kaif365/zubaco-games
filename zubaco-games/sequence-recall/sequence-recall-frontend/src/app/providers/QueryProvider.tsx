import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { appConfig } from '@app/config/appConfig';
import { ApiRequestError } from '@app-types/api.types';

const NO_RETRY_STATUSES = new Set([401, 403, 404, 422]);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: (failureCount, error) => {
        if (error instanceof ApiRequestError && NO_RETRY_STATUSES.has(error.statusCode)) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: appConfig.env === 'production',
    },
    mutations: {
      retry: false,
    },
  },
});

interface QueryProviderProps {
  children: ReactNode;
}

/**
 * Query provider.
 *
 * @param {QueryProviderProps} props - Component props.
 * @param {string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<AwaitedReactNode> | null | undefined} props.children - The children.
 *
 * @returns {JSX.Element} The rendered element.
 */
export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export { queryClient };
