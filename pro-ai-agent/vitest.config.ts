import { defineConfig } from 'vitest/config';
import { localProductAliases } from './vite.config';

export default defineConfig({
  resolve: { alias: localProductAliases },
  test: {
    server: {
      deps: {
        inline: [/@revolist\/revogrid-column-date/],
        external: [/packages\/pro\/dist\//],
      },
    },
    css: true,
    environment: 'node',
    include: ['src/*.test.ts'],
  },
});
