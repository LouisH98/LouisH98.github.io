import tailwindcss from '@tailwindcss/postcss';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
const basePath = (process.env.PAGES_BASE_PATH || '').replace(/\/$/, '');
export default defineConfig({
  base: `${basePath}/`,
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  css: { postcss: { plugins: [tailwindcss()] } },
  define: { __PAGES_BASE_PATH__: JSON.stringify(basePath) },
  server: { host: '127.0.0.1', port: 3000, strictPort: true, watch: { useFsEvents: false, usePolling: true } },
  build: { outDir: 'dist/client', emptyOutDir: true },
});
