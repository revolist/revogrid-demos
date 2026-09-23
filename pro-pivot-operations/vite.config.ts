import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  base: './',
  cacheDir: '.vite',
  plugins: [vue({ template: { compilerOptions: { isCustomElement: tag => tag.startsWith('revo-') || tag.startsWith('revogr-') } } })],
});
