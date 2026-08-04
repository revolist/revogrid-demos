import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import react from '@vitejs/plugin-react';
import vue from '@vitejs/plugin-vue';
import { trialCssAliases } from '../vite.trial-aliases';

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: trialCssAliases,
    ...(mode === 'angular' ? { mainFields: ['module'] } : {}),
  },
  plugins: [
    ...(mode === 'angular' ? [angular()] : []),
    react(),
    vue({ template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('revo-') || tag.startsWith('revogr-') } } }),
  ],
}));
