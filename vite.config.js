import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  assetsInclude: ['**/*.riv'],
  // Relative base allows the site to work on https://dexter0013.github.io/Artrix/ or any subpath
  base: './',
  server: {
    port: 5173,
    open: true,
  },
});

