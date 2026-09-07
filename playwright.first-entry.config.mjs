import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'order-first-entry.spec.ts',
  timeout: 60_000,
  workers: 1,
  expect: { timeout: 15_000 },
  use: { baseURL: 'http://127.0.0.1:5175', viewport: { width: 1440, height: 1000 } },
  webServer: {
    command: 'pnpm exec vitepress dev --host 127.0.0.1 --port 5175',
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    url: 'http://127.0.0.1:5175',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
