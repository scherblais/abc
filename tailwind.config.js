/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        ink: {
          950: '#0b0d12',
          900: '#11141b',
          800: '#171b25',
          700: '#222837',
          500: '#6b7280',
        },
        accent: {
          DEFAULT: '#7c5cff',
          soft: '#a594ff',
        },
      },
    },
  },
  plugins: [],
};
