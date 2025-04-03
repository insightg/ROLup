import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Percorso base per il deployment su rol.insightg.eu
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    rollupOptions: {
      external: [
        'three/examples/jsm/exporters/ColladaExporter.js',
        'three/examples/jsm/exporters/OBJExporter.js',
        'three/examples/jsm/exporters/GLTFExporter.js'
      ],
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', '@mui/material', '@emotion/react', '@emotion/styled', 'three'],
          'dashboard': ['./src/components/modules/POSDashboard'],
          // Organizza altri chunck per moduli aggiuntivi
        }
      }
    }
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 3000,
    host: true,
    strictPort: true,
    allowedHosts: ['localhost', '212.227.58.58', 'rol.insightg.eu', '*.insightg.eu']
  }
});
