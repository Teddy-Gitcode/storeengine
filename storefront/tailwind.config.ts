import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  // `dark:` variants follow our explicit data-theme attribute (opt-in dark),
  // not the OS preference.
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Brand palette comes from StoreSettings via CSS variables injected
        // by the root layout (RGB triplets so alpha utilities keep working).
        brand: {
          DEFAULT: "rgb(var(--brand) / <alpha-value>)",
          dark: "rgb(var(--brand-dark) / <alpha-value>)",
          50: "rgb(var(--brand) / 0.08)"
        },
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          dark: "rgb(var(--accent-dark) / <alpha-value>)"
        },
        // Readable foreground on the brand color (SS-1): a token so a light
        // merchant brand color can carry dark text instead of white.
        "on-brand": "rgb(var(--on-brand) / <alpha-value>)",
        danger: {
          DEFAULT: "rgb(var(--danger) / <alpha-value>)",
          dark: "rgb(var(--danger-dark) / <alpha-value>)"
        },
        surface: {
          DEFAULT: "rgb(var(--surface) / <alpha-value>)",
          alt: "rgb(var(--surface-alt) / <alpha-value>)"
        },
        ink: {
          DEFAULT: "rgb(var(--ink) / <alpha-value>)",
          muted: "rgb(var(--ink-muted) / <alpha-value>)",
          faint: "rgb(var(--ink-faint) / <alpha-value>)"
        },
        // Neutral for borders/dividers — flips black→white in dark via alpha.
        line: "rgb(var(--line) / <alpha-value>)",
        bg: "rgb(var(--bg) / <alpha-value>)",
        // The Shoppe blob: the brand washed out to a pastel — behind a page
        // heading, in count pills and the countdown tiles.
        blob: "rgb(var(--brand) / 0.13)"
      },
      fontFamily: {
        // Both families are self-hosted by next/font (see app/layout.tsx),
        // which supplies these variables along with a metric-matched fallback.
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"]
      },
      maxWidth: { container: "1200px" },
      boxShadow: {
        // Shoppe's soft drop under cards and framed photos.
        card: "0 5px 12px rgba(0,0,0,0.08)",
        photo: "0 5px 10px rgba(0,0,0,0.10)",
        cardHover: "0 12px 26px -8px rgba(0,0,0,0.18)"
      }
    }
  },
  plugins: []
};

export default config;
