import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    name: 'ai-assistant-reference',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
