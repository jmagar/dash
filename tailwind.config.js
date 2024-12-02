/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{css,scss}",
    "./public/index.html"
  ],
  darkMode: ['class', '(prefers-color-scheme: dark)'],
  future: {
    hoverOnlyWhenSupported: true,
    respectDefaultRingColorOpacity: true,
    disableColorOpacityUtilitiesByDefault: true,
  },
  theme: {
    extend: {
      fontFamily: {
        sans: ['Noto Sans', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['Noto Sans Mono', 'Courier New', 'monospace'],
      },
      colors: {
        primary: {
          DEFAULT: '#1976d2',
          dark: '#90caf9',
          50: '#e3f2fd',
          100: '#bbdefb',
          200: '#90caf9',
          300: '#64b5f6',
          400: '#42a5f5',
          500: '#1976d2',
          600: '#1565c0',
          700: '#0d47a1',
          800: '#0a2472',
          900: '#061747',
        },
        secondary: {
          DEFAULT: '#dc004e',
          50: '#fce4ec',
          100: '#f8bbd0',
          200: '#f48fb1',
          300: '#f06292',
          400: '#ec407a',
          500: '#dc004e',
          600: '#c2185b',
          700: '#ad1457',
          800: '#880e4f',
          900: '#5c0734',
        },
        background: {
          light: '#ffffff',
          dark: '#121212',
        },
        surface: {
          light: '#f5f5f5',
          dark: '#1e1e1e',
        },
      },
      spacing: {
        '128': '32rem',
        '144': '36rem',
      },
      screens: {
        '3xl': '1920px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-in': 'slideIn 0.5s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),
  ],
  corePlugins: {
    preflight: true,
    container: false,
  },
}
