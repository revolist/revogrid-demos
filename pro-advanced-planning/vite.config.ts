import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import vue from '@vitejs/plugin-vue';
import { trialCssAliases } from '../vite.trial-aliases';

export default defineConfig(async ({ mode }) => {
  let angular;
  if (mode === 'angular') {
    try {
      angular = (await import('@analogjs/vite-plugin-angular')).default;
    } catch (error) {
      if ((error as { code?: string }).code !== 'ERR_MODULE_NOT_FOUND') {
        throw error;
      }
    }
  }

  return {
    base: './',
    esbuild: { jsx: 'automatic' },
    resolve: {
      alias: trialCssAliases,
      ...(mode === 'angular' ? { mainFields: ['module'] } : {}),
    },
    plugins: [
      ...(angular ? [angular()] : []),
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
  };
});
