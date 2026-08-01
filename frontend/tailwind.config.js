/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1F2A44',
        'ink-soft': '#4A5470',
        paper: '#EDEFEF',
        'paper-raised': '#FFFFFF',
        brass: '#B8892B',
        'brass-soft': '#D9B968',
        sage: '#4B6455',
        'sage-bg': '#E4EAE4',
        brick: '#A23B34',
        'brick-bg': '#F3E6E4',
        rule: '#D3D6D2',
      },
      fontFamily: {
        display: ['Newsreader', 'Georgia', 'serif'],
        body: ['Inter', '-apple-system', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '3px',
        sm: '2px',
        md: '4px',
        lg: '6px',
        // no radius value in this app should exceed 6px — do not use Tailwind's
        // default 'xl'/'2xl'/'full' radius scale anywhere except perfect circles
        // (the match seal), which uses rounded-full intentionally
      },
      boxShadow: {
        none: 'none',
        // this design uses flat surfaces + hairline borders, not elevation shadows.
        // do not introduce shadow-md/shadow-lg on cards or rows.
      },
      keyframes: {
        rowIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        sealStamp: {
          '0%': { transform: 'scale(1.4) rotate(-3deg)', opacity: '0' },
          '100%': { transform: 'scale(1) rotate(-3deg)', opacity: '1' },
        },
      },
      animation: {
        rowIn: 'rowIn 0.5s ease forwards',
        sealStamp: 'sealStamp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      },
    },
  },
  plugins: [],
};
