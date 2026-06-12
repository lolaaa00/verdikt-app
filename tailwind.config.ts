import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:           "#090909",
        surface:      "#111111",
        "surface-card":  "#151515",
        "surface-soft":  "#1B1B1B",
        "surface-raised": "#222222",
        lime: {
          DEFAULT: "#39FF14",
          hover:   "#52FF33",
          soft:    "rgba(57,255,20,0.08)",
        },
        accent:  "#22C55E",
        matrix:  "#00FF41",
        danger:  "#FF5252",
        gold:    "#F5C842",
        muted:   "#7A7A7A",
        secondary: "#B3B3B3",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      borderColor: {
        subtle:  "rgba(255,255,255,0.06)",
        default: "rgba(255,255,255,0.08)",
        active:  "rgba(57,255,20,0.18)",
      },
      boxShadow: {
        card:   "0 0 24px rgba(57,255,20,0.08)",
        button: "0 0 18px rgba(57,255,20,0.18)",
        lg:     "0 0 40px rgba(57,255,20,0.12)",
      },
      letterSpacing: {
        display: "-0.03em",
        badge:   "0.08em",
      },
      animation: {
        "pulse-lime": "pulseLime 2.5s cubic-bezier(0.4,0,0.6,1) infinite",
        ticker:       "ticker 40s linear infinite",
        "fade-in":    "fadeIn 0.3s ease forwards",
        "slide-up":   "slideUp 0.4s ease forwards",
      },
      keyframes: {
        pulseLime: {
          "0%,100%": { opacity: "1" },
          "50%":     { opacity: "0.5" },
        },
        ticker: {
          "0%":   { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        fadeIn:  { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: {
          from: { opacity: "0", transform: "translateY(14px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
