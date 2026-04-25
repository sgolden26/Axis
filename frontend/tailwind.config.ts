import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#070a0e",
          800: "#0b0f14",
          700: "#11161d",
          600: "#171d26",
          500: "#1f2730",
          400: "#2a333f",
          300: "#3a4554",
          200: "#6b7787",
          100: "#aab4c2",
          50: "#dde3ec",
        },
        faction: {
          nato: "#5aa9ff",
          ru: "#ff5a5a",
          neutral: "#d6a45a",
        },
        accent: {
          amber: "#d6a45a",
          danger: "#ff5a5a",
          ok: "#7ad492",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      letterSpacing: {
        wider2: "0.18em",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(90,169,255,0.5), 0 0 16px rgba(90,169,255,0.25)",
      },
    },
  },
  plugins: [],
} satisfies Config;
