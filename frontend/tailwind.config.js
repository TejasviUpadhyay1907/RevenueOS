/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        brand:    '#10b981',
        'brand-dim': '#0ea472',
        // Backgrounds
        base:     '#080f1a',
        surface:  '#0d1826',
        'surface-2': '#111d2e',
        elevated: '#152236',
        // Borders
        line:     '#1e2d3d',
        'line-2': '#253447',
        // Text
        primary:  '#f1f5f9',
        secondary:'#94a3b8',
        muted:    '#475569',
        // Accents
        success:  '#10b981',
        warning:  '#f59e0b',
        danger:   '#ef4444',
        info:     '#3b82f6',
        // CSS Variables for light/dark theme
        'c-base':       'var(--c-base)',
        'c-surface':    'var(--c-surface)',
        'c-elevated':   'var(--c-elevated)',
        'c-line':       'var(--c-line)',
        'c-line2':      'var(--c-line2)',
        'c-primary':    'var(--c-primary)',
        'c-secondary':  'var(--c-secondary)',
        'c-muted':      'var(--c-muted)',
        'c-faint':      'var(--c-faint)',
        'c-brand':      'var(--c-brand)',
        'c-brand-dim':  'var(--c-brand-dim)',
        'c-brand-bg':   'var(--c-brand-bg)',
        'c-brand-glow': 'var(--c-brand-glow)',
        'c-hover':      'var(--c-hover)',
        'c-active-bg':  'var(--c-active-bg)',
        'c-danger':     'var(--c-danger)',
        'c-warning':    'var(--c-warning)',
        'c-info':       'var(--c-info)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        sm:  '6px',
        md:  '10px',
        lg:  '14px',
        xl:  '18px',
        '2xl': '24px',
      },
      boxShadow: {
        card:  '0 0 0 1px rgba(30,45,61,1), 0 2px 8px rgba(0,0,0,0.4)',
        glow:  '0 0 24px rgba(16,185,129,0.12)',
        'glow-sm': '0 0 12px rgba(16,185,129,0.08)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
      },
    },
  },
  plugins: [],
}