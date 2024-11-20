import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeProvider as MuiThemeProvider, PaletteMode } from '@mui/material';
import { createAppTheme, AccentColor } from '../styles/theme';
import { CssBaseline } from '@mui/material';

interface ThemeContextType {
  mode: PaletteMode | 'system';
  setMode: (mode: PaletteMode | 'system') => void;
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'system',
  setMode: () => {},
  accentColor: 'blue',
  setAccentColor: () => {},
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: React.ReactNode;
}

const THEME_MODE_KEY = 'app-theme-mode';
const ACCENT_COLOR_KEY = 'app-accent-color';

export const AppThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Initialize state from localStorage or defaults
  const [mode, setMode] = useState<PaletteMode | 'system'>(() => {
    const savedMode = localStorage.getItem(THEME_MODE_KEY);
    return (savedMode as PaletteMode | 'system') || 'system';
  });

  const [accentColor, setAccentColor] = useState<AccentColor>(() => {
    const savedColor = localStorage.getItem(ACCENT_COLOR_KEY);
    return (savedColor as AccentColor) || 'blue';
  });

  // Create theme based on current mode and accent color
  const theme = React.useMemo(
    () => createAppTheme(mode, accentColor),
    [mode, accentColor]
  );

  // Persist theme preferences
  useEffect(() => {
    localStorage.setItem(THEME_MODE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem(ACCENT_COLOR_KEY, accentColor);
  }, [accentColor]);

  // Listen for system theme changes if in system mode
  useEffect(() => {
    if (mode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      // Force theme recreation by updating state
      setMode('system');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mode]);

  const contextValue = React.useMemo(
    () => ({
      mode,
      setMode,
      accentColor,
      setAccentColor,
    }),
    [mode, accentColor]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
