import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import react from '@vitejs/plugin-react';
import vue from '@vitejs/plugin-vue';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const localProDist = [
  '../../../packages/pro/dist/',
  '../../../../packages/pro/dist/',
]
  .map((relativePath) => new URL(relativePath, import.meta.url))
  .find((directory) => existsSync(new URL('revogrid-pro.js', directory)));

export const localProductAliases = localProDist
  ? [
      {
        find: '@revolist/revogrid/loader',
        replacement: fileURLToPath(
          new URL(
            '../../../node_modules/@revolist/revogrid/loader/index.js',
            localProDist,
          ),
        ),
      },
      {
        find: /^@revolist\/revogrid$/,
        replacement: fileURLToPath(
          new URL(
            '../../../node_modules/@revolist/revogrid/dist/index.js',
            localProDist,
          ),
        ),
      },
      {
        find: '@revolist/ui/styles.css',
        replacement: fileURLToPath(
          new URL('../../ui/dist/styles.css', localProDist),
        ),
      },
      {
        find: /^@revolist\/ui$/,
        replacement: fileURLToPath(
          new URL('../../ui/dist/native.js', localProDist),
        ),
      },
      {
        find: '@revolist/revogrid-pro/styles.css',
        replacement: fileURLToPath(new URL('revogrid-pro.css', localProDist)),
      },
      {
        find: /^@revolist\/revogrid-pro$/,
        replacement: fileURLToPath(new URL('revogrid-pro.js', localProDist)),
      },
      {
        find: '@revolist/pivot/styles.css',
        replacement: fileURLToPath(
          new URL('../../pivot/dist/pivot.css', localProDist),
        ),
      },
      {
        find: /^@revolist\/pivot$/,
        replacement: fileURLToPath(
          new URL('../../pivot/dist/pivot.js', localProDist),
        ),
      },
      {
        find: /^@revolist\/charts$/,
        replacement: fileURLToPath(
          new URL('../../charts/dist/index.js', localProDist),
        ),
      },
    ]
  : [];

export default defineConfig(({ mode }) => ({
  base: './',
  server: {
    proxy: {
      '/api/ai-view': { target: 'http://127.0.0.1:5189', changeOrigin: true },
    },
  },
  resolve: {
    alias: localProductAliases,
    dedupe: ['@revolist/revogrid'],
    ...(mode === 'angular' ? { mainFields: ['module'] } : {}),
  },
  plugins: [
    ...(mode === 'angular' ? [angular()] : []),
    react(),
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) =>
            tag.startsWith('revo-') || tag.startsWith('revogr-'),
        },
      },
    }),
  ],
}));
