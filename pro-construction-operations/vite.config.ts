import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import vue from '@vitejs/plugin-vue';
import { trialCssAliases } from '../vite.trial-aliases';

const localBuilds = {
  proEntry: fileURLToPath(new URL('../../../packages/pro/dist/revogrid-pro.js', import.meta.url)),
  proCss: fileURLToPath(new URL('../../../packages/pro/dist/revogrid-pro.css', import.meta.url)),
  ganttEntry: fileURLToPath(new URL('../../../packages/gantt/dist/gantt.js', import.meta.url)),
  ganttCss: fileURLToPath(new URL('../../../packages/gantt/dist/gantt.css', import.meta.url)),
  schedulerEntry: fileURLToPath(new URL('../../../packages/scheduler/dist/scheduler.js', import.meta.url)),
  schedulerCss: fileURLToPath(new URL('../../../packages/scheduler/dist/scheduler.css', import.meta.url)),
};

function localBuildAliases() {
  const missing = Object.values(localBuilds).filter((entry) => !existsSync(entry));
  if (missing.length) {
    return trialCssAliases;
  }
  return {
    '@revolist/revogrid-pro/dist/revogrid-pro.css': localBuilds.proCss,
    '@revolist/revogrid-pro/styles.css': localBuilds.proCss,
    '@revolist/gantt/styles.css': localBuilds.ganttCss,
    '@revolist/scheduler/styles.css': localBuilds.schedulerCss,
    '@revolist/revogrid-pro': localBuilds.proEntry,
    '@revolist/gantt': localBuilds.ganttEntry,
    '@revolist/scheduler': localBuilds.schedulerEntry,
  };
}

export default defineConfig(async ({ command, mode }) => {
  let angular;
  if (mode === 'angular') angular = (await import('@analogjs/vite-plugin-angular')).default;
  return {
    base: './',
    esbuild: { jsx: 'automatic' },
    resolve: {
      alias: command === 'serve' || process.env.LOCAL_PACKAGES === 'true'
        ? localBuildAliases()
        : trialCssAliases,
      dedupe: ['@revolist/revogrid'],
      ...(mode === 'angular' ? { mainFields: ['module'] } : {}),
    },
    plugins: [
      ...(angular ? [angular()] : []),
      react(),
      vue({ template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('revo-') || tag.startsWith('revogr-') } } }),
    ],
    test: { environment: 'jsdom', include: ['tests/unit/**/*.test.ts'] },
  };
});
