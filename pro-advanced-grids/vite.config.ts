import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import react from '@vitejs/plugin-react';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const localPro = fileURLToPath(new URL('../../../packages/pro/dist/', import.meta.url));
const localUiRoot = new URL('../../../packages/ui/', import.meta.url);
const localUiExports = JSON.parse(readFileSync(new URL('package.json', localUiRoot), 'utf8')).exports as Record<string, string>;
const localUiAliases = Object.entries(localUiExports).map(([key, path]) => ({
  find: new RegExp(`^@revolist/ui${key === '.' ? '' : key.slice(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
  replacement: fileURLToPath(new URL(path, localUiRoot)),
}));

export default defineConfig(({ mode, command }) => ({
  base: "./",
  resolve: {
    dedupe: ['@revolist/revogrid', '@revolist/ui', 'react', 'react-dom'],
    ...(command === 'serve' ? { alias: [
      ...localUiAliases,
      { find: /^@revolist\/revogrid-pro$/, replacement: `${localPro}revogrid-pro.js` },
      { find: /^@revolist\/revogrid-pro\/styles\.css$/, replacement: `${localPro}revogrid-pro.css` },
    ] } : {}),
    ...(mode === 'angular' ? { mainFields: ['module'] } : {}),
  },
  plugins: [
    ...(mode === 'angular' ? [angular()] : []),
    react(),
    vue({ template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('revo-') || tag.startsWith('revogr-') } } }),
  ],
}));
