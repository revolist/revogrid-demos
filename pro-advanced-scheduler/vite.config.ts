import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import react from '@vitejs/plugin-react';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => ({
  resolve: mode === 'angular' ? { mainFields: ['module'] } : undefined,
  plugins: [
    ...(mode === 'angular' ? [angular()] : []),
    react(),
    vue({ template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('revo-') || tag.startsWith('revogr-') } } }),
  ],
  test: {
    environment: 'jsdom',
    server: {
      deps: {
        inline: [
          '@revolist/revogrid-enterprise',
          '@revolist/revogrid-column-date',
        ],
      },
    },
  },
}));
