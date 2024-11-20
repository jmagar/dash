import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import { preferencesClient } from '../api/preferences.client';
import { useAuth } from '../hooks/useAuth';
import { logger } from '../utils/logger';
import { CssBaseline } from '@mui/material';

export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentColor = string;

interface ThemeContextType {
  mode: ThemeMode;
  accentColor: AccentColor;
  setMode: (mode: ThemeMode) => void;
  setAccentColor: (color: AccentColor) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

const DEFAULT_MODE: ThemeMode = 'system';
const DEFAULT_ACCENT_COLOR: AccentColor = '#1976d2';

export function AppThemeProvider({ children }: ThemeProviderProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<ThemeMode>(DEFAULT_MODE);
  const [accentColor, setAccentColor] = useState<AccentColor>(DEFAULT_ACCENT_COLOR);
  const [loading, setLoading] = useState(true);

  // Load preferences from API when user is authenticated
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) {
        setMode(DEFAULT_MODE);
        setAccentColor(DEFAULT_ACCENT_COLOR);
        setLoading(false);
        return;
      }

      try {
        const preferences = await preferencesClient.getPreferences();
        if (preferences) {
          setMode((preferences.themeMode || DEFAULT_MODE) as ThemeMode);
          setAccentColor(preferences.accentColor || DEFAULT_ACCENT_COLOR);
        }
      } catch (error) {
        logger.error('Failed to load theme preferences:', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        setLoading(false);
      }
    };

    void loadPreferences();
  }, [user]);

  // Save preferences to API when they change
  const handleSetMode = async (newMode: ThemeMode) => {
    setMode(newMode);
    if (user) {
      try {
        await preferencesClient.updatePreferences({ themeMode: newMode });
      } catch (error) {
        logger.error('Failed to save theme mode:', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  };

  const handleSetAccentColor = async (newColor: AccentColor) => {
    setAccentColor(newColor);
    if (user) {
      try {
        await preferencesClient.updatePreferences({ accentColor: newColor });
      } catch (error) {
        logger.error('Failed to save accent color:', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  };

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: mode === 'system'
            ? window.matchMedia('(prefers-color-scheme: dark)').matches
              ? 'dark'
              : 'light'
            : mode,
          primary: {
            main: accentColor,
          },
        },
      }),
    [mode, accentColor]
  );

  if (loading) {
    return null; // Or a loading spinner
  }

  return (
    <ThemeContext.Provider
      value={{
        mode,
        accentColor,
        setMode: handleSetMode,
        setAccentColor: handleSetAccentColor,
      }}
    >
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
