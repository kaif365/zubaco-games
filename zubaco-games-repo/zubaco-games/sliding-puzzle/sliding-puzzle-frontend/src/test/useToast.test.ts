import { renderHook, act } from '@testing-library/react';

import { useToast } from '../hooks/useToast';

describe('useToast', () => {
  jest.useFakeTimers();

  it('should add and auto-dismiss toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: 'Test', duration: 1000 });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].open).toBe(true);

    act(() => {
      jest.advanceTimersByTime(1001);
    });

    expect(result.current.toasts[0].open).toBe(false);
  });

  it('should manual dismiss toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: 'Test' });
    });

    const id = result.current.toasts[0].id;

    act(() => {
      result.current.dismiss(id);
    });

    expect(result.current.toasts[0].open).toBe(false);
  });
});
