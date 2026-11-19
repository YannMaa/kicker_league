/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        felt: { DEFAULT: '#1f7a3a', dark: '#155c2b', light: '#2a9147' },
        wood: { DEFAULT: '#8b5a2b', dark: '#5e3a17', light: '#b07a43' },
        'team-black': '#111827',
        'team-white': '#f8fafc',
        chalk: '#f8fafc',
        steel: '#cbd5e1',
      },
      fontFamily: {
        score: ['"Bebas Neue"', 'Impact', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
