/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{js,jsx,ts,tsx,html}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'app-bg': '#0d1117',
        'app-panel': '#161b22',
        'app-border': '#30363d',
        'app-accent': '#238636',
        'app-accent-hover': '#2ea043',
        'app-text': '#e6edf3',
        'app-text-secondary': '#8b949e',
        'app-text-muted': '#484f58',
        'app-danger': '#f85149',
        'app-warning': '#d29922',
        'app-info': '#58a6ff',
        'app-surface': '#1c2128',
        'app-overlay': 'rgba(0, 0, 0, 0.6)',
        'light-bg': '#ffffff',
        'light-panel': '#f6f8fa',
        'light-border': '#d0d7de',
        'light-text': '#1f2328',
        'light-text-secondary': '#656d76',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'Fira Code', 'Consolas', 'Monaco', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        '2xs': '0.625rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s infinite',
        'spin-slow': 'spin 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(35, 134, 54, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(35, 134, 54, 0.6)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
