import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#151312",
        panel: "#ffffff",
        surface: "#f6f5f3",
        border: "#e6e3de",
        muted: "#7a746c",
        accent: "#f47a00",
        accent2: "#f3c64d",
        danger: "#e35555",
        success: "#2fae6b"
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
