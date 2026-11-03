import { defineConfig } from 'vite';

// Relative base works on GitHub Pages (with trailing slash) and on
// rawcdn.githack / jsDelivr mirrors of the gh-pages branch — no admin needed.
export default defineConfig({
  base: './',
  server: {
    allowedHosts: true,
    host: true,
  },
  preview: {
    allowedHosts: true,
    host: true,
  },
});
