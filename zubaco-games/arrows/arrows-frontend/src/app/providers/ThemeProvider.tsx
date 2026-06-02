import { useEffect } from "react";
import type { ReactNode } from "react";

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");
  }, []);

  return <>{children}</>;
}

export function useTheme() {
  return { theme: "dark" as const, setTheme: () => {}, resolvedTheme: "dark" as const };
}
