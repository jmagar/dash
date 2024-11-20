import { useState, useEffect, useCallback } from 'react';
import { PaletteMode } from '@mui/material';
import { AccentColor, materialAccentColors } from '../styles/theme';

export type Theme = PaletteMode | 'system';

const THEME_MODE_KEY = 'theme-mode';
const ACCENT_COLOR_KEY = 'theme-accent-color';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem(THEME_MODE_KEY) as Theme | null;
    return savedTheme || 'system';
  });

  const [accentColor, setAccentColor] = useState<AccentColor>(() => {
    const savedColor = localStorage.getItem(ACCENT_COLOR_KEY) as AccentColor | null;
    return savedColor || 'blue';
  });

  const getEffectiveTheme = useCallback((): PaletteMode => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    const effectiveTheme = getEffectiveTheme();

    root.classList.remove('light', 'dark');
    root.classList.add(effectiveTheme);
    localStorage.setItem(THEME_MODE_KEY, theme);

    // Update CSS variables for the accent color
    Object.entries(materialAccentColors[accentColor]).forEach(([key, value]) => {
      root.style.setProperty(`--accent-${key}`, value);
    });
    localStorage.setItem(ACCENT_COLOR_KEY, accentColor);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        root.classList.remove('light', 'dark');
        root.classList.add(getEffectiveTheme());
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, accentColor, getEffectiveTheme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      switch (prev) {
        case 'light':
          return 'dark';
        case 'dark':
          return 'system';
        case 'system':
          return 'light';
      }
    });
  }, []);

  return {
    theme,
    effectiveTheme: getEffectiveTheme(),
    accentColor,
    setTheme,
    setAccentColor,
    toggleTheme,
  };
}
