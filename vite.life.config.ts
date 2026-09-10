import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: 'client',
  build: { outDir: '../dist-life', emptyOutDir: true, rollupOptions: { input: resolve('client/life.html') } },
  server: { host: '127.0.0.1', port: 5175, strictPort: true, proxy: { '/api/life': 'http://127.0.0.1:8791' } },
});
