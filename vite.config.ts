import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // The only chunk above Vite's 500 kB default is the lazily loaded three.js
    // viewer with its tools and the picking BVH (fetched after a model was
    // analysed, ~175 kB gzip), so the limit is raised to it.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/react-router')) {
            return 'vendor-router';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          return undefined;
        },
      },
    },
  },
  worker: {
    // The geometry worker lazy-loads the STEP kernel (code splitting), which
    // requires ES module output; it is created with { type: 'module' }.
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
