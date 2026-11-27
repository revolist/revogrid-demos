import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';
import { preview } from 'vite';

const { chromium } = createRequire(import.meta.url)('playwright');
let server, browser, url;
before(async () => {
  server = await preview({ configFile: process.env.DEMO_TEST_CONFIG, mode: 'ts', build: { outDir: process.env.DEMO_REUSE_TEST_OUT_DIR ?? 'dist/browser-test' }, preview: { host: '127.0.0.1', port: 0 } });
  url = `${server.resolvedUrls.local[0]}#service-visits`;
  browser = await chromium.launch({ headless: true });
});
after(async () => { await browser?.close(); if (server) await new Promise((resolve, reject) => server.httpServer.close(error => error ? reject(error) : resolve())); });

test('facilities schedule displays site details and supports bulk booking with undo', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    await page.goto(url);
    await page.getByText(/12 sites/).waitFor();
    await page.getByRole('button', { name: 'Open Harbor Learning Centre' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByText('18 Harbor Walk').waitFor();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    const book = page.getByRole('button', { name: /Book all .* unbooked visits/ });
    await book.click();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    assert.equal(await book.isEnabled(), true);
  } finally { await page.close(); }
});
