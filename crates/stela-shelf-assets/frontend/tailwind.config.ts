import type { Config } from 'tailwindcss';

export default {
  content: ['./frontend/templates/**/*.html', './frontend/src/**/*.ts'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      bg: 'var(--bg)',
      surface: 'var(--surface)',
      'surface-subtle': 'var(--surface-subtle)',
      border: 'var(--border)',
      'border-subtle': 'var(--border-subtle)',
      text: 'var(--text)',
      'text-muted': 'var(--text-muted)',
      link: 'var(--link)',
      'link-visited': 'var(--link-visited)',
      unresolved: 'var(--unresolved)',
      'stela-accent': 'var(--stela-accent)',
    },
  },
  corePlugins: {
    preflight: false,
    container: false,
  },
  plugins: [],
} satisfies Config;
