import { useState } from 'react';

interface ToastState {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
  open: boolean;
}

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastState['variant'];
  duration?: number;
}

let toastCount = 0;

/**
 * Hook for toast.
 *
 * @returns {{ toasts: ToastState[]; toast: (options: ToastOptions) => void; dismiss: (id: string) => void; }} The result of useToast.
 */
export function useToast() {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  /**
   * Toast.
   *
   * @param {ToastOptions} options - Function options.
   * @param {string | undefined} [options.title] - The title.
   * @param {string | undefined} [options.description] - The description.
   * @param {"default" | "destructive" | "success" | undefined} [options.variant] - The variant.
   * @param {number | undefined} [options.duration] - The duration.
   *
   * @returns {void} No return value.
   */
  const toast = (options: ToastOptions) => {
    const id = String(++toastCount);
    const newToast: ToastState = { id, open: true, ...options };

    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, open: false } : t)));
    }, options.duration ?? 4000);
  };

  /**
   * Dismiss.
   *
   * @param {string} id - The id.
   *
   * @returns {void} No return value.
   */
  const dismiss = (id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, open: false } : t)));
  };

  return { toasts, toast, dismiss };
}
