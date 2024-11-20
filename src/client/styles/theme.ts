import { createTheme, ThemeOptions } from '@mui/material/styles';
import { PaletteMode } from '@mui/material';

// Material Design color palette options for accent colors
export const materialAccentColors = {
  red: {
    main: '#f44336',
    light: '#ff7961',
    dark: '#ba000d',
  },
  pink: {
    main: '#e91e63',
    light: '#ff6090',
    dark: '#b0003a',
  },
  purple: {
    main: '#9c27b0',
    light: '#d05ce3',
    dark: '#6a0080',
  },
  deepPurple: {
    main: '#673ab7',
    light: '#9a67ea',
    dark: '#320b86',
  },
  indigo: {
    main: '#3f51b5',
    light: '#757de8',
    dark: '#002984',
  },
  blue: {
    main: '#2196f3',
    light: '#6ec6ff',
    dark: '#0069c0',
  },
  lightBlue: {
    main: '#03a9f4',
    light: '#67daff',
    dark: '#007ac1',
  },
  cyan: {
    main: '#00bcd4',
    light: '#62efff',
    dark: '#008ba3',
  },
  teal: {
    main: '#009688',
    light: '#52c7b8',
    dark: '#00675b',
  },
  green: {
    main: '#4caf50',
    light: '#80e27e',
    dark: '#087f23',
  },
  orange: {
    main: '#ff9800',
    light: '#ffc947',
    dark: '#c66900',
  },
  deepOrange: {
    main: '#ff5722',
    light: '#ff8a50',
    dark: '#c41c00',
  },
} as const;

export type AccentColor = keyof typeof materialAccentColors;

// Function to get system color scheme
const getSystemTheme = (): PaletteMode => 
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

// Create theme with dynamic mode and accent color
export const createAppTheme = (
  mode: PaletteMode | 'system' = 'system',
  accentColor: AccentColor = 'blue'
) => {
  const actualMode = mode === 'system' ? getSystemTheme() : mode;
  
  const themeOptions: ThemeOptions = {
    palette: {
      mode: actualMode,
      primary: materialAccentColors[accentColor],
      secondary: {
        main: actualMode === 'dark' ? '#90caf9' : '#1976d2',
        light: actualMode === 'dark' ? '#e3f2fd' : '#42a5f5',
        dark: actualMode === 'dark' ? '#42a5f5' : '#1565c0',
      },
      error: {
        main: '#f44336',
        light: '#e57373',
        dark: '#d32f2f',
      },
      warning: {
        main: '#ffa726',
        light: '#ffb74d',
        dark: '#f57c00',
      },
      info: {
        main: '#29b6f6',
        light: '#4fc3f7',
        dark: '#0288d1',
      },
      success: {
        main: '#66bb6a',
        light: '#81c784',
        dark: '#388e3c',
      },
      background: {
        default: actualMode === 'dark' ? '#121212' : '#fafafa',
        paper: actualMode === 'dark' ? '#1e1e1e' : '#ffffff',
      },
    },
    typography: {
      fontFamily: 'var(--font-family-primary)',
      h1: {
        fontWeight: 500,
        fontSize: '2.5rem',
      },
      h2: {
        fontWeight: 500,
        fontSize: '2rem',
      },
      h3: {
        fontWeight: 500,
        fontSize: '1.75rem',
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.5,
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.43,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '@global': {
            '@import': [
              '@fontsource/noto-sans',
              '@fontsource/noto-sans-mono',
            ],
          },
          '@font-face': [
            {
              fontFamily: 'Noto Sans',
              fontStyle: 'normal',
              fontDisplay: 'swap',
              fontWeight: 400,
              src: `
                url('https://fonts.gstatic.com/s/notosans/v28/o-0IIpQlx3QUlC5A4PNr5TRA.woff2') format('woff2')
              `,
            },
            {
              fontFamily: 'Noto Sans Mono',
              fontStyle: 'normal',
              fontDisplay: 'swap',
              fontWeight: 400,
              src: `
                url('https://fonts.gstatic.com/s/notosansmono/v23/BngrUXNETWXI6LwhGYvaxZikqZqK6fBq6kPvUce2.woff2') format('woff2')
              `,
            },
          ],
          body: {
            fontFamily: 'Noto Sans, sans-serif',
            scrollbarColor: actualMode === 'dark' ? '#6b6b6b #2b2b2b' : '#959595 #f5f5f5',
            '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
              backgroundColor: actualMode === 'dark' ? '#2b2b2b' : '#f5f5f5',
              width: '8px',
              height: '8px',
            },
            '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
              borderRadius: 8,
              backgroundColor: actualMode === 'dark' ? '#6b6b6b' : '#959595',
              minHeight: 24,
            },
            '&::-webkit-scrollbar-thumb:focus, & *::-webkit-scrollbar-thumb:focus': {
              backgroundColor: actualMode === 'dark' ? '#959595' : '#6b6b6b',
            },
            '&::-webkit-scrollbar-thumb:active, & *::-webkit-scrollbar-thumb:active': {
              backgroundColor: actualMode === 'dark' ? '#959595' : '#6b6b6b',
            },
            '&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover': {
              backgroundColor: actualMode === 'dark' ? '#959595' : '#6b6b6b',
            },
          },
          '.terminal': {
            fontFamily: 'Noto Sans Mono, monospace !important',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none', // Prevents all-caps buttons
            fontWeight: 500,
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
        },
      },
      MuiTooltip: {
        defaultProps: {
          arrow: true,
        },
        styleOverrides: {
          tooltip: {
            fontSize: '0.875rem',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            background: actualMode === 'dark' ? '#1e1e1e' : '#ffffff',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            background: actualMode === 'dark' ? '#1e1e1e' : '#ffffff',
          },
        },
      },
      MuiListItem: {
        styleOverrides: {
          root: {
            '&.Mui-selected': {
              backgroundColor: `${materialAccentColors[accentColor].main}14`,
              '&:hover': {
                backgroundColor: `${materialAccentColors[accentColor].main}1f`,
              },
            },
          },
        },
      },
    },
  };

  return createTheme(themeOptions);
};

// Initial theme creation
export const theme = createAppTheme();

// Theme type export
export type AppTheme = typeof theme;
