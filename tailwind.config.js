/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{css,scss}",
    "./public/index.html"
  ],
  darkMode: 'class',
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
        },
        secondary: '#dc004e',
        background: {
          light: '#f4f4f4',
          dark: '#121212',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
