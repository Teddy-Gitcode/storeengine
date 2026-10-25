import type { Config } from 'tailwindcss';

/**
 * Sellzy design tokens — exact palette lifted from the template's compiled
 * bundle (oops9/app/globals.css `--color-*`). Registering them here lets
 * component markup use the template's own class names 1:1
 * (`bg-primary-darker`, `text-warning-light`, `size-5.5`, …).
 */
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#088178',
          dark: '#056d6e',
          darker: '#04535c',
          light: '#5ed9ba',
          lighter: 'rgb(var(--c-primary-lighter) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: '#3366ff',
          dark: '#1939b7',
          lighter: 'rgb(var(--c-secondary-lighter) / <alpha-value>)',
        },
        success: {
          DEFAULT: '#54d62c',
          dark: '#229a16',
          lighter: 'rgb(var(--c-success-lighter) / <alpha-value>)',
        },
        warning: {
          DEFAULT: '#ffc107',
          light: '#ffe16a',
          dark: '#b78103',
          lighter: 'rgb(var(--c-warning-lighter) / <alpha-value>)',
        },
        error: {
          DEFAULT: '#cb0233',
          dark: '#ae013c',
          light: '#ef6168',
          lighter: 'rgb(var(--c-error-lighter) / <alpha-value>)',
        },
        info: {
          DEFAULT: '#1890ff',
          dark: '#0c53b7',
          lighter: 'rgb(var(--c-info-lighter) / <alpha-value>)',
        },
        /* Sellzy neutral scale (Minimal-UI greys), driven by the --c-*
           channels in globals.css so the whole scale follows the theme.
           <alpha-value> keeps the opacity modifiers working, which matters:
           `border-gray-500/20` is the app's most common hairline. */
        gray: {
          50: 'rgb(var(--c-gray-50) / <alpha-value>)',
          100: 'rgb(var(--c-gray-100) / <alpha-value>)',
          200: 'rgb(var(--c-gray-200) / <alpha-value>)',
          300: 'rgb(var(--c-gray-300) / <alpha-value>)',
          400: 'rgb(var(--c-gray-400) / <alpha-value>)',
          500: 'rgb(var(--c-gray-500) / <alpha-value>)',
          600: 'rgb(var(--c-gray-600) / <alpha-value>)',
          700: 'rgb(var(--c-gray-700) / <alpha-value>)',
          800: 'rgb(var(--c-gray-800) / <alpha-value>)',
          900: 'rgb(var(--c-gray-900) / <alpha-value>)',
        },
        /* The card ground. `bg-white` was the literal used for it, which is
           why cards stayed white on a dark page — a card is a surface, not
           the colour white, and only one of those should follow the theme. */
        surface: {
          DEFAULT: 'rgb(var(--c-surface) / <alpha-value>)',
          2: 'rgb(var(--c-surface-2) / <alpha-value>)',
        },
        // Text tokens
        light: {
          'primary-text': 'rgb(var(--c-text-primary) / <alpha-value>)',
          'secondary-text': 'rgb(var(--c-text-secondary) / <alpha-value>)',
          'disabled-text': 'rgb(var(--c-text-disabled) / <alpha-value>)',
        },
        dark: {
          'disabled-text': '#637381',
        },
        /* Pastel accents (stat-card fills), pre-composited at the 60% over
           white that every tile actually rendered. They were written as
           `bg-accent-N/60`, which is fine over a white card and turns to mud
           over a dark one — the alpha composites against whatever is behind.
           Solid keeps the tiles vivid in both themes, and vivid is the point:
           they are the one part of the page that is deliberately not a
           surface, which is why the text on them stays dark either way. */
        accent: {
          1: '#c6eeec',
          2: '#fff3a5',
          3: '#ffd9bd',
          4: '#ffe6f5',
          5: '#bed7f9',
          6: '#fcd497',
          7: '#c5f1aa',
        },
        teal: {
          500: '#00baa7',
          700: '#00776e',
          800: '#005f5a',
        },
      },
      // Minimal-UI's z24 elevation, the shadow the template's listbox panels
      // and popovers use. Same values as --shadow-pop in globals.css.
      boxShadow: {
        'light-z-24': '0 0 2px 0 rgba(145,158,171,0.24), 0 20px 40px -4px rgba(145,158,171,0.24)',
      },
      spacing: {
        '5.5': '1.375rem',
      },
      fontFamily: {
        // Default matches the Sellzy template (system-ui); the three branded
        // families are applied selectively via `font-public-sans` / `font-dm-sans`
        // / `font-urbanist`, exactly like the template markup.
        sans: ['ui-sans-serif', 'system-ui', 'sans-serif', 'Apple Color Emoji', 'Segoe UI Emoji'],
        'public-sans': ['var(--font-public-sans)', 'Public Sans', 'system-ui', 'sans-serif'],
        'dm-sans': ['var(--font-dm-sans)', 'DM Sans', 'sans-serif'],
        urbanist: ['var(--font-urbanist)', 'Urbanist', 'sans-serif'],
        // legacy aliases kept for un-migrated .ak-*/.ms-* markup
        numeric: ['var(--font-dm-sans)', 'DM Sans', 'sans-serif'],
        display: ['var(--font-urbanist)', 'Urbanist', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
        ctl: '8px',
      },
    },
  },
  plugins: [],
} satisfies Config;
