import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import react from '@vitejs/plugin-react';
import vue from '@vitejs/plugin-vue';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { trialCssAliases } from '../vite.trial-aliases';

const localProEntry = fileURLToPath(new URL('../../../packages/pro/dist/revogrid-pro.js', import.meta.url));
const localProCss = fileURLToPath(new URL('../../../packages/pro/dist/revogrid-pro.css', import.meta.url));
const localCoreEntry = fileURLToPath(new URL('../../../node_modules/@revolist/revogrid/dist/index.js', import.meta.url));
const localCoreLoader = fileURLToPath(new URL('../../../node_modules/@revolist/revogrid/loader/index.js', import.meta.url));

const proAliases = existsSync(localProEntry)
  ? {
      '@revolist/revogrid-pro/dist/revogrid-pro.css': localProCss,
      '@revolist/revogrid-pro': localProEntry,
    }
  : trialCssAliases;

export default defineConfig(({ mode }) => ({
  base: './',
  resolve: {
    alias: [
      { find: '@revolist/revogrid/loader', replacement: localCoreLoader },
      { find: '@revolist/revogrid', replacement: localCoreEntry },
      ...Object.entries(proAliases).map(([find, replacement]) => ({ find, replacement })),
    ],
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
