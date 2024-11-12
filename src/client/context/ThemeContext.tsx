import {
  ThemeProvider as MuiThemeProvider,
  createTheme,
  useMediaQuery,
} from '@mui/material';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleTheme: () => undefined,
  accentColor: '#2196f3',
  setAccentColor: () => undefined,
});

export const ACCENT_COLORS = {
  blue: '#2196f3',
  purple: '#9c27b0',
  pink: '#e91e63',
  teal: '#009688',
  green: '#4caf50',
  amber: '#ffc107',
  orange: '#ff9800',
  deepOrange: '#ff5722',
  indigo: '#3f51b5',
  cyan: '#00bcd4',
};

export function ThemeProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : prefersDarkMode;
  });

  const [accentColor, setAccentColor] = useState<string>(() => {
    const saved = localStorage.getItem('accentColor');
    return saved || ACCENT_COLORS.blue;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('accentColor', accentColor);
  }, [accentColor]);

  const toggleTheme = (): void => {
    setIsDarkMode((prev: boolean) => !prev);
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: isDarkMode ? 'dark' : 'light',
          primary: {
            main: accentColor,
          },
          background: {
            default: isDarkMode ? '#121212' : '#f5f5f5',
            paper: isDarkMode ? '#1e1e1e' : '#ffffff',
          },
        },
        components: {
          MuiAppBar: {
            styleOverrides: {
              root: {
                backgroundColor: isDarkMode ? '#1e1e1e' : accentColor,
              },
            },
          },
          MuiDrawer: {
            styleOverrides: {
              paper: {
                backgroundColor: isDarkMode ? '#121212' : '#ffffff',
                borderRight: `1px solid ${isDarkMode ? '#333' : '#e0e0e0'}`,
              },
            },
          },
        },
      }),
    [isDarkMode, accentColor],
  );

  const value = useMemo(
    () => ({
      isDarkMode,
      toggleTheme,
      accentColor,
      setAccentColor,
    }),
    [isDarkMode, accentColor],
  );

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
