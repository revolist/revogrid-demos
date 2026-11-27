import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';
import { preview } from 'vite';
const { chromium } = createRequire(import.meta.url)('playwright');
let server, browser, url;
before(async () => {
  server = await preview({ mode: 'ts', build: { outDir: process.env.DEMO_REUSE_TEST_OUT_DIR ?? 'dist/browser-test' }, preview: { host: '127.0.0.1', port: 0 } });
  url = `${server.resolvedUrls.local[0]}#campaign-performance`;
  browser = await chromium.launch({ headless: true });
});
after(async () => { await browser?.close(); if (server) await new Promise(resolve => server.httpServer.close(resolve)); });
test('campaign editor and detail show matching channel, flag and owner images', async () => {
 const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
 try {
  await page.goto(url);
  await page.getByRole('button', { name: 'Open Community Plan Member Event' }).waitFor();
  const row = page.locator('.rgRow').filter({ has: page.getByRole('button', { name: 'Open Community Plan Member Event' }) }).first();
  assert.equal(await row.locator('.fa-linkedin').count(), 1);
  const gridBadge = await page.locator('.campaign-grid-shell .pill.good').first().evaluate(element => { const style = getComputedStyle(element); return [style.color, style.backgroundColor, style.fontWeight, style.borderRadius]; });
  await row.getByRole('button', { name: 'Open Community Plan Member Event' }).click();
  const dialog = page.getByRole('dialog');
  const popupBadge = await dialog.locator('.campaign-profile__title .pill').evaluate(element => { const style = getComputedStyle(element); return [style.color, style.backgroundColor, style.fontWeight, style.borderRadius]; });
  assert.deepEqual(popupBadge, gridBadge);
  assert.equal(await dialog.getByRole('button', { name: 'Delete campaign' }).count(), 1);
  const section = dialog.getByRole('region', { name: 'Last 30 Days' });
  assert.equal(await section.evaluate(element => getComputedStyle(element).borderTopWidth), '0px');
  assert.equal(await section.locator('.scale-profile__section-content').evaluate(element => getComputedStyle(element).borderTopWidth), '1px');
  const ownerPhoto = dialog.locator('.campaign-profile__definitions img.campaign-owner-photo');
  await ownerPhoto.waitFor();
  const photo = await ownerPhoto.getAttribute('src');
  await dialog.getByRole('button', { name: 'Edit', exact: true }).click();
  const channel = dialog.getByRole('combobox', { name: 'Channel' });
  assert.equal(await channel.locator('.fa-linkedin').count(), 1);
  await channel.click();
  assert.equal(await page.getByRole('option', { name: 'TikTok', exact: true }).locator('.fa-tiktok').count(), 1);
  await page.getByRole('option', { name: 'TikTok', exact: true }).click();
  assert.equal(await channel.locator('.fa-tiktok').count(), 1);
  const market = dialog.getByRole('combobox', { name: 'Market' });
  assert.match(await market.innerText(), /🇧🇷/);
  await market.click();
  assert.match(await page.getByRole('option', { name: 'Mexico', exact: true }).innerText(), /🇲🇽/);
  await page.getByRole('option', { name: 'Mexico', exact: true }).click();
  const owner = dialog.getByRole('combobox', { name: 'Owner' });
  assert.equal(await owner.locator('img').getAttribute('src'), photo);
  await owner.click();
  assert.ok((await page.getByRole('option').locator('img').count()) > 0);
 } finally { await page.close(); }
});
