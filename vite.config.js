import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.riv'],
  // Relative base allows the site to work on https://dexter0013.github.io/Artrix/ or any subpath
  base: './',
  server: {
    port: 5173,
    open: true,
  },
});

