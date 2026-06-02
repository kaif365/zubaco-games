import { useCallback } from 'react';

type Theme = 'dark' | 'light' | 'system';

const THEME_KEY = 'zubaco_theme';

function resolve(theme: Theme): 'dark' | 'light' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

export function useTheme() {
  const setTheme = useCallback((theme: Theme) => {
    const resolved = resolve(theme);
    localStorage.setItem(THEME_KEY, theme);
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(resolved);
  }, []);

  return { setTheme };
}
