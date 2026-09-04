import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import vue from '@vitejs/plugin-vue';

export default defineConfig(async ({ mode }) => {
  let angular;
  if (mode === 'angular') angular = (await import('@analogjs/vite-plugin-angular')).default;

  return {
    base: './',
    resolve: {
      dedupe: [
        '@angular/common',
        '@angular/compiler',
        '@angular/core',
        '@angular/platform-browser',
        '@revolist/angular-datagrid',
        '@revolist/gantt',
        '@revolist/react-datagrid',
        '@revolist/revogrid',
        '@revolist/revogrid-pro',
        '@revolist/vue3-datagrid',
        'react',
        'react-dom',
        'rxjs',
        'vue',
      ],
      ...(mode === 'angular' ? { mainFields: ['module'] } : {}),
    },
    plugins: [
      ...(angular ? [angular()] : []),
      react(),
      vue({
        template: {
          compilerOptions: {
            isCustomElement: (tag) => tag.startsWith('revo-') || tag.startsWith('revogr-'),
          },
        },
      }),
    ],
  };
});
