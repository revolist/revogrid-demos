import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://127.0.0.1:43173',
    viewport: { width: 1440, height: 900 },
    colorScheme: 'light',
  },
  webServer: {
    command: 'pnpm exec vite --mode ts --host 127.0.0.1 --port 43173 --strictPort',
    url: 'http://127.0.0.1:43173',
    reuseExistingServer: !process.env.CI,
  },
});
