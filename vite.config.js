import { defineConfig } from 'vite';

// GitHub Pages project site: https://luker5776.github.io/MomentumFallHackathon27/
// Absolute base so assets resolve with or without a trailing slash.
export default defineConfig({
  base: '/MomentumFallHackathon27/',
  server: {
    allowedHosts: true,
    host: true,
  },
  preview: {
    allowedHosts: true,
    host: true,
  },
});
