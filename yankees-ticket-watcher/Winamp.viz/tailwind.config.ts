import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "monospace"],
        mono: ["var(--font-mono)", "monospace"]
      },
      boxShadow: {
        glow: "0 0 32px rgba(59, 255, 72, 0.35)",
        hot: "0 0 42px rgba(255, 48, 194, 0.34)"
      }
    }
  },
  plugins: []
};

export default config;
