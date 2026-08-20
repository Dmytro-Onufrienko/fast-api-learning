/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "../content/**/*.mdx",
  ],
  theme: {
    extend: {
      colors: {
        // A calm, low-chroma palette. This is a reference people keep open
        // on a second monitor next to their IDE — nothing here should
        // compete with their editor for attention.
        ink: {
          950: "#0b0d10",
          900: "#111418",
          850: "#161a1f",
          800: "#1c2127",
          700: "#272d35",
          600: "#3a424c",
          500: "#5a636f",
          400: "#8b95a1",
          300: "#b4bcc6",
          200: "#d5dae0",
          100: "#eceef1",
        },
        accent: {
          DEFAULT: "#5b9dd9",
          muted: "#3c6d99",
        },
        pass: "#4fa870",
        fail: "#d1596b",
        warn: "#c9a227",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: [
          "JetBrains Mono",
          "IBM Plex Mono",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      maxWidth: {
        prose: "72ch",
      },
    },
  },
  plugins: [],
};
