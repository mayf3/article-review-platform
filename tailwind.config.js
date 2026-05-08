/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/client/**/*.{html,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172026",
        panel: "#f6f7f9",
        line: "#dfe4ea",
        accent: "#1f7a8c"
      },
      boxShadow: {
        soft: "0 12px 36px rgba(23, 32, 38, 0.08)"
      }
    }
  },
  plugins: []
};
