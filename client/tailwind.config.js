/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eef8ff',
          100: '#d9efff',
          200: '#bce2ff',
          300: '#8ed0ff',
          400: '#59b4ff',
          500: '#3293fa',
          600: '#1b74ef',
          700: '#145cdb',
          800: '#164bb1',
          900: '#17418c',
        },
      },
    },
  },
  plugins: [],
};
