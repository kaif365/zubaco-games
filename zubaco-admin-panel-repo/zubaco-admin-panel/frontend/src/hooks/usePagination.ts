import { useState, useCallback } from "react";
import { DEFAULT_PAGE_SIZE } from "@/constants/status";

export function usePagination(initialPageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const goToPage = useCallback((p: number) => setPage(p), []);
  const changePageSize = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);
  const reset = useCallback(() => setPage(1), []);

  return { page, pageSize, goToPage, changePageSize, reset };
}
