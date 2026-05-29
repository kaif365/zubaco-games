import { useEffect, useRef } from "react";

export function useAutoBackPageOnEmpty({
  page,
  pageSize,
  itemsLength,
  total,
  isLoading,
  isFetching = false,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  itemsLength: number;
  total: number;
  isLoading: boolean;
  isFetching?: boolean;
  onPageChange: (page: number) => void;
}) {
  const lastPageChange = useRef<number | null>(null);

  useEffect(() => {
    const busy = isLoading || isFetching;
    if (busy) return;

    // Most reliable signal: we're on a non-first page and the settled query returned no rows.
    // This can happen after deletes or when the server clamps totals inconsistently for out-of-range pages.
    let target: number | null = null;
    if (page > 1 && itemsLength === 0) {
      target = page - 1;
    } else if (total <= 0) {
      // When everything is deleted, keep UX stable by landing on page 1.
      if (page !== 1) target = 1;
    } else {
      const maxPage =
        pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;
      if (page > maxPage) target = maxPage;
    }

    if (!target || target === page) return;

    // Prevent redundant cascading updates when multiple query invalidations happen.
    if (lastPageChange.current === target) return;
    lastPageChange.current = target;
    onPageChange(target);
  }, [isFetching, isLoading, itemsLength, onPageChange, page, pageSize, total]);
}
