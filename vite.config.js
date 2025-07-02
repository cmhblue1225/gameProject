import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  },
  server: {
    port: 3001,
    open: true,
    host: true
  },
  optimizeDeps: {
    include: ['three', 'cannon-es']
  }
});