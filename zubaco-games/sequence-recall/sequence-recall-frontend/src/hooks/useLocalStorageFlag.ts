import { useEffect, useState } from 'react';

/**
 * Hook for local storage flag.
 *
 * @param {string} key - The key.
 * @param {boolean} defaultValue - The default value.
 *
 * @returns {readonly [boolean, Dispatch<SetStateAction<boolean>>]} The result of useLocalStorageFlag.
 */
export function useLocalStorageFlag(key: string, defaultValue: boolean) {
  const [value, setValue] = useState<boolean>(() => {
    const stored = localStorage.getItem(key);
    if (stored === null) return defaultValue;
    return stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem(key, String(value));
  }, [key, value]);

  return [value, setValue] as const;
}
