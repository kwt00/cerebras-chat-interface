/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        accent: {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#ec4899',
          600: '#db2777',
          700: '#be185d',
          800: '#9d174d',
          900: '#831843',
        },
        dark: {
          950: '#000000',
          900: '#0a0a0f',
          800: '#111119',
          700: '#18181f',
          600: '#222229',
          500: '#2c2c35',
          400: '#3c3c47',
          300: '#505059',
          200: '#71717a',
          100: '#a1a1aa',
          50: '#d4d4d8',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-in': 'slideIn 0.2s ease forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glowPulse 2s infinite',
      },
      keyframes: {
        fadeIn: {
          'from': { opacity: 0 },
          'to': { opacity: 1 },
        },
        slideIn: {
          'from': { transform: 'translateY(5px)', opacity: 0 },
          'to': { transform: 'translateY(0)', opacity: 1 },
        },
        glowPulse: {
          '0%': { boxShadow: '0 0 0px rgba(124, 58, 237, 0.5)' },
          '50%': { boxShadow: '0 0 10px rgba(124, 58, 237, 0.8)' },
          '100%': { boxShadow: '0 0 0px rgba(124, 58, 237, 0.5)' },
        },
      },
      borderWidth: {
        '1': '1px',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'SF Mono', 'Roboto Mono', 'monospace'],
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            color: theme('colors.dark.50'),
            fontFamily: theme('fontFamily.mono'),
            a: { color: theme('colors.primary.500') },
            'h1, h2, h3, h4': { color: theme('colors.white') },
            code: { color: theme('colors.accent.400') },
            pre: { backgroundColor: theme('colors.dark.900'), borderRadius: '0' },
            hr: { borderColor: theme('colors.dark.600') },
            strong: { color: theme('colors.white') },
            blockquote: { 
              color: theme('colors.dark.100'),
              borderLeftColor: theme('colors.primary.600'),
            },
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
