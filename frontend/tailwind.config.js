/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        clinical: {
          teal:  "#3D9DA8",   // muted teal — accent / interactive
          teal2: "#E5F4F6",   // very light teal — hover / active bg
          sage:  "#5F9EA0",   // deeper sage — active tab text
          mint:  "#EAF7F8",   // lightest teal — card tints
          warm:  "#F6F8FA",   // near-white page bg
          card:  "#FFFFFF",   // card surfaces
          border:"#D8E4E8",   // card borders
        },
      },
    },
  },
  plugins: [],
};
