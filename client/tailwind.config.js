/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff', 100: '#d9e6ff', 200: '#bcd2ff', 300: '#8eb4ff',
          400: '#598aff', 500: '#3b63f6', 600: '#2544eb', 700: '#1e34d0',
          800: '#1f2fa8', 900: '#1f2e85', 950: '#171d4f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: { xl: '0.9rem', '2xl': '1.25rem' },
      boxShadow: {
        card: '0 1px 3px rgba(16,24,40,0.06), 0 1px 2px rgba(16,24,40,0.04)',
        'card-dark': '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.35s ease-out both',
      },
    },
  },
  plugins: [],
};
