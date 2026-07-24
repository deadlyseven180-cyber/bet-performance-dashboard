/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /**
         * Neutral ramp re-mapped to a near-black terminal palette. Overriding
         * `slate` rather than renaming means the whole app re-skins without
         * touching class names in components.
         */
        slate: {
          50: '#f6f7f8',
          100: '#eaecef',
          200: '#d5dade',
          300: '#aeb6bf',
          400: '#79838f',
          500: '#586371',
          600: '#3d4652',
          700: '#28303a',
          800: '#171d25',
          900: '#0f141a',
          950: '#070a0d',
        },
        /** Accent is gold, not the usual indigo — and never green/red, which
         *  are reserved for profit and loss. */
        brand: {
          50: '#fdf9e9',
          100: '#faefc2',
          200: '#f5df89',
          300: '#efcb4e',
          400: '#e8b923',
          500: '#d3a30f',
          600: '#ad800b',
          700: '#87620f',
          800: '#6d4e13',
          900: '#5c4215',
          950: '#352307',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      /** Hard, near-square corners — panels, not pills. */
      borderRadius: {
        DEFAULT: '3px',
        sm: '2px',
        md: '3px',
        lg: '4px',
        xl: '5px',
        '2xl': '6px',
        '3xl': '8px',
      },
      boxShadow: {
        card: 'none',
        'card-dark': 'none',
      },
      letterSpacing: {
        micro: '0.08em',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0', transform: 'translateY(4px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out both',
      },
    },
  },
  plugins: [],
};
