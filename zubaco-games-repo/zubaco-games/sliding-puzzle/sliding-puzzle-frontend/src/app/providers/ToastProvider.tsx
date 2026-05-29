import { ToastProvider as RadixToastProvider, ToastViewport } from '@radix-ui/react-toast';
import type { ReactNode } from 'react';

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  return (
    <RadixToastProvider swipeDirection="right">
      {children}
      <ToastViewport className="fixed bottom-4 right-4 z-50 flex max-h-screen w-full max-w-sm flex-col gap-2 p-4" />
    </RadixToastProvider>
  );
}
