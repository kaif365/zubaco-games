import { useEffect, useState } from 'react';

interface UseNetworkStatusReturn {
  isOnline: boolean;
}

/**
 * Hook for network status.
 *
 * @returns {UseNetworkStatusReturn} The result of useNetworkStatus.
 */
export function useNetworkStatus(): UseNetworkStatusReturn {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.navigator.onLine;
  });

  useEffect(() => {
    /**
     * Handles online.
     *
     * @returns {void} No return value.
     */
    const handleOnline = () => {
      setIsOnline(true);
    };

    /**
     * Handles offline.
     *
     * @returns {void} No return value.
     */
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
}
