import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';
import { preview } from 'vite';
import { chooseSelect } from './select-helper.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
let server, browser, url;
before(async () => {
  server = await preview({ configFile: process.env.DEMO_TEST_CONFIG, mode: 'ts', build: { outDir: process.env.DEMO_REUSE_TEST_OUT_DIR ?? 'dist/browser-test' }, preview: { host: '127.0.0.1', port: 0 } });
  url = `${server.resolvedUrls.local[0]}#patient-cohorts`;
  browser = await chromium.launch({ headless: true });
});
after(async () => {
  await browser?.close();
  if (server) await new Promise((resolve, reject) => server.httpServer.close(error => error ? reject(error) : resolve()));
});

test('cohort tabs stay grouped on the left and remain interactive', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    await page.goto(url);
    const tabs = page.getByRole('tablist', { name: 'Cohort grouping' });
    await tabs.waitFor();
    assert.equal(await tabs.evaluate(element => {
      const items = [...element.querySelectorAll('[role="tab"]')];
      return items.at(-1).getBoundingClientRect().right - items[0].getBoundingClientRect().left < element.clientWidth / 2;
    }), true);
    await tabs.getByRole('tab', { name: 'Hold risk' }).click();
    assert.equal(await tabs.getByRole('tab', { name: 'Hold risk' }).getAttribute('aria-selected'), 'true');
    if (process.env.DEMO_SCREENSHOT_PATH) await page.screenshot({ path: process.env.DEMO_SCREENSHOT_PATH });
  } finally { await page.close(); }
});

test('cohort selector switches to the second referral dataset', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    await page.goto(url);
    await chooseSelect(page.getByRole('combobox', { name: 'Cohort' }), 'Preventive Care Access');
    await page.getByRole('searchbox').fill('Screening results received');
    await page.locator('.cohort-stage-summary').getByText('674', { exact: true }).waitFor();
  } finally { await page.close(); }
});

test('largest stage drop combines with search and updates the totals', async () => {
  const page = await browser.newPage();
  try {
    await page.goto(url);
    await page.getByRole('searchbox').fill('Referral priority recorded');
    const stage = page.getByRole('combobox', { name: 'Filter by largest stage drop' });
    await chooseSelect(stage, 'Booking');
    await page.locator('.cohort-stage-summary').getByText('812', { exact: true }).waitFor();
    await chooseSelect(stage, 'Verification');
    await page.locator('.cohort-stage-summary').getByText('0', { exact: true }).first().waitFor();
    assert.equal(await page.locator('revo-grid').evaluate(grid => grid.getVisibleSource().then(rows => rows.length)), 0);
  } finally {
    await page.close();
  }
});

test('checkpoint details show exact counts and benchmark for groups and signals', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    await page.goto(url);
    const group = page.getByRole('button', { name: 'Clinical Fit, verified: 1,245 of 1,450 answers, 86%' });
    await group.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await dialog.getByText('1,245 of 1,450 answers').waitFor();
    await dialog.getByText('Cohort average 80%').waitFor();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Clinical Fit, booked: 905 of 1,450 answers, 62%' }).click();
    await dialog.getByText('905 of 1,245 verified progressed to booked').waitFor();
    assert.equal(await dialog.locator('.cohort-transition strong').innerText(), '73%');
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Referral priority recorded, booked: 520 of 812 answers, 64%' }).click();
    await dialog.getByText('520 of 812 answers').waitFor();
  } finally { await page.close(); }
});
