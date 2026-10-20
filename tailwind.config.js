/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: '#123B2A',
          deep: '#0B2419',
          light: '#1B523B',
          glow: 'rgba(18, 59, 42, 0.4)'
        },
        charcoal: {
          DEFAULT: '#151916',
          dark: '#0D100E',
          card: '#1C221E',
          border: '#28312B',
          light: '#313C34'
        },
        ivory: {
          DEFAULT: '#F7F5EF',
          muted: '#E9E6DB',
          dark: '#D1CDC1'
        },
        sage: {
          DEFAULT: '#A9B7A0',
          light: '#C7D3C0',
          dark: '#7D8E73'
        },
        olive: {
          DEFAULT: '#687B4B',
          light: '#889E65',
          dark: '#4D5D35'
        },
        lime: {
          DEFAULT: '#D8F078',
          accent: '#E4F88D',
          hover: '#C4DE5E',
          dark: '#A6C239'
        }
      },
      fontFamily: {
        serif: ['"DM Serif Display"', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['"Manrope"', '"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      boxShadow: {
        'glow-lime': '0 0 25px rgba(216, 240, 120, 0.25)',
        'glow-forest': '0 0 35px rgba(18, 59, 42, 0.35)',
        'card-dark': '0 10px 30px -10px rgba(0, 0, 0, 0.5), 0 0 1px 1px rgba(255, 255, 255, 0.05)',
        'card-hover': '0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 1px 1px rgba(216, 240, 120, 0.2)'
      },
      animation: {
        'float-slow': 'float 6s ease-in-out infinite',
        'pulse-subtle': 'pulseSubtle 3s ease-in-out infinite',
        'glow': 'glow 4s ease-in-out infinite'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        glow: {
          '0%, 100%': { filter: 'drop-shadow(0 0 15px rgba(216, 240, 120, 0.3))' },
          '50%': { filter: 'drop-shadow(0 0 25px rgba(216, 240, 120, 0.6))' },
        }
      }
    },
  },
  plugins: [],
}
