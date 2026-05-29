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

export function useToast() {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const toast = (options: ToastOptions) => {
    const id = String(++toastCount);
    const newToast: ToastState = { id, open: true, ...options };

    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, open: false } : t)));
    }, options.duration ?? 4000);
  };

  const dismiss = (id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, open: false } : t)));
  };

  return { toasts, toast, dismiss };
}
