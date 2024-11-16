import { useCallback } from 'react';
import { useTheme } from './useTheme';

type ThemeMode = 'light' | 'dark' | 'system';

export function useThemeMode() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, [setTheme]);

  const setMode = useCallback((mode: ThemeMode) => {
    if (mode === 'system') {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
      localStorage.setItem('themeMode', 'system');
    } else {
      setTheme(mode);
      localStorage.setItem('themeMode', mode);
    }
  }, [setTheme]);

  // Get the current mode (including system)
  const mode = localStorage.getItem('themeMode') as ThemeMode || 'system';

  return {
    mode,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    toggleTheme,
    setMode,
  };
}
