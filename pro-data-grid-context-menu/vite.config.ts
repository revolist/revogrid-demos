import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import react from '@vitejs/plugin-react';
import vue from '@vitejs/plugin-vue';
import { trialCssAliases } from '../vite.trial-aliases';

const localProCss = fileURLToPath(new URL(
  '../../../packages/pro/dist/revogrid-pro.css',
  import.meta.url,
));
const cssAliases = existsSync(localProCss)
  ? { '@revolist/revogrid-pro/dist/revogrid-pro.css': localProCss }
  : trialCssAliases;

export default defineConfig(({ mode }) => ({
  base: './',
  resolve: {
    alias: cssAliases,
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
