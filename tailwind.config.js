/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Corporate Slate & Charcoal Canvas
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#090d16',
        },
        charcoal: {
          DEFAULT: '#12161f',
          surface: '#181d27',
          card: '#1f2430',
          border: '#2a3142',
        },
        // Subtle Solar Motifs: Soft Solar Gold & Refined Emerald
        solar: {
          gold: {
            50: '#fefce8',
            100: '#fef9c3',
            200: '#fef08a',
            300: '#fde047',
            400: '#facc15',
            500: '#eab308',
            600: '#ca8a04',
            DEFAULT: '#f59e0b', // Soft gold
            hover: '#d97706',
            glow: 'rgba(245, 158, 11, 0.18)',
          },
          emerald: {
            50: '#ecfdf5',
            100: '#d1fae5',
            200: '#a7f3d0',
            300: '#6ee7b7',
            400: '#34d399',
            500: '#10b981', // Refined emerald
            600: '#059669',
            DEFAULT: '#059669',
            glow: 'rgba(16, 185, 129, 0.18)',
          },
          lime: {
            DEFAULT: '#bef264',
            muted: '#84cc16',
          }
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        DEFAULT: '8px',
        md: '10px',
        lg: '12px',
        xl: '14px',
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        'soft-xs': '0 1px 2px 0 rgba(15, 23, 42, 0.04)',
        'soft-sm': '0 1px 3px 0 rgba(15, 23, 42, 0.08), 0 1px 2px -1px rgba(15, 23, 42, 0.08)',
        'soft-md': '0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.06)',
        'soft-lg': '0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04)',
        'solar-soft': '0 4px 14px 0 rgba(245, 158, 11, 0.15)',
        'emerald-soft': '0 4px 14px 0 rgba(16, 185, 129, 0.15)',
        'glass-edge': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
      },
    },
  },
  plugins: [],
};
