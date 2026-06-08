import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        sans:    ["var(--font-inter)", "system-ui", "sans-serif"],
        mono:    ["ui-monospace", "monospace"],
      },
      colors: {
        // ─── NEVO Brand Colors ───
        "nevo-white":   "#FFFFFF",
        "nevo-blush":   "#FFF0F0",
        "nevo-lavender":"#F5EEFF",
        "nevo-dark":    "#0E0D1A",
        "nevo-gray":    "#6B6B8A",
        "nevo-coral":   "#FF6B6B",
        "nevo-purple":  "#A259FF",
        "nevo-coral-dark":   "#E85555",
        "nevo-coral-light":  "#FFE8E8",
        "nevo-purple-dark":  "#8B3FFF",
        "nevo-purple-light": "#F0E6FF",
        "nevo-border":       "#EDEDED",
        "nevo-border-dark":  "#D4D4E0",
        // Legacy alias (usados en tailwind classes existentes)
        brass: {
          DEFAULT: "#FF6B6B",
          light:   "#FFE8E8",
          dark:    "#FFE8E8",
          muted:   "#E85555",
        },
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem", letterSpacing: "0.06em" }],
      },
      letterSpacing: {
        widest: "0.2em",
      },
      borderWidth: {
        "0.5": "0.5px",
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "16px",
        xl: "24px",
      },
      boxShadow: {
        sm:  "0 1px 3px rgba(14,13,26,0.06)",
        md:  "0 4px 12px rgba(14,13,26,0.08)",
        lg:  "0 8px 24px rgba(14,13,26,0.10)",
        purple: "0 4px 12px rgba(162,89,255,0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
