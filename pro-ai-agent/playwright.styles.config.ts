import { defineConfig } from '@playwright/test';

// Exercise shared styles without starting the demo or requiring its backend.
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'chart-scroll.spec.ts',
  workers: 1,
  use: { headless: true },
});
