import { useEffect } from "react";
import type { ReactNode } from "react";

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  useEffect(() => {
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");
  }, []);

  return <>{children}</>;
}

// Keep export for backward compat
export function useTheme() {
  return { theme: "dark" as const, setTheme: () => {}, resolvedTheme: "dark" as const };
}
