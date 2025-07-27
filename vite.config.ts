// vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // This will expose to network for iPhone access
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5001/vostcard-a3b71/us-central1/generateScript',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/generate-script/, '')
      }
    }
  },
  build: {
    rollupOptions: {
      external: [],
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          icons: ['react-icons']
        }
      }
    }
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'react-icons',
      'leaflet',
      'react-leaflet',
      'jszip',
      'file-saver',
      'uuid'
    ]
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});