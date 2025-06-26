// vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // ✅ Ensures routing works correctly on Netlify
  server: {
    port: 5173, // Optional: You can change the dev port if needed
  },
  build: {
    outDir: 'dist', // Default output folder for Netlify
  },
});