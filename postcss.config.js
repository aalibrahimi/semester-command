/**
 * PostCSS pipeline. Job: run Tailwind then autoprefixer over
 * `src/styles/globals.css`. Called by Vite. Nothing else should live here.
 */
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
