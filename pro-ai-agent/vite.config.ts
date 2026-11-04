import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import react from '@vitejs/plugin-react';
import vue from '@vitejs/plugin-vue';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const localProDist = ['../../../packages/pro/dist/', '../../../../packages/pro/dist/']
  .map(relativePath => new URL(relativePath, import.meta.url))
  .find(directory => existsSync(new URL('revogrid-pro.js', directory)));

export default defineConfig(({ mode }) => ({
  base: './',
  resolve: {
    alias: localProDist ? [
      { find: '@revolist/revogrid-pro/styles.css', replacement: fileURLToPath(new URL('revogrid-pro.css', localProDist)) },
      { find: /^@revolist\/revogrid-pro$/, replacement: fileURLToPath(new URL('revogrid-pro.js', localProDist)) },
      ...(mode === 'angular' && existsSync(new URL('../../ui/dist/native.js', localProDist)) ? [
        { find: /^@revolist\/ui$/, replacement: fileURLToPath(new URL('../../ui/dist/native.js', localProDist)) },
      ] : []),
    ] : [],
    dedupe: ['@revolist/revogrid'],
    ...(mode === 'angular' ? { mainFields: ['module'] } : {}),
  },
  plugins: [
    ...(mode === 'angular' ? [angular()] : []),
    react(),
    vue({
      template: {
        compilerOptions: {
          isCustomElement: tag => tag.startsWith('revo-') || tag.startsWith('revogr-'),
        },
      },
    }),
  ],
}));
