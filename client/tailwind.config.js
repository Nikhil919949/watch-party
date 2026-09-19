/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        sans: ["'Inter'", "sans-serif"],
      },
      colors: {
        reel: {
          100: "#E7E9EE",
          200: "#C9CDD8",
          950: "#0A0C10",
          900: "#0E1117",
          800: "#151923",
          700: "#1D2330",
          600: "#2A3142",
          500: "#3B4459",
          400: "#5A6478",
        },
        marquee: {
          400: "#F3CA80",
          500: "#EFB65A",
          600: "#D89A38",
        },
        signal: {
          live: "#4FD1A5",
          warn: "#F2994A",
          danger: "#E5484D",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(239,182,90,0.15), 0 12px 32px -12px rgba(239,182,90,0.25)",
      },
    },
  },
  plugins: [],
};
