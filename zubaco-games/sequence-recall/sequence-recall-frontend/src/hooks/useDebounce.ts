import { useEffect, useState } from 'react';

/**
 * Hook for debounce.
 *
 * @param {T} value - The value.
 * @param {number} delay - The delay.
 *
 * @returns {T} The result of useDebounce.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
