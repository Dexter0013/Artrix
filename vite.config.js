import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

import { resolve } from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  assetsInclude: ['**/*.riv'],
  // Relative base allows the site to work on web and in extension side panel
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        sidepanel: resolve(import.meta.dirname, 'sidepanel.html'),
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});

