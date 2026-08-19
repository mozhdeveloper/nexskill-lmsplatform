import type { Config } from "tailwindcss";

// Semantic design tokens (spec §58) — components consume these names,
// never raw hex values, so theming/rebranding is a one-file change.
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--ns-background) / <alpha-value>)",
        surface: "rgb(var(--ns-surface) / <alpha-value>)",
        "surface-raised": "rgb(var(--ns-surface-raised) / <alpha-value>)",
        border: "rgb(var(--ns-border) / <alpha-value>)",
        foreground: "rgb(var(--ns-foreground) / <alpha-value>)",
        muted: "rgb(var(--ns-muted) / <alpha-value>)",
        primary: "rgb(var(--ns-primary) / <alpha-value>)",
        "primary-hover": "rgb(var(--ns-primary-hover) / <alpha-value>)",
        "primary-foreground": "rgb(var(--ns-primary-foreground) / <alpha-value>)",
        secondary: "rgb(var(--ns-secondary) / <alpha-value>)",
        accent: "rgb(var(--ns-accent) / <alpha-value>)",
        ring: "rgb(var(--ns-ring) / <alpha-value>)",
        success: "rgb(var(--ns-success) / <alpha-value>)",
        warning: "rgb(var(--ns-warning) / <alpha-value>)",
        error: "rgb(var(--ns-error) / <alpha-value>)",
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "16px",
        xl: "22px",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      transitionTimingFunction: {
        soft: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      boxShadow: {
        soft: "0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px -8px rgb(0 0 0 / 0.08)",
        "soft-lg": "0 4px 12px rgb(0 0 0 / 0.06), 0 24px 48px -12px rgb(0 0 0 / 0.16)",
      },
    },
  },
  plugins: [],
};

export default config;
