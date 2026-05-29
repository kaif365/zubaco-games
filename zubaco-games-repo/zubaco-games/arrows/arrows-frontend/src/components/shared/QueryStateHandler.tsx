import type { ReactNode } from "react";

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
            <div className="border-[#8b5cf6] h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
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
            {error?.message ?? "Failed to load data."}
          </div>
        )}
      </>
    );
  }

  if (isEmpty) {
    return (
      <>
        {emptyFallback ?? (
          <div className="text-muted-foreground p-4 text-sm">
            No data found.
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
}
