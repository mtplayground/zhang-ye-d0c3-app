import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
          'Apple Color Emoji',
          'Segoe UI Emoji',
        ],
      },
      boxShadow: {
        stage: '0 28px 80px rgba(15, 23, 42, 0.14)',
      },
    },
  },
  plugins: [],
} satisfies Config;
