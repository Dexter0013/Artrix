import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  assetsInclude: ['**/*.riv'],
  // In development use '/', in production build use '/AI-Assisant/' for GitHub Pages
  base: mode === 'production' ? '/AI-Assisant/' : '/',
  server: {
    port: 5173,
    open: true,
  },
}));

