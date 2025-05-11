import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['@tensorflow/tfjs']
  },
  preview: {
    port: 4173,
    host: true,
    strictPort: true
  },
  server: {
    host: true,
    strictPort: true,
    watch: {
      usePolling: true
    }
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'tensorflow': ['@tensorflow/tfjs'],
          'visualization': ['recharts', 'mapbox-gl', 'react-map-gl']
        }
      }
    }
  }
});