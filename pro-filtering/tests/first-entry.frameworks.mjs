import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
const configFile = fileURLToPath(new URL('../vite.config.ts', import.meta.url));
const frameworks = ['ts', 'vue', 'react', 'angular'];
const browser = await chromium.launch();

async function settledCount(page, expected) {
  const count = page.locator('.order-explorer__count');
  await count.waitFor();
  await page.waitForFunction(
    value => document.querySelector('.order-explorer__count')?.textContent?.trim() === value,
    expected,
  );
}

try {
  for (const [index, mode] of frameworks.entries()) {
    const port = 5180 + index;
    const server = await createServer({
      configFile,
      root,
      mode,
      server: { host: '127.0.0.1', port, strictPort: true },
    });
    await server.listen();
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    try {
      await page.goto(`http://127.0.0.1:${port}/?mode=first-entry`);
      await settledCount(page, '120 of 120 orders');
      await page.getByRole('button', { name: 'Review queue', exact: true }).click();
      await settledCount(page, '24 of 120 orders');
      await page.getByRole('searchbox', { name: 'Search orders' }).fill('Northstar');
      await settledCount(page, '6 of 120 orders');
      await page.getByRole('button', { name: 'Total ≥ $1,000', exact: true }).click();
      await settledCount(page, '2 of 120 orders');
      assert.match(await page.locator('.order-first-entry__success').innerText(), /You found 2 matching orders/);

      await page.getByRole('button', { name: 'Total ≥ $1,000', exact: true }).click();
      await page.getByRole('combobox', { name: 'Status' }).selectOption('Payment Hold');
      await settledCount(page, '2 of 120 orders');
      await page.getByRole('searchbox', { name: 'Search orders' }).fill('no matching order');
      await settledCount(page, '0 of 120 orders');
      assert.match(await page.locator('.order-first-entry__empty').innerText(), /No orders match/);

      await page.getByRole('searchbox', { name: 'Search orders' }).fill('Northstar');
      await page.locator('.order-first-entry__summary-actions').getByRole('button', { name: 'Reset demo' }).click();
      await settledCount(page, '120 of 120 orders');
      await page.waitForTimeout(250);
      await settledCount(page, '120 of 120 orders');
      assert.equal(await page.getByLabel('Scenario progress').innerText(), '0 of 3 complete');
      process.stdout.write(`✓ ${mode} first-entry workflow\n`);
    } finally {
      await page.close();
      await server.close();
    }
  }
} finally {
  await browser.close();
}

// Angular's JIT compiler keeps a worker handle alive after the Vite server closes.
// Reaching this line means every framework completed and cleaned up successfully.
process.exit(0);
