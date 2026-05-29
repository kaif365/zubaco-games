import type { ReactNode } from "react";

import { AudioProvider } from "@/audio/AudioProvider";
import { QueryProvider } from "./QueryProvider";
import { ThemeProvider } from "./ThemeProvider";
import { ToastProvider } from "./ToastProvider";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryProvider>
      <ThemeProvider>
        <AudioProvider>
          <ToastProvider>{children}</ToastProvider>
        </AudioProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}
