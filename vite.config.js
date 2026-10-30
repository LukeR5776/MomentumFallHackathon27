import { defineConfig } from 'vite';

// Relative base so the static build works from any sub-path
// (GitHub Pages project sites, Netlify, or opening dist/ locally).
export default defineConfig({
  base: './',
});
