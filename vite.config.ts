// vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  root: '.',
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // This will expose to network for iPhone access
    headers: {
      'Cache-Control': 'public, max-age=31536000',
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
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: '/index.html'
      },
      external: [
        'nodemailer', // Server-side only
        'gapi-script', // Server-side only
        'emailjs-com', // Server-side only
        '@sapper/app' // Server-side only
      ],
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
      'leaflet-routing-machine',
      'jszip',
      'file-saver',
      'uuid',
      'firebase',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'firebase/storage'
    ],
    exclude: [
      'nodemailer', // Server-side only
      'gapi-script', // Server-side only
      'emailjs-com', // Server-side only
      '@sapper/app' // Server-side only
    ]
  },
  resolve: {
    alias: {
      '@': '/src'
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx']
  }
});