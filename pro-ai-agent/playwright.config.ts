import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120_000,
  workers: 1,
  use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:5321' },
  webServer: {
    command:
      'pnpm exec vite --mode angular --host 127.0.0.1 --port 5321 --strictPort',
    url: 'http://127.0.0.1:5321',
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
