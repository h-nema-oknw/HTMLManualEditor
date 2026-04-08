/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--theme-primary)",
        "main-bg": "var(--theme-bg)",
        "accordion-bg": "var(--theme-accordion-bg)",
      }
    },
  },
  plugins: [],
}
