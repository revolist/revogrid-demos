import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  cacheDir: './.vite',
  server: {
    proxy: { '/api/pivot': 'http://localhost:4174', '/api/health': 'http://localhost:4174' },
  },
});
