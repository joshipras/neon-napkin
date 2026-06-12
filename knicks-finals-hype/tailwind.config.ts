import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        knicks: {
          blue: "#006BB6",
          orange: "#F58426",
          navy: "#071B33",
          cream: "#FFF8EF",
        },
      },
      boxShadow: {
        glow: "0 0 40px rgba(245, 132, 38, 0.2)",
      },
      animation: {
        ticker: "ticker 18s linear infinite",
        pulseSoft: "pulseSoft 2s ease-in-out infinite",
        rise: "rise 420ms ease-out both",
      },
      keyframes: {
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: ".65", transform: "scale(.9)" },
        },
        rise: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
