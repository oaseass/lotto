import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          gold:         '#E8B84B',
          'gold-light': '#F5D07A',
          'gold-dark':  '#C9902A',
          'gold-dim':   'rgba(232,184,75,0.15)',
          surface:      '#111111',
          'surface-2':  '#1A1A1A',
          'surface-3':  '#222222',
          border:       'rgba(255,255,255,0.07)',
          // 하위 호환
          dark:          '#0A0A0A',
          'dark-card':   '#1A1A1A',
          'dark-surface':'#111111',
          'dark-border': 'rgba(255,255,255,0.07)',
        },
        ohaeng: {
          mok:  '#7DDA58',
          hwa:  '#FF6B6B',
          to:   '#F5A623',
          geum: '#A8A8A8',
          su:   '#5BB8FF',
        },
      },
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-gold': 'linear-gradient(135deg, #E8B84B 0%, #C9902A 100%)',
        'gradient-dark': 'linear-gradient(180deg, #0A0A0A 0%, #111111 100%)',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      animation: {
        'spin-slow':   'spin 3s linear infinite',
        'pulse-gold':  'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in-up':  'fadeInUp 0.35s ease-out forwards',
      },
      boxShadow: {
        gold:    '0 4px 20px rgba(232,184,75,0.25)',
        'gold-lg':'0 8px 40px rgba(232,184,75,0.2)',
        card:    '0 2px 16px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
}

export default config
