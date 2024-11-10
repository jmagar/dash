import React, { createContext, useContext, useState, useCallback } from 'react';

import { APP_CONFIG, type ThemeMode } from '../config';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface Props {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: Props): JSX.Element {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem(APP_CONFIG.theme.storageKey);
    if (savedMode && (savedMode === 'light' || savedMode === 'dark')) {
      return savedMode === 'dark';
    }
    return APP_CONFIG.theme.defaultMode === 'dark';
  });

  const toggleTheme = useCallback(() => {
    setIsDarkMode((prev) => {
      const newMode = !prev;
      const themeMode: ThemeMode = newMode ? 'dark' : 'light';
      localStorage.setItem(APP_CONFIG.theme.storageKey, themeMode);
      return newMode;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
