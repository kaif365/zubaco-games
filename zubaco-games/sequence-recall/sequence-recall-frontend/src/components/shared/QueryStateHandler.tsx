import type { ReactNode } from 'react';

interface QueryStateHandlerProps {
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  isEmpty?: boolean;
  loadingFallback?: ReactNode;
  errorFallback?: ReactNode;
  emptyFallback?: ReactNode;
  children: ReactNode;
}

/**
 * Query state handler.
 *
 * @param {QueryStateHandlerProps} props - Component props.
 * @param {boolean} props.isLoading - The is loading.
 * @param {boolean} props.isError - The is error.
 * @param {Error | null | undefined} [props.error] - The error.
 * @param {boolean | undefined} [props.isEmpty] - The is empty.
 * @param {string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<AwaitedReactNode> | null | undefined} [props.loadingFallback] - The loading fallback.
 * @param {string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<AwaitedReactNode> | null | undefined} [props.errorFallback] - The error fallback.
 * @param {string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<AwaitedReactNode> | null | undefined} [props.emptyFallback] - The empty fallback.
 * @param {string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<AwaitedReactNode> | null | undefined} props.children - The children.
 *
 * @returns {JSX.Element} The rendered element.
 */
export function QueryStateHandler({
  isLoading,
  isError,
  error,
  isEmpty = false,
  loadingFallback,
  errorFallback,
  emptyFallback,
  children,
}: QueryStateHandlerProps) {
  if (isLoading) {
    return (
      <>
        {loadingFallback ?? (
          <div className="flex items-center justify-center p-8">
            <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
          </div>
        )}
      </>
    );
  }

  if (isError) {
    return (
      <>
        {errorFallback ?? (
          <div className="text-destructive p-4 text-sm">
            {error?.message ?? 'Failed to load data.'}
          </div>
        )}
      </>
    );
  }

  if (isEmpty) {
    return (
      <>
        {emptyFallback ?? <div className="text-muted-foreground p-4 text-sm">No data found.</div>}
      </>
    );
  }

  return <>{children}</>;
}
