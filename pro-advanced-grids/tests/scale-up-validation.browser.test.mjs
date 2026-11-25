import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';
import { preview } from 'vite';
const { chromium } = createRequire(import.meta.url)('playwright');
let server, browser, url;
before(async () => {
  server = await preview({ mode: 'ts', build: { outDir: process.env.DEMO_REUSE_TEST_OUT_DIR ?? 'dist/browser-test' }, preview: { host: '127.0.0.1', port: 0, strictPort: false } });
  url = `${server.resolvedUrls.local[0]}#scale-up-index`;
  browser = await chromium.launch({ headless: true });
});
after(async () => { await browser?.close(); if (server) await new Promise((resolve, reject) => server.httpServer.close(error => error ? reject(error) : resolve())); });
test('company creation validates names and shows missing headcount history', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    page.setDefaultTimeout(10000);
    await page.goto(url);
    await page.getByRole('button', { name: 'Add Company' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Company name').fill('   ');
    await dialog.getByLabel('City').fill('   ');
    await dialog.getByLabel('Founded').fill('2024');
    await dialog.getByLabel('Revenue FY25').fill('5');
    await dialog.getByLabel('EBITDA FY25').fill('0.5');
    await dialog.getByLabel('Staff', { exact: true }).fill('20');
    await dialog.getByRole('button', { name: 'Create Company' }).click();
    await dialog.getByRole('alert').getByText('Enter a company name.').waitFor();
    await dialog.getByLabel('Company name').fill('Example company');
    await dialog.getByRole('button', { name: 'Create Company' }).click();
    await dialog.getByRole('alert').getByText('Enter a city.').waitFor();
    await dialog.getByLabel('City').fill('Utrecht');
    await dialog.getByRole('button', { name: 'Create Company' }).click();
    await dialog.getByRole('button', { name: 'Close', exact: true }).waitFor();
    assert.match(await dialog.innerText(), /Example company/);
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('searchbox').fill('Example company');
    const history = page.getByRole('group', { name: 'Example company headcount by quarter' });
    await history.waitFor();
    assert.equal(await history.locator('button.is-unknown').count(), 8);
    assert.equal(await history.locator('button.is-neutral').count(), 0);
    assert.equal(await history.getByRole('button', { name: 'Example company, headcount, Q3 2026, 20, no comparison' }).count(), 1);
    assert.equal(await history.locator('button.is-unknown').first().evaluate(element => getComputedStyle(element).borderStyle), 'dashed');
  } finally { await page.close(); }
});

test('province fills spare width and rank labels are plain and readable', async () => {
  const page = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  try {
    await page.goto(url);
    await page.locator('.rv-ranking__badge').first().waitFor();
    await page.waitForFunction(async () => [...document.querySelectorAll('revo-grid .rgHeaderCell')].find(cell => cell.textContent.trim().startsWith('Province'))?.getBoundingClientRect().width > 172);
    const badge = page.locator('.rv-ranking__badge').first();
    assert.equal(await page.locator('.rv-ranking .change-cell').count(), 0);
    assert.match(await badge.innerText(), /^#\d+$/);
    assert.equal(await badge.evaluate(node => getComputedStyle(node).borderRadius), '0px');
    assert.equal(await badge.evaluate(node => getComputedStyle(node).backgroundColor), 'rgba(0, 0, 0, 0)');
    const header = page.locator('.rgHeaderCell').filter({ hasText: /^Rank$/ }).first();
    assert.equal(await header.evaluate(node => node.scrollWidth <= node.clientWidth), true);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: /Open / }).first().waitFor();
  } finally { await page.close(); }
});

test('company screening uses shared radio groups and updates selected answers', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Add Company' }).click();
    const dialog = page.getByRole('dialog');
    const group = dialog.getByRole('group', { name: 'Founder still leads it' });
    await group.getByRole('radio', { name: 'Yes' }).check();
    assert.equal(await group.getByRole('radio', { name: 'Yes' }).isChecked(), true);
    assert.equal(await group.locator('.rv-radio-group').count(), 0);
    assert.equal(await group.evaluate(node => node.classList.contains('rv-radio-group')), true);
  } finally { await page.close(); }
});
