import { renderHook, act } from "@testing-library/react";
import { usePagination } from "@/hooks/usePagination";

describe("usePagination", () => {
  it("starts at page 1 with default page size", () => {
    const { result } = renderHook(() => usePagination());
    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(10);
  });

  it("uses custom initial page size", () => {
    const { result } = renderHook(() => usePagination(20));
    expect(result.current.pageSize).toBe(20);
  });

  it("goToPage updates the page", () => {
    const { result } = renderHook(() => usePagination());
    act(() => result.current.goToPage(3));
    expect(result.current.page).toBe(3);
  });

  it("changePageSize updates page size and resets to page 1", () => {
    const { result } = renderHook(() => usePagination());
    act(() => result.current.goToPage(4));
    act(() => result.current.changePageSize(50));
    expect(result.current.pageSize).toBe(50);
    expect(result.current.page).toBe(1);
  });

  it("reset brings page back to 1", () => {
    const { result } = renderHook(() => usePagination());
    act(() => result.current.goToPage(5));
    act(() => result.current.reset());
    expect(result.current.page).toBe(1);
  });
});
