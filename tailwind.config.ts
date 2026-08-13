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
        "primary-foreground": "rgb(var(--ns-primary-foreground) / <alpha-value>)",
        secondary: "rgb(var(--ns-secondary) / <alpha-value>)",
        success: "rgb(var(--ns-success) / <alpha-value>)",
        warning: "rgb(var(--ns-warning) / <alpha-value>)",
        error: "rgb(var(--ns-error) / <alpha-value>)",
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "16px",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
