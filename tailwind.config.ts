import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#3563E9",
          dark: "#2850CD",
          soft: "#EAF1FF"
        },
        app: {
          bg: "#F7F9FF",
          line: "#DCE5F2",
          primary: "#3563E9",
          "primary-dark": "#2850CD",
          soft: "#EAF1FF",
          success: "#22C55E",
          warning: "#F59E0B",
          danger: "#EF4444"
        }
      }
    }
  },
  plugins: []
};

export default config;