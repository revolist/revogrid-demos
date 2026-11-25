import { chooseSelect, selectValue } from './select-helper.mjs';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';
import { preview } from 'vite';

const { chromium } = createRequire(import.meta.url)('playwright');
let server, browser, url;
before(async () => {
  server = await preview({ mode: 'ts', build: { outDir: process.env.DEMO_REUSE_TEST_OUT_DIR ?? 'dist/browser-test' }, preview: { host: '127.0.0.1', port: 0, strictPort: false } });
  url = `${server.resolvedUrls.local[0]}#campaign-performance`;
  browser = await chromium.launch({ headless: true });
});
after(async () => {
  await browser?.close();
  if (server) await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()));
});

async function revealCompany(page, name) {
  await page.waitForFunction(async label => {
    const grid = document.querySelector('revo-grid.workbench-grid');
    return grid?.getVisibleSource && (await grid.getVisibleSource()).some(row => row.label === label);
  }, name);
  await page.locator('revo-grid.workbench-grid').evaluate(async (grid, label) => {
    const rows = await grid.getVisibleSource();
    await grid.scrollToRow(rows.findIndex(row => row.label === label));
  }, name);
}

test('campaign sorting, paging and filtering use the current data', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    page.setDefaultTimeout(10000);
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Boreal Gloves Member Event' }).waitFor();
    const names = () => page.locator('.cell-label .cell-action').allTextContents();
    const spend = page.locator('.rgHeaderCell').filter({ hasText: 'Spend' }).first();
    const status = page.locator('.rgHeaderCell').filter({ hasText: 'Status' }).first();
    assert.equal(await spend.evaluate((element) => element.classList.contains('campaign-number-header')), true);
    assert.equal(await status.evaluate((element) => element.classList.contains('campaign-number-header')), false);
    assert.equal(await status.locator('.sort-off').evaluate((element) => getComputedStyle(element).display), 'block');
    assert.equal(await spend.evaluate((element) => element.classList.contains('desc')), true);
    await spend.click();
    assert.equal(await spend.evaluate(el => el.classList.contains('desc')), true);
    await page.locator('.rv-context-menu:visible').getByRole('menuitem', { name: 'Sort ascending', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.rgHeaderCell.asc'));
    assert.notEqual((await names())[0], 'Boreal Gloves Member Event');
    await spend.click();
    await page.locator('.rv-context-menu:visible').getByRole('menuitem', { name: 'Sort descending', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.rgHeaderCell.desc'));
    assert.equal((await names())[0], 'Boreal Gloves Member Event');
    await page.getByRole('button', { name: 'Page 2', exact: true }).click();
    await page.getByRole('button', { name: 'Open Tidewater Rain Shell Member Event' }).waitFor();
    await page.getByPlaceholder('Search campaign, ID, market…').fill('Boreal Gloves Member Event');
    await page.getByRole('button', { name: 'Open Boreal Gloves Member Event' }).waitFor();
    assert.equal((await names()).length, 1);
    await page.getByPlaceholder('Search campaign, ID, market…').clear();
  } finally {
    await page.close();
  }
});

test('remote sort indicators follow the selected column through reloads', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    page.setDefaultTimeout(10000);
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Boreal Gloves Member Event' }).waitFor();
    const header = (name) => page.locator('.rgHeaderCell').filter({ hasText: name }).first();
    const spend = header('Spend');
    const status = header('Status');
    assert.equal(await spend.evaluate(el => el.classList.contains('desc')), true);
    await status.click();
    await page.locator('.rv-context-menu:visible').getByRole('menuitem', { name: 'Sort ascending', exact: true }).click();
    await page.waitForFunction(() => [...document.querySelectorAll('.rgHeaderCell')].some(el => el.textContent.includes('Status') && el.classList.contains('asc')));
    assert.equal(await spend.evaluate(el => el.classList.contains('desc')), false);
    await page.getByPlaceholder('Search campaign, ID, market…').fill('Boreal');
    await page.getByRole('button', { name: 'Open Boreal Gloves Member Event' }).waitFor();
    assert.equal(await status.evaluate(el => el.classList.contains('asc')), true);
    await status.click();
    await page.locator('.rv-context-menu:visible').getByRole('menuitem', { name: 'Sort descending', exact: true }).click();
    await page.waitForFunction(() => [...document.querySelectorAll('.rgHeaderCell')].some(el => el.textContent.includes('Status') && el.classList.contains('desc')));
  } finally { await page.close(); }
});

test('scale-up expand control updates its accessible name', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url.replace('#campaign-performance', '#scale-up-index'));
    await page.getByRole('button', { name: 'Add Company', exact: true }).waitFor();
    await page.locator('button').filter({ hasText: 'Expand all' }).evaluate(node => document.body.append(node));
    await page.getByRole('button', { name: 'Expand all', exact: true }).click();
    await page.getByRole('button', { name: 'Collapse all', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Collapse all', exact: true }).click();
    await page.getByRole('button', { name: 'Expand all', exact: true }).waitFor();
  } finally { await page.close(); }
});

test('scale-up province shading follows expansion', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    page.setDefaultTimeout(10000);
    await page.goto(url.replace('#campaign-performance', '#scale-up-index'));
    // Filter the virtualized grid so South Holland is rendered before checking its color.
    await page.locator('.rv-search-action-bar').getByLabel('Filter', { exact: true }).click();
    await page.locator('.workbench-filter-panel').getByRole('combobox', { name: 'Province' }).click();
    await page.getByRole('option', { name: 'South Holland', exact: true }).click();
    await page.keyboard.press('Escape');
    const expand = page.getByRole('button', { name: 'Expand South Holland' }).first();
    await expand.waitFor();
    const color = async (name) => page.locator('.rgRow').filter({ has: page.getByRole('button', { name }) }).locator('.rgCell').first().evaluate((cell) => getComputedStyle(cell).backgroundColor);
    assert.equal(await color('Expand South Holland'), 'rgb(249, 249, 249)');
    await expand.click();
    await page.getByRole('button', { name: /^Collapse / }).first().waitFor();
    assert.notEqual(await color('Collapse South Holland'), 'rgb(249, 249, 249)');
    await page.getByRole('button', { name: 'Collapse South Holland' }).first().click();
    await expand.waitFor();
    assert.equal(await color('Expand South Holland'), 'rgb(249, 249, 249)');
  } finally {
    await page.close();
  }
});

test('cohort heat colors distinguish intermediate hold and low outcome rates', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    page.setDefaultTimeout(10000);
    await page.goto(url.replace('#campaign-performance', '#patient-cohorts'));
    const hold = page.getByRole('button', { name: 'Imaging results available, hold: 62 of 694 answers, 9%' });
    const started = page.getByRole('button', { name: 'Authorization confirmed, started: 229 of 676 answers, 34%' });
    await hold.waitFor();
    assert.equal(await hold.evaluate((cell) => getComputedStyle(cell).backgroundColor), 'rgb(255, 229, 206)');
    assert.equal(await started.evaluate((cell) => getComputedStyle(cell).backgroundColor), 'rgb(237, 249, 246)');
    assert.match(await hold.evaluate((cell) => getComputedStyle(cell).boxShadow), /229, 229, 229/);
  } finally {
    await page.close();
  }
});

test('product KPI periods use the sample weekly sales and health', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    page.setDefaultTimeout(10000);
    await page.goto(url.replace('#campaign-performance', '#product-kpis'));
    await page.getByRole('button', { name: 'Open Granite Trail Boot' }).waitFor();
    const artwork = page.locator('.product-photo').first();
    assert.equal(await artwork.evaluate(node => getComputedStyle(node).backgroundSize), '300% 300%');
    assert.ok((await page.request.get(new URL('product-photos/catalog.png', page.url()).href)).ok());
    for (const selector of ['.rv-identity-cell', '.rv-metric-stack', '.rv-comparison-sparkline', '.rv-action-strip', '.rv-status-segments', '.rv-cell-action']) {
      assert.ok(await page.locator(selector).count() > 0, `Missing shared cell type: ${selector}`);
    }
    await page.getByRole('img', { name: 'Revenue: met' }).first().waitFor();
    await page.getByRole('button', { name: 'Actions for Granite Trail Boot' }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
    const rows = () => page.locator('revo-grid').evaluate((grid) => grid.getVisibleSource());
    const product = async (name) => (await rows()).find((row) => row.label === name);
    let ridge = await product('Granite Trail Boot');
    assert.equal(Math.round(ridge.revenue), 314036);
    assert.equal(ridge.status, 'On Track');
    assert.deepEqual(ridge.marks, ['met', 'met', 'met']);
    assert.equal((await product('Harbor Trail Runner')).status, 'Off Track');
    assert.equal((await product('Ridgeline Weather Jacket')).status, 'On Track');
    await page.getByRole('button', { name: 'Open Granite Trail Boot' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
    assert.equal(Math.round((await product('Granite Trail Boot')).revenue), 314036);
    assert.deepEqual(await page.locator('.rv-time-range-header small').allTextContents(), ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']);
    assert.equal(await page.locator('revo-grid.workbench-grid').evaluate(grid => grid.columns.find(column => column.prop === 'promo')?.columnType), 'promotionCalendar');
    const timeline = page.getByRole('group', { name: 'Promotion calendar for Granite Trail Boot' });
    assert.equal(await timeline.getByRole('button').count(), 26);
    const firstWeek = timeline.getByRole('button').first();
    assert.match(await firstWeek.getAttribute('aria-label'), /Week ending Apr 19/);
    assert.match(await timeline.getByRole('button').last().getAttribute('aria-label'), /Week ending Oct 11/);
    await firstWeek.focus(); await page.keyboard.press('Enter');
    await page.getByRole('dialog', { name: 'Week ending Apr 19' }).getByText('Profit', { exact: true }).waitFor();
    await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
    const { productFixtures } = await import('../src/product-fixtures.ts');
    const fixture = productFixtures.find(row => row.label === 'Granite Trail Boot');
    const salesFor = weeks => Math.round(fixture.weeks.slice(-weeks).reduce((total, week) => total + week[0], 0));
    await page.getByRole('button', { name: '4W, last 4 weeks' }).click();
    await page.waitForFunction(async expected => Math.round((await document.querySelector('revo-grid').getVisibleSource())[0]?.revenue) === expected, salesFor(4));
    ridge = await product('Granite Trail Boot');
    assert.equal(Math.round(ridge.revenue), salesFor(4));
    assert.ok(['On Track', 'At Risk', 'Off Track'].includes(ridge.status));
    await page.getByRole('button', { name: '26W, last 26 weeks' }).click();
    await page.waitForFunction(async expected => Math.round((await document.querySelector('revo-grid').getVisibleSource())[0]?.revenue) === expected, salesFor(26));
    ridge = await product('Granite Trail Boot');
    assert.equal(Math.round(ridge.revenue), salesFor(26));
    assert.equal(ridge.status, 'On Track');
    assert.equal((await product('Cove Camp Slide')).status, 'On Track');
    assert.ok((await product('Cove Camp Slide')).score >= 0);
    assert.equal(await page.getByRole('button', { name: 'Settings', exact: true }).count(), 0);
    await page.getByRole('button', { name: '13W, last 13 weeks' }).click();
    await page.waitForFunction(async () => Math.round((await document.querySelector('revo-grid').getVisibleSource())[0]?.revenue) === 314036);
    const revenue = page.locator('.rgHeaderCell').filter({ hasText: 'Revenue' }).first();
    await revenue.click();
    await page.locator('.rv-context-menu:visible').getByRole('menuitem', { name: 'Sort ascending', exact: true }).click();
    await page.waitForFunction(async () => (await document.querySelector('revo-grid').getVisibleSource())[0]?.revenue === 0);
    await revenue.click();
    await page.locator('.rv-context-menu:visible').getByRole('menuitem', { name: 'Sort descending', exact: true }).click();
    await page.waitForFunction(async () => { const rows = await document.querySelector('revo-grid').getVisibleSource(); return rows.length > 2 && rows[0].revenue >= rows[1].revenue && rows[1].revenue >= rows[2].revenue; });
    await page.locator('.rv-pagination-panel').getByRole('button', { name: 'Page 2', exact: true }).click();
    await page.waitForFunction(async () => (await document.querySelector('revo-grid').getVisibleSource()).length > 0);
    await revenue.click();
    await page.locator('.rv-context-menu:visible').getByRole('menuitem', { name: 'Clear sort', exact: true }).click();
    await page.waitForFunction(async () => (await document.querySelector('revo-grid').getVisibleSource())[1]?.label === 'Cloudline Mid Boot');
    await page.getByRole('searchbox').fill('Granite Trail Boot');
    await page.waitForFunction(async () => (await document.querySelector('revo-grid').getVisibleSource()).length === 1);
    assert.equal((await rows())[0].label, 'Granite Trail Boot');
  } finally {
    await page.close();
  }
});

test('product paging and page size work on mobile', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    page.setDefaultTimeout(10000);
    await page.goto(url.replace('#campaign-performance', '#product-kpis'));
    await page.locator('.product-page-info').getByText('1 - 10 of 29 products').waitFor();
    await page.locator('.rv-pagination-panel').getByRole('button', { name: 'Page 2', exact: true }).click();
    await page.locator('.product-page-info').getByText('11 - 20 of 29 products').waitFor();
    await chooseSelect(page.getByLabel('Rows per page'), '25');
    await page.locator('.product-page-info').getByText('1 - 25 of 29 products').waitFor();
    await page.waitForFunction(async () => (await document.querySelector('revo-grid').getVisibleSource()).length === 25);
    await page.getByRole('searchbox').fill('Granite Trail Boot');
    await page.locator('.product-page-info').getByText('1 - 1 of 1 products').waitFor();
    await page.getByRole('button', { name: 'Open Granite Trail Boot' }).waitFor();
    await page.getByRole('searchbox').clear();
    await page.locator('.product-page-info').getByText('1 - 25 of 29 products').waitFor();
    assert.equal(await page.getByRole('searchbox').inputValue(), '');
  } finally {
    await page.close();
  }
});

test('product status line displays shared legends without reset', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url.replace('#campaign-performance', '#product-kpis'));
    const footer = page.locator('.rv-grid-status-line');
    assert.equal(await footer.locator('.rv-grid-status-line__sort').innerText(), 'Catalog order');
    assert.equal(await footer.getByRole('button', { name: 'Reset View' }).count(), 0);
    assert.equal(await footer.getByRole('list', { name: 'Promo Calendar legend' }).locator('.rv-legend__item').count(), 3);
    assert.equal(await footer.getByRole('list', { name: 'Revenue Trend legend' }).locator('[data-marker="line"]').count(), 2);
    const footerBox = await footer.boundingBox();
    const paginationBox = await page.locator('.rv-pagination-panel').boundingBox();
    assert.ok(Math.abs(footerBox.y + footerBox.height - paginationBox.y) <= 1);
  } finally { await page.close(); }
});

test('product columns remain resizable without appearance settings', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url.replace('#campaign-performance', '#product-kpis'));
    await page.getByRole('button', { name: 'Open Granite Trail Boot' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Settings', exact: true }).count(), 0);
    const header = page.locator('.rgHeaderCell').filter({ hasText: /^Revenue Trend$/ }).first();
    const handle = await header.locator('.resizable-r').boundingBox();
    await page.mouse.move(handle.x + 3, handle.y + handle.height / 2);
    await page.mouse.down();
    await page.mouse.move(handle.x + 33, handle.y + handle.height / 2, { steps: 8 });
    await page.mouse.up();
    await page.waitForFunction(() => Math.round([...document.querySelectorAll('.rgHeaderCell')].find(el => el.textContent.trim() === 'Revenue Trend')?.getBoundingClientRect().width ?? 0) === 269);
  } finally { await page.close(); }
});

test('scale-up index uses financial data and screening does not change scores', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    page.setDefaultTimeout(10000);
    await page.goto(url.replace('#campaign-performance', '#scale-up-index'));
    await revealCompany(page, 'Lumen Photonics');
    await page.getByRole('button', { name: 'Open Lumen Photonics' }).waitFor();
    for (const selector of ['.rv-ranking', '.rv-group-cell', '.rv-identity-cell', '.rv-choice-status', '.rv-metric-detail', '.rv-split-value', '.rv-cell-action']) {
      assert.ok(await page.locator(selector).count() > 0, `Missing shared cell type: ${selector}`);
    }
    const rankChanges = page.locator('.rv-ranking .change-cell');
    assert.equal(await rankChanges.count(), 0);
    const cards = page.locator('.workbench-stat');
    assert.match(await cards.nth(2).innerText(), /€1\.72B/);
    assert.match(await cards.nth(4).innerText(), /8,198/);
    const read = () => page.locator('revo-grid.workbench-grid').evaluate(grid => grid.getVisibleSource());
    const first = (await read()).find(row => row.label === 'Lumen Photonics');
    assert.equal(first.score, 42.6);
    await page.getByRole('button', { name: 'Founder for Lumen Photonics: Yes' }).click();
    const dialog = page.getByRole('dialog');
    await chooseSelect(dialog.getByLabel('Founder'), 'No');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await page.getByRole('button', { name: 'Founder for Lumen Photonics: No' }).waitFor();
    assert.equal((await read()).find(row => row.label === 'Lumen Photonics').score, first.score);
    await chooseSelect(page.getByLabel('Rank provinces by'), 'Growth');
    await page.waitForFunction(() => document.querySelector('[aria-label="Rank provinces by"]')?.getAttribute('data-value') === 'Growth');
    const north = (await read()).filter(row => row.company && row.company.province === 'North Brabant');
    assert.ok(north.length > 1);
  } finally { await page.close(); }
});

test('scale-up financial editing recomputes the index and first-year companies stay unscored', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    page.setDefaultTimeout(10000);
    await page.goto(url.replace('#campaign-performance', '#scale-up-index'));
    await revealCompany(page, 'Lumen Photonics');
    await page.getByRole('button', { name: 'Open Lumen Photonics' }).click();
    let dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Edit', exact: true }).click();
    assert.equal(await dialog.getByLabel('Revenue FY24').inputValue(), '5.1');
    assert.equal(await dialog.getByLabel('Revenue FY25').inputValue(), '5.5');
    assert.equal(await dialog.getByLabel('EBITDA FY25').inputValue(), '1');
    await dialog.getByLabel('Revenue FY25').fill('54');
    const { indexScore, percentChange } = await import('../src/scale-up-financials.ts');
    const expected = indexScore(percentChange(54, 5.1), 1 / 54 * 100, 54_000_000);
    assert.match(await dialog.innerText(), new RegExp(`Index score ${expected.toFixed(1)}`));
    await dialog.getByRole('button', { name: 'Save Changes' }).click();
    await page.waitForFunction(async value => (await document.querySelector('revo-grid.workbench-grid').getVisibleSource()).find(row => row.label === 'Lumen Photonics')?.score === value, expected);
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Add Company' }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByLabel('Company name').fill('First Year Example');
    await dialog.getByLabel('City').fill('Utrecht');
    await dialog.getByLabel('Focus').fill('Software');
    await dialog.getByLabel('Founded').fill('2025');
    await dialog.getByLabel('Revenue FY25').fill('5');
    await dialog.getByLabel('EBITDA FY25').fill('0.5');
    await dialog.getByLabel('Staff', { exact: true }).fill('20');
    assert.match(await dialog.innerText(), /Not scored until FY24 and FY25/);
    await dialog.getByRole('button', { name: 'Create Company' }).click();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('searchbox').fill('First Year Example');
    await page.getByRole('button', { name: 'Open First Year Example' }).waitFor();
    const row = (await page.locator('revo-grid.workbench-grid').evaluate(grid => grid.getVisibleSource())).find(item => item.label === 'First Year Example');
    assert.equal(row.score, null); assert.equal(row.growth, null); assert.equal(row.staffGrowth, null);
  } finally { await page.close(); }
});


test('scale-up company profile navigates data and enforces screening stages', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    page.setDefaultTimeout(10000);
    await page.goto(url.replace('#campaign-performance', '#scale-up-index'));
    await revealCompany(page, 'Lumen Photonics');
    await page.getByRole('button', { name: 'Open Lumen Photonics' }).click();
    const dialog = page.getByRole('dialog');
    assert.match(await dialog.innerText(), /company-011/);
    assert.match(await dialog.getByRole('region', { name: 'Index Score' }).innerText(), /42\.6/);
    await dialog.getByRole('button', { name: 'Next company' }).click();
    assert.doesNotMatch(await dialog.getByRole('heading').first().innerText(), /Lumen Photonics/);
    await dialog.getByRole('button', { name: 'Previous company' }).click();
    await dialog.getByRole('tab', { name: 'Financials' }).click();
    assert.match(await dialog.getByRole('region', { name: 'Revenue' }).innerText(), /5\.5M/);
    await dialog.getByRole('tab', { name: 'Hiring' }).click();
    assert.match(await dialog.getByRole('region', { name: 'By Quarter' }).innerText(), /Q3 2026/);
    await dialog.getByRole('tab', { name: 'Overview' }).click();
    await dialog.getByRole('group', { name: 'Founder still leads it' }).getByRole('button', { name: 'No', exact: true }).click();
    assert.equal(await selectValue(dialog.getByLabel('Stage')), 'Tracked');
    await chooseSelect(dialog.getByLabel('Stage'), 'In Talks');
    assert.match(await dialog.getByRole('alert').innerText(), /Clear every No/);
    await dialog.getByRole('button', { name: 'Edit', exact: true }).click();
    assert.equal(await dialog.getByLabel('Company name').inputValue(), 'Lumen Photonics');
    await dialog.getByRole('button', { name: 'Back', exact: true }).click();
    assert.equal(await dialog.getByRole('tab', { name: 'Overview' }).getAttribute('aria-selected'), 'true');
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  } finally { await page.close(); }
});

test('sales to target uses reference monthly store results across reporting periods', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    page.setDefaultTimeout(10000);
    await page.goto(url.replace('#campaign-performance', '#sales-to-target'));
    await page.getByRole('button', { name: 'Open Portland Riverfront' }).waitFor();
    for (const selector of ['.rv-visual-cell__rail', '.rv-identity-cell', '.rv-visual-cell__heat', '.rv-diverging-bars', '.rv-cell-action']) {
      assert.ok(await page.locator(selector).count() > 0, `Missing shared cell type: ${selector}`);
    }
    const rail = page.locator('.rv-visual-cell__rail').getByRole('button', { name: 'Collapse Americas' }).first();
    assert.equal(await rail.getAttribute('aria-expanded'), 'true');
    assert.equal(await rail.locator('.rv-expand-icon').count(), 1);
    await rail.focus(); await page.keyboard.press('Enter');
    const expand = page.getByRole('button', { name: 'Expand Americas' }).first();
    await expand.waitFor(); assert.equal(await expand.getAttribute('aria-expanded'), 'false');
    assert.equal(await expand.locator('.rv-expand-icon').count(), 1);
    await expand.click(); await page.getByRole('button', { name: 'Open Portland Riverfront' }).waitFor();
    const history = page.getByRole('img', { name: 'Monthly variance across the fiscal year' }).first();
    await history.waitFor();
    assert.ok(await history.locator('.rv-diverging-bars__bar').count() > 0);
    assert.equal(await history.locator('.rv-diverging-bars__bar.is-highlighted').count(), 1);
    const read = () => page.locator('revo-grid.workbench-grid').evaluate(grid => grid.getVisibleSource());
    let portland = (await read()).find(row => row.label === 'Portland Riverfront');
    assert.equal(portland.actual0, 371600);
    assert.equal(portland.variance0, -11600);
    assert.equal(portland.actual1, 1194900);
    assert.equal(portland.variance2, -121900);
    await chooseSelect(page.getByLabel('Reporting month'), 'Aug 2026');
    await page.waitForFunction(async () => (await document.querySelector('revo-grid.workbench-grid').getVisibleSource()).find(row => row.label === 'Portland Riverfront')?.actual0 === 456400);
    portland = (await read()).find(row => row.label === 'Portland Riverfront');
    assert.equal(portland.variance0, 200);
    await chooseSelect(page.getByLabel('Reporting month'), 'Oct 2026');
    await page.waitForFunction(async () => (await document.querySelector('revo-grid.workbench-grid').getVisibleSource()).find(row => row.label === 'Portland Riverfront')?.ratio0 === null);
    await page.getByRole('searchbox').fill('Barcelona Poblenou');
    const empty = (await read()).find(row => row.label === 'Barcelona Poblenou');
    assert.equal(empty.ratio0, null);
  } finally { await page.close(); }
});

test('sales store profile exposes monthly data, navigation, export and editing', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  try {
    page.setDefaultTimeout(10000);
    await page.goto(url.replace('#campaign-performance', '#sales-to-target'));
    await page.getByRole('button', { name: 'Open Portland Riverfront' }).click();
    const dialog = page.getByRole('dialog');
    assert.match(await dialog.innerText(), /store-001/);
    assert.match(await dialog.getByRole('region', { name: 'Against Target' }).innerText(), /97%.*\$372k of \$383k/s);
    await dialog.getByRole('button', { name: 'Next store' }).click();
    assert.match(await dialog.innerText(), /Seattle Fremont/);
    await dialog.getByRole('button', { name: 'Previous store' }).click();
    await dialog.getByRole('tab', { name: 'Months' }).click();
    const table = dialog.getByRole('table', { name: /Portland Riverfront/ });
    assert.match(await table.innerText(), /Sep 2026.*\$372k.*\$383k/s);
    assert.match(await table.innerText(), /Oct 2026.*None/s);
    await dialog.getByRole('tab', { name: 'Details' }).click();
    assert.match(await dialog.innerText(), /May 17, 2014/);
    const [download] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: 'Export CSV' }).click()]);
    assert.equal(download.suggestedFilename(), 'portland-riverfront-sales.csv');
    await dialog.getByRole('button', { name: 'Edit', exact: true }).click();
    assert.equal(await dialog.getByLabel('FY26 Sales Target').inputValue(), '4549900');
    await dialog.getByLabel('FY26 Sales Target').fill('12000000');
    await dialog.getByRole('button', { name: 'Save Changes' }).click();
    await dialog.getByRole('tab', { name: 'Details' }).click();
    assert.match(await dialog.innerText(), /\$12,000,000/);
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    const row = (await page.locator('revo-grid.workbench-grid').evaluate(grid => grid.getVisibleSource())).find(item => item.label === 'Portland Riverfront');
    assert.equal(row.actual0, 371600);
    assert.notEqual(row.variance0, -11600);
  } finally { await page.close(); }
});

test('sales store drawer supports keyboard tabs and creates a store without sales', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    page.setDefaultTimeout(10000);
    await page.goto(url.replace('#campaign-performance', '#sales-to-target'));
    await page.getByRole('button', { name: 'Open Portland Riverfront' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('tab', { name: 'Overview' }).focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await dialog.getByRole('tab', { name: 'Months' }).getAttribute('aria-selected'), 'true');
    await dialog.getByRole('button', { name: 'Edit', exact: true }).click();
    await dialog.getByRole('button', { name: 'Back', exact: true }).click();
    assert.equal(await dialog.getByRole('tab', { name: 'Overview' }).getAttribute('aria-selected'), 'true');
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Add Store' }).click();
    await dialog.getByLabel('Store name').fill('Lisbon Chiado');
    await chooseSelect(dialog.getByLabel('Country'), 'Spain');
    await dialog.getByLabel('FY26 Sales Target').fill('3200000');
    await dialog.getByRole('button', { name: 'Create Store' }).click();
    await dialog.getByRole('tab', { name: 'Months' }).click();
    assert.match(await dialog.getByRole('table').innerText(), /Nov 2025.*None/s);
    await dialog.getByRole('tab', { name: 'Details' }).click();
    assert.match(await dialog.innerText(), /EMEA/);
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('searchbox').fill('Lisbon Chiado');
    await page.getByRole('button', { name: 'Open Lisbon Chiado' }).waitFor();
    const row = (await page.locator('revo-grid.workbench-grid').evaluate(grid => grid.getVisibleSource())).find(item => item.label === 'Lisbon Chiado');
    assert.equal(row.ratio0, null);
  } finally { await page.close(); }
});

test('brand style chart plots individual contributions and responds to mode and filters', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    page.setDefaultTimeout(10000);
    await page.goto(url.replace('#campaign-performance', '#brand-scorecard'));
    await page.getByRole('button', { name: 'Styles', exact: true }).click();
    assert.equal(await selectValue(page.getByLabel('Charted metric')), 'Profit per Style');
    const fieldline = page.getByRole('group', { name: 'Wildhaven profit by style' });
    await fieldline.waitFor();
    assert.equal(await fieldline.locator('i').count(), 8);
    assert.equal(await page.locator('.brand-style-chart i.loss').count(), 4);
    assert.match(await page.locator('.brand-month-summary').innerText(), /Styles\s*44\s*At a loss\s*4\s*Best style/s);
    await page.getByRole('searchbox').fill('Wildhaven');
    await page.waitForFunction(() => document.querySelector('.brand-month-summary')?.textContent.includes('8At a loss1'));
    await page.getByRole('button', { name: 'Months', exact: true }).click();
    assert.equal(await selectValue(page.getByLabel('Charted metric')), 'Markdown');
    await page.getByRole('img', { name: 'Wildhaven monthly range for Markdown' }).waitFor();
    await chooseSelect(page.getByLabel('Charted metric'), 'Profit per Style');
    assert.equal(await page.getByRole('button', { name: 'Styles', exact: true }).getAttribute('aria-pressed'), 'true');
  } finally { await page.close(); }
});


test('brand profile exposes style and monthly data, buy call, navigation and export', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  try {
    page.setDefaultTimeout(10000);
    await page.goto(url.replace('#campaign-performance', '#brand-scorecard'));
    await page.getByRole('button', { name: 'Open Wildhaven' }).click();
    const dialog = page.getByRole('dialog');
    assert.match(await dialog.innerText(), /portfolio-001/);
    assert.match(await dialog.getByRole('region', { name: 'Against the Portfolio' }).innerText(), /Net Sales.*\$1\.64M.*\$11\.37M/s);
    await dialog.getByRole('button', { name: 'Next brand' }).click();
    assert.match(await dialog.innerText(), /Morrow Trail/);
    await dialog.getByRole('button', { name: 'Previous brand' }).click();
    await dialog.getByRole('group', { name: 'Next season call' }).getByRole('button', { name: 'Hold' }).click();
    assert.equal(await dialog.getByRole('group', { name: 'Next season call' }).getByRole('button', { name: 'Hold' }).getAttribute('aria-pressed'), 'true');
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await page.getByRole('button', { name: 'Open Wildhaven' }).click();
    assert.equal(await dialog.getByRole('group', { name: 'Next season call' }).getByRole('button', { name: 'Grow' }).getAttribute('aria-pressed'), 'true');
    await dialog.getByRole('tab', { name: 'Styles' }).click();
    const table = dialog.getByRole('table', { name: 'Wildhaven styles' });
    assert.match(await table.innerText(), /Orbit Trail Jacket/s);
    await dialog.getByRole('tab', { name: 'Months' }).click();
    assert.match(await dialog.getByRole('table', { name: 'Wildhaven by month' }).innerText(), /Oct 2025.*\$/s);
    await dialog.getByRole('tab', { name: 'Details' }).click();
    assert.match(await dialog.innerText(), /Lucas Moreau/);
    const [download] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: 'Export CSV' }).click()]);
    assert.equal(download.suggestedFilename(), 'wildhaven-scorecard.csv');
    await dialog.getByRole('button', { name: 'Edit', exact: true }).click();
    assert.equal(await selectValue(dialog.getByLabel('Tier')), 'Own Label');
    await chooseSelect(dialog.getByLabel('Tier'), 'Partner');
    await dialog.getByRole('button', { name: 'Save Changes' }).click();
    await dialog.getByRole('tab', { name: 'Details' }).click();
    assert.match(await dialog.innerText(), /Partner/);
    assert.match(await dialog.innerText(), /8 styles/);
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Open Sora Outdoor' }).click();
    await dialog.getByRole('tab', { name: 'Styles' }).click();
    const lossPoint = dialog.locator('.brand-profile__category-track i.loss').first();
    assert.match(await lossPoint.getAttribute('title'), /−\$/);
    const position = await lossPoint.evaluate(element => ({ point: parseFloat(element.style.left), zero: parseFloat(element.parentElement.style.getPropertyValue('--zero')) }));
    assert.ok(position.point < position.zero);
  } finally { await page.close(); }
});

test('brand drawer creates an onboarding brand with no invented sales', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    page.setDefaultTimeout(10000);
    await page.goto(url.replace('#campaign-performance', '#brand-scorecard'));
    await page.getByRole('button', { name: 'Add Brand' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Brand name').fill('New Example');
    await dialog.getByRole('button', { name: 'Create Brand' }).click();
    await dialog.getByRole('tab', { name: 'Overview' }).focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await dialog.getByRole('tab', { name: 'Styles' }).getAttribute('aria-selected'), 'true');
    assert.match(await dialog.innerText(), /No styles yet/);
    await dialog.getByRole('tab', { name: 'Months' }).click();
    assert.match(await dialog.innerText(), /No sales yet/);
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('searchbox').fill('New Example');
    await page.getByRole('button', { name: 'Open New Example' }).waitFor();
  } finally { await page.close(); }
});

test('campaign drawer shows exact weekly results, audience metrics, pause and editing', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    page.setDefaultTimeout(10000); await page.goto(url);
    await page.getByRole('button', { name: 'Open Boreal Gloves Member Event' }).click();
    const dialog = page.getByRole('dialog');
    assert.match(await dialog.innerText(), /campaign-008/);
    assert.match(await dialog.getByRole('region', { name: 'Last 30 Days' }).innerText(), /2,049.*\$27\.05/s);
    await dialog.getByRole('button', { name: 'Pause', exact: true }).click();
    await dialog.getByRole('button', { name: 'Resume', exact: true }).waitFor();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await page.getByRole('button', { name: 'Open Boreal Gloves Member Event' }).click();
    await dialog.getByRole('button', { name: 'Pause', exact: true }).waitFor();
    await dialog.getByRole('tab', { name: 'Performance' }).click();
    const table = dialog.getByRole('table', { name: 'Boreal Gloves Member Event weekly performance' });
    assert.match(await table.innerText(), /Sep 6 to Sep 12.*\$9,454.*370.*\$25\.55/s);
    assert.match(await table.innerText(), /30 days.*\$55,433.*2,049/s);
    await dialog.getByRole('button', { name: 'Spend', exact: true }).click();
    const chart = dialog.getByRole('group', { name: 'Boreal Gloves Member Event daily spend' });
    const point = chart.locator('[data-part="item"][tabindex="0"]');
    await point.waitFor();
    assert.match(await point.getAttribute('aria-label'), /^Day 1: \$/);
    await point.focus();
    const tooltip = page.getByRole('tooltip');
    await tooltip.getByText(/Day 1: \$/).waitFor();
    await page.keyboard.press('ArrowRight');
    await tooltip.getByText(/Day 2: \$/).waitFor();
    await dialog.getByRole('tab', { name: 'Audience' }).click();
    assert.match(await dialog.getByRole('region', { name: 'Buyer Mix' }).innerText(), /1,805.*88%.*244.*12%/s);
    await dialog.getByRole('button', { name: 'Edit', exact: true }).click();
    assert.equal(await dialog.getByLabel('30-Day Budget').inputValue(), '65000');
    await dialog.getByLabel('30-Day Budget').fill('80000');
    await dialog.getByRole('button', { name: 'Save Changes' }).click();
    assert.match(await dialog.getByRole('region', { name: 'Budget' }).innerText(), /\$80,000/);
    assert.match(await dialog.getByRole('region', { name: 'Budget' }).innerText(), /\$55,433/);
  } finally { await page.close(); }
});

test('campaign editor creates an undelivered campaign and supports keyboard tabs', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    page.setDefaultTimeout(10000); await page.goto(url);
    await page.getByRole('button', { name: 'New Campaign' }).click(); const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Campaign name').fill('New Sample Campaign');
    await dialog.getByLabel('30-Day Budget').fill('12000');
    await dialog.getByRole('button', { name: 'Create Campaign' }).click();
    assert.match(await dialog.innerText(), /No delivery yet/);
    await dialog.getByRole('tab', { name: 'Overview' }).focus(); await page.keyboard.press('ArrowRight');
    assert.equal(await dialog.getByRole('tab', { name: 'Performance' }).getAttribute('aria-selected'), 'true');
    assert.match(await dialog.getByRole('table').innerText(), /30 days.*\$0.*0/s);
    await dialog.getByRole('tab', { name: 'Audience' }).click();
    assert.match(await dialog.getByRole('region', { name: 'Unit Costs' }).innerText(), /CPM.*–.*CPC.*–/s);
  } finally { await page.close(); }
});


test('product profile shows promotions, records decisions and recomputes edited costs', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    page.setDefaultTimeout(10000); await page.goto(url.replace('#campaign-performance', '#product-kpis'));
    await page.getByRole('button', { name: 'Open Granite Trail Boot' }).click(); const dialog = page.getByRole('dialog');
    assert.match(await dialog.getByRole('region', { name: 'Performance' }).innerText(), /\$314\.0K.*\$174\.9K.*6\.7%.*16\.2%/s);
    await dialog.getByRole('tab', { name: 'Promotions' }).click();
    const promotions = dialog.getByRole('table', { name: 'Granite Trail Boot promotions' });
    assert.match(await promotions.innerText(), /Community Weekend.*\$50\.8K.*\+\$728/s);
    assert.match(await promotions.innerText(), /Lift margin \+\$4\.9K, subsidy −\$6\.1K/);
    const decisionTrigger = dialog.getByText('Set Decision', { exact: true });
    await decisionTrigger.click();
    await dialog.getByRole('menuitem', { name: 'Stop Promos', exact: true }).focus();
    await page.keyboard.press('Escape');
    assert.equal(await decisionTrigger.evaluate(node => node.parentElement.open), false);
    assert.equal(await decisionTrigger.evaluate(node => node === document.activeElement), true);
    await decisionTrigger.click();
    await dialog.getByRole('menuitem', { name: 'Stop Promos', exact: true }).click();
    await dialog.getByRole('tab', { name: 'Activity' }).click();
    assert.match(await dialog.innerText(), /Decision set to Stop Promos/);
    const decisionToast = dialog.locator('.rv-toast').filter({ hasText: 'Decision updated.' });
    await decisionToast.getByRole('button', { name: 'Undo', exact: true }).click();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Open Granite Trail Boot' }).click();
    assert.match(await dialog.getByRole('region', { name: 'Details' }).innerText(), /No Change/);
    await dialog.getByText('Set Decision', { exact: true }).click();
    const capTrigger = dialog.getByText('Cap Discount', { exact: true });
    await capTrigger.click();
    await dialog.getByRole('menuitem', { name: '25%', exact: true }).focus();
    await page.keyboard.press('Escape');
    assert.equal(await capTrigger.evaluate(node => node.parentElement.open), false);
    assert.equal(await capTrigger.evaluate(node => node === document.activeElement), true);
    await capTrigger.click();
    await dialog.getByRole('menuitem', { name: '25%', exact: true }).click();
    assert.match(await dialog.getByRole('region', { name: 'Details' }).innerText(), /Cap at 25%/);
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await page.getByRole('button', { name: 'Open Granite Trail Boot' }).click();
    await dialog.getByRole('button', { name: 'Edit Product' }).click();
    const landed = dialog.getByRole('spinbutton', { name: 'Landed Cost', exact: true });
    const initialLanded = Number(await landed.inputValue());
    await dialog.getByRole('button', { name: 'Increase Landed Cost' }).click();
    assert.equal(Number(await landed.inputValue()), initialLanded + 1);
    await landed.fill('50');
    await dialog.getByRole('button', { name: 'Save Changes' }).click();
    const savedToast = dialog.locator('.rv-toast').filter({ hasText: 'Product saved.' });
    await savedToast.waitFor();
    assert.equal(await savedToast.locator('svg').count() >= 1, true);
    assert.equal(await savedToast.locator('..').locator('..').getAttribute('data-position'), 'top-center');
    assert.equal(await page.locator('.workbench-notice').count(), 0);
    assert.match(await dialog.getByRole('region', { name: 'Performance' }).innerText(), /\$114\.3K/);
    await dialog.getByRole('tab', { name: 'Activity' }).click();
    assert.match(await dialog.innerText(), /Landed cost set to 50% of list/);
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    const ridge = (await page.locator('revo-grid').evaluate(grid => grid.getVisibleSource())).find(item => item.label === 'Granite Trail Boot');
    assert.equal(Math.round(ridge.profit), 174887);
    await page.getByRole('button', { name: 'Open Harbor Trail Runner' }).click();
    await dialog.getByRole('tab', { name: 'Activity' }).click();
    assert.match(await dialog.innerText(), /Inventory plan reviewed.*Oct 4/s);
  } finally { await page.close(); }
});

test('new product starts without sales and supports keyboard tabs', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    page.setDefaultTimeout(10000); await page.goto(url.replace('#campaign-performance', '#product-kpis'));
    await page.getByRole('button', { name: 'Add Product' }).click(); const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Product name').fill('New Sample Product'); await dialog.getByLabel('List Price').fill('100');
    await dialog.getByRole('button', { name: 'Add Product', exact: true }).click();
    assert.match(await dialog.innerText(), /No sales/i);
    await dialog.getByRole('tab', { name: 'Overview' }).focus(); await page.keyboard.press('ArrowRight');
    assert.equal(await dialog.getByRole('tab', { name: 'Promotions' }).getAttribute('aria-selected'), 'true');
    assert.match(await dialog.innerText(), /0 events, 0 weeks on promo/);
  } finally { await page.close(); }
});

test('scale-up screening controls fit and work on mobile', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(url.replace('#campaign-performance', '#scale-up-index'));
    await revealCompany(page, 'Lumen Photonics');
    await page.getByRole('button', { name: 'Open Lumen Photonics' }).click();
    const dialog = page.getByRole('dialog');
    const group = dialog.getByRole('group', { name: 'Founder still leads it' });
    const bounds = await group.boundingBox();
    const card = await dialog.getByRole('region', { name: 'Screen' }).boundingBox();
    assert.ok(bounds.x >= card.x && bounds.x + bounds.width <= card.x + card.width, 'all three answers fit within the screening card');
    await group.getByRole('button', { name: 'N/A' }).click();
    assert.equal(await dialog.getByRole('group', { name: 'Founder still leads it' }).getByRole('button', { name: 'N/A' }).getAttribute('aria-pressed'), 'true');
  } finally { await page.close(); }
});

test('brand scorecard keeps overall rate rankings pinned and updates them with filters', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url.replace('#campaign-performance', '#brand-scorecard'));
    const footer = page.locator('revo-grid.workbench-grid revogr-data[type="rowPinEnd"]');
    await footer.getByText('Overall rank', { exact: true }).waitFor();
    for (const selector of ['.rv-visual-summary', '.rv-visual-section', '.rv-visual-cell__text', '.rv-visual-decision', '.rv-strip-plot']) {
      await page.locator(selector).first().waitFor();
    }
    const collapse = page.getByRole('button', { name: 'Collapse Sales' });
    assert.equal(await collapse.getAttribute('aria-expanded'), 'true');
    assert.equal(await collapse.locator('.rv-expand-icon').count(), 1);
    await collapse.focus(); await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Expand Sales' }).waitFor();
    await page.getByRole('button', { name: 'Expand Sales' }).click();
    await page.getByRole('button', { name: 'Collapse Sales' }).waitFor();
    const ranks = () => footer.locator('.brand-overall-rank').allTextContents();
    await page.waitForFunction(() => document.querySelectorAll('revogr-data[type="rowPinEnd"] .brand-overall-rank').length === 7);
    assert.deepEqual(await ranks(), ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th']);
    await page.getByRole('searchbox').fill('Wildhaven');
    await page.waitForFunction(() => document.querySelectorAll('revogr-data[type="rowPinEnd"] .brand-overall-rank').length === 1);
    assert.deepEqual(await ranks(), ['1st']);
  } finally { await page.close(); }
});

test('brand spread charts put better values to the right and omit missing comparisons', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    await page.goto(url.replace('#campaign-performance', '#brand-scorecard'));
    const fieldline = page.locator('.rv-strip-plot__point[title^="Wildhaven · 8.5%"]');
    const tarnwick = page.locator('.rv-strip-plot__point[title^="Morrow Trail · 9.4%"]');
    await fieldline.waitFor();
    assert.ok(parseFloat(await fieldline.evaluate(el => el.style.left)) > parseFloat(await tarnwick.evaluate(el => el.style.left)));
    assert.equal(await page.locator('.rv-strip-plot__point[title^="Morrow Trail · 0.0%"]') .count(), 0);
    assert.ok(await page.locator('.rv-strip-plot__reference').count() > 0);
    const dot = page.locator('.rv-strip-plot__point').first();
    assert.ok(await dot.getAttribute('title'));
    await dot.hover();
    await dot.evaluate(el => el.getAnimations().forEach(animation => animation.finish()));
    assert.ok(await dot.evaluate(el => new DOMMatrix(getComputedStyle(el).transform).a > 1.4));
  } finally { await page.close(); }
});

test('brand scorecard compact section control exposes its expanded state', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(url.replace('#campaign-performance', '#brand-scorecard'));
    const collapse = page.getByRole('button', { name: 'Collapse Sales' });
    await collapse.waitFor();
    assert.equal(await collapse.getAttribute('aria-expanded'), 'true');
    await collapse.click();
    const expand = page.getByRole('button', { name: 'Expand Sales' });
    await expand.waitFor();
    assert.equal(await expand.getAttribute('aria-expanded'), 'false');
  } finally { await page.close(); }
});

test('brand scorecard search shortcut focuses search without intercepting typing', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url.replace('#campaign-performance', '#brand-scorecard'));
    await page.getByRole('button', { name: 'Open Wildhaven' }).waitFor();
    await page.keyboard.press('/');
    assert.equal(await page.getByRole('searchbox').evaluate(el => el === document.activeElement), true);
    await page.keyboard.type('a/b');
    assert.equal(await page.getByRole('searchbox').inputValue(), 'a/b');
  } finally { await page.close(); }
});

test('cohort benchmark tooltip remains available without opening a dialog', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url.replace('#campaign-performance', '#patient-cohorts'));
    const cell = page.locator('.cohort-heat[data-benchmark-label]').first();
    await cell.waitFor();
    assert.ok(await cell.evaluate(element => element.classList.contains('rv-heat-action')));
    await cell.focus();
    const card = page.locator('.rv-benchmark-card');
    await card.waitFor();
    const tooltip = page.locator('.grid-tooltip').filter({ has: card });
    const id = await tooltip.getAttribute('id');
    assert.ok(id);
    assert.ok((await cell.getAttribute('aria-describedby')).split(/\s+/).includes(id));
    assert.match(await card.innerText(), /answers|Cohort average/);
    await page.keyboard.press('Escape');
    await card.waitFor({ state: 'hidden' });
    await cell.click();
    assert.equal(await page.getByRole('dialog', { name: 'Signal details' }).count(), 0);
    await page.mouse.move(0, 0);
    await cell.hover();
    await page.locator('.grid-tooltip .rv-benchmark-card').waitFor();
  } finally { await page.close(); }
});

test('campaign metrics and buyer share use shared cell renderers', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Boreal Gloves Member Event' }).waitFor();
    const metrics = page.locator('.rv-metric-stack');
    await metrics.first().waitFor();
    assert.ok(await metrics.count() >= 3);
    assert.match(await metrics.first().innerText(), /\$.*% of/s);
    const share = page.getByRole('progressbar', { name: 'Share of new buyers' }).first();
    await share.waitFor();
    assert.equal(Math.round(Number(await share.getAttribute('aria-valuenow'))), 88);
    assert.equal(await share.getAttribute('aria-valuemax'), '100');
    const geometry = await share.evaluate(el => {
      const track = el.getBoundingClientRect();
      const cell = el.closest('.rgCell').getBoundingClientRect();
      const label = el.parentElement.querySelector('.progress-line-label').getBoundingClientRect();
      return { trackWidth: track.width, trackLeft: track.left, cellLeft: cell.left, trackRight: track.right, labelLeft: label.left, cellRight: cell.right };
    });
    assert.ok(geometry.trackWidth >= 50, JSON.stringify(geometry));
    assert.ok(geometry.trackLeft >= geometry.cellLeft && geometry.trackRight <= geometry.labelLeft && geometry.labelLeft < geometry.cellRight, JSON.stringify(geometry));
    assert.equal(await share.locator('.progress-line-bar').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(102, 71, 240)');
  } finally { await page.close(); }
});

test('campaign compact grid configurator controls column visibility', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Boreal Gloves Member Event' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Settings', exact: true }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Columns', exact: true }).count(), 0);
    const panel = page.getByRole('region', { name: 'Grid configurator' });
    const columns = panel.getByRole('button', { name: /Columns/ });
    await columns.waitFor();
    const gridHeight = await page.locator('.campaign-grid-shell > revo-grid').evaluate(el => el.getBoundingClientRect().height);
    assert.ok(Math.abs((await panel.boundingBox()).height - gridHeight) <= 1);
    const search = panel.getByRole('searchbox', { name: 'Search columns' });
    assert.equal(await search.isVisible(), false);
    await columns.click();
    const gridBox = await page.locator('.campaign-grid-shell > revo-grid').boundingBox();
    const expandedBox = await panel.boundingBox();
    assert.ok(Math.abs(expandedBox.height - (gridHeight - 12)) <= 1);
    assert.ok(Math.abs(expandedBox.y - gridBox.y - 6) <= 1);
    assert.equal(await panel.getByRole('button', { name: 'Collapse configurator' }).count(), 0);
    assert.equal(await columns.isVisible(), true);
    await columns.click();
    assert.equal(await search.isVisible(), false);
    await columns.click();
    await search.fill('Trend');
    const icon = panel.locator('.rv-configurator-action-button [data-icon]').first();
    await icon.waitFor();
    assert.equal(await icon.evaluate(el => getComputedStyle(el, '::before').content), 'none');
    assert.equal(await icon.locator('svg').count(), 1);
    assert.notEqual(await page.getByRole('button', { name: 'Filter', exact: true }).evaluate(el => getComputedStyle(el, '::before').content), 'none');
    const toggle = panel.getByRole('checkbox', { name: 'Show Trend' });
    await toggle.uncheck();
    await page.waitForFunction(() => document.querySelector('revo-grid')?.hideColumns?.includes('trend'));
    await toggle.check();
    await page.waitForFunction(() => !document.querySelector('revo-grid')?.hideColumns?.includes('trend'));
    await search.fill('selected');
    assert.equal(await panel.getByRole('checkbox', { name: 'Show selected' }).count(), 0);
    await search.fill('actions');
    assert.equal(await panel.getByRole('checkbox', { name: 'Show actions' }).count(), 0);
  } finally { await page.close(); }
});

test('campaign editor uses shared dropdowns and releases open menus', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'New Campaign' }).click();
    const dialog = page.getByRole('dialog');
    assert.equal(await dialog.locator('select').count(), 0);
    const channel = dialog.getByRole('combobox', { name: 'Channel' });
    await channel.focus();
    await page.keyboard.press('Enter');
    await page.getByRole('option', { name: 'Twitch', exact: true }).waitFor();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    assert.match(await channel.innerText(), /Twitch/);
    await channel.click();
    await page.getByRole('option', { name: 'TikTok', exact: true }).click();
    assert.match(await channel.innerText(), /TikTok/);
    await dialog.getByRole('combobox', { name: 'Type' }).click();
    await page.getByRole('option', { name: 'Retargeting', exact: true }).waitFor();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(await page.getByRole('listbox').count(), 0);
  } finally { await page.close(); }
});

test('campaign trend chart cleans up when metrics and tabs change', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url.replace('#campaign-performance', '#campaign-performance'));
    await page.getByRole('button', { name: 'Open Boreal Gloves Member Event' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('tab', { name: 'Performance' }).click();
    const metricSwitch = dialog.getByRole('group', { name: 'Daily trend metric' });
    const dimensions = await metricSwitch.evaluate(element => ({ height: element.getBoundingClientRect().height, itemHeight: element.querySelector('button').getBoundingClientRect().height }));
    assert.ok(dimensions.height >= 31 && dimensions.itemHeight <= dimensions.height, `metric switch should not be clipped: ${JSON.stringify(dimensions)}`);
    const alignment = await metricSwitch.evaluate(element => {
      const box = element.getBoundingClientRect();
      const heading = element.closest('section').querySelector('.scale-profile__section-heading').getBoundingClientRect();
      return Math.abs((box.top + box.bottom) / 2 - (heading.top + heading.bottom) / 2);
    });
    assert.ok(alignment <= 2, `metric switch should be vertically centered in the title area (offset ${alignment}px)`);
    await dialog.getByRole('button', { name: 'Spend', exact: true }).click();
    await dialog.getByRole('button', { name: 'Conversions', exact: true }).click();
    await dialog.getByRole('button', { name: 'Spend', exact: true }).click();
    const chart = dialog.getByRole('group', { name: 'Boreal Gloves Member Event daily spend' });
    const target = chart.locator('[data-part="item"][tabindex="0"]');
    await target.focus();
    assert.match(await target.getAttribute('aria-label'), /^Day 1: \$/);
    await dialog.getByRole('tab', { name: 'Audience' }).click();
    await chart.waitFor({ state: 'detached' });
    assert.equal(await dialog.locator('[data-chart-renderer-policy]').count(), 0);
    await dialog.getByRole('tab', { name: 'Performance' }).click();
    await dialog.getByRole('group', { name: 'Boreal Gloves Member Event daily conversions' }).locator('[data-part="item"][tabindex="0"]').waitFor();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await dialog.locator('[data-chart-renderer-policy]').waitFor({ state: 'detached' });
  } finally { await page.close(); }
});

test('campaign AST filter applies to all campaign pages and clears', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Filter', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Campaign filters' });
    await dialog.getByRole('button', { name: 'Add condition' }).click();
    await dialog.getByRole('combobox', { name: 'Status filter operator' }).click();
    await page.getByRole('option', { name: 'is any of', exact: true }).click();
    await dialog.getByRole('combobox', { name: 'Add Status filter value' }).fill('Limited');
    await page.getByRole('option', { name: 'Limited', exact: true }).click();
    await dialog.getByRole('button', { name: 'Apply', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'Filter (active)' }).waitFor();
    await page.getByText('3 campaigns • 0 live in view • Sep 6 to Oct 5').waitFor();
    assert.equal((await page.locator('.cell-label .cell-action').allTextContents()).length, 3);
    await page.getByRole('button', { name: 'Filter (active)' }).click();
    await dialog.getByRole('button', { name: 'Reset', exact: true }).click();
    await dialog.getByRole('button', { name: 'Apply', exact: true }).click();
    await page.getByText('30 campaigns • 17 live in view • Sep 6 to Oct 5').waitFor();
  } finally { await page.close(); }
});

test('campaign trend chart fits mobile and supports keyboard inspection', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Boreal Gloves Member Event' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('tab', { name: 'Performance' }).click();
    const chart = dialog.getByRole('group', { name: 'Boreal Gloves Member Event daily conversions' });
    const target = chart.locator('[data-part="item"][tabindex="0"]');
    await target.focus();
    const box = await chart.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 390);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
    assert.match(await target.getAttribute('aria-label'), /^Day 1:/);
    await page.keyboard.press('ArrowRight');
    await page.getByRole('tooltip').getByText(/Day 2:/).waitFor();
  } finally { await page.close(); }
});


test('campaign bulk actions export selected rows, pause, and clear', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Boreal Gloves Member Event' }).waitFor();
    await page.getByRole('checkbox', { name: 'Select row 1', exact: true }).check();
    await page.getByRole('checkbox', { name: 'Select row 2', exact: true }).check();
    const bar = page.getByRole('toolbar', { name: 'Selected campaigns' });
    await bar.getByText(/2 selected.*spend/).waitFor();
    assert.equal(await bar.evaluate(el => getComputedStyle(el).borderTopWidth), '0px');
    assert.equal(await bar.evaluate(el => getComputedStyle(el).borderLeftWidth), '0px');
    const bulkHost = page.locator('.campaign-bulk-host');
    assert.equal(await bulkHost.evaluate(el => getComputedStyle(el).borderBottomWidth), '1px');
    assert.equal(await bulkHost.evaluate(el => getComputedStyle(el).borderBottomStyle), 'solid');
    const [download] = await Promise.all([page.waitForEvent('download'), bar.getByRole('button', { name: 'Export' }).click()]);
    const csv = await readFile(await download.path(), 'utf8');
    assert.match(csv, /Boreal Gloves Member Event/);
    assert.match(csv, /Hearth Stove Community Stories/);
    assert.doesNotMatch(csv, /Cove Hammock All Season/);
    await bar.getByRole('button', { name: 'Pause' }).click();
    await bar.waitFor({ state: 'hidden' });
    await page.locator('.rv-toast').getByText('2 campaigns paused.', { exact: true }).waitFor();
    assert.equal(await page.locator('.workbench-notice').isVisible(), false);
    await page.getByRole('checkbox', { name: 'Select row 1', exact: true }).check();
    await bar.getByRole('button', { name: 'Clear' }).click();
    await bar.waitFor({ state: 'hidden' });
    await page.waitForFunction(() => !document.querySelector('revo-grid .row-select-checkbox[aria-label=\"Select row 1\"]')?.checked);
  } finally { await page.close(); }
});

test('campaign bulk delete keeps selection across pages', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Boreal Gloves Member Event' }).waitFor();
    await page.getByRole('checkbox', { name: 'Select row 1', exact: true }).check();
    await page.getByRole('button', { name: 'Page 2', exact: true }).click();
    await page.getByRole('button', { name: 'Open Tidewater Rain Shell Member Event' }).waitFor();
    await page.getByRole('checkbox', { name: 'Select row 1', exact: true }).check();
    const bar = page.getByRole('toolbar', { name: 'Selected campaigns' });
    await bar.getByText(/2 selected/).waitFor();
    await bar.getByRole('button', { name: 'Delete' }).click();
    await page.getByText('2 campaigns removed.', { exact: true }).waitFor();
    await bar.waitFor({ state: 'hidden' });
    await page.getByText('28 campaigns • 16 live in view • Sep 6 to Oct 5').waitFor();
  } finally { await page.close(); }
});


test('demo pagination uses shared button presentation across layouts', async () => {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    try {
      for (const demo of ['campaign-performance', 'product-kpis', 'service-visits']) {
        await page.goto(url.replace('#campaign-performance', `#${demo}`));
        const current = page.locator('.rv-pagination-button[aria-current="page"]');
        const other = page.locator('.rv-pagination-button:not([aria-current]):not(:disabled)').first();
        await current.waitFor();
        const fontSizes = await page.locator('.rv-pagination-panel').evaluate(panel => {
          const selector = panel.querySelector('.rv-pagination-selector');
          if (!selector || getComputedStyle(selector).display === 'none') return null;
          const nodes = [panel.querySelector('.rv-pagination-button'), selector.querySelector('.dropdown-trigger'), selector.querySelector('.rv-pagination-label'), panel.querySelector(':scope > span:last-child')];
          return nodes.filter(Boolean).map(node => getComputedStyle(node).fontSize);
        });
        if (fontSizes) assert.equal(new Set(fontSizes).size, 1, `${demo} ${width} pagination font sizes: ${fontSizes}`);
        const states = await Promise.all([current.evaluate(el => ({ background: getComputedStyle(el).backgroundColor, border: getComputedStyle(el).borderColor })), other.evaluate(el => ({ background: getComputedStyle(el).backgroundColor, border: getComputedStyle(el).borderColor }))]);
        assert.notEqual(states[0].border, 'rgba(0, 0, 0, 0)', `${demo} ${width} current page border`);
        assert.equal(states[1].background, 'rgba(0, 0, 0, 0)', `${demo} ${width} inactive page background`);
        assert.equal(states[1].border, 'rgba(0, 0, 0, 0)', `${demo} ${width} inactive page border`);
      }
    } finally { await page.close(); }
  }
});


test('campaign delete toasts stack and undo independently', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Boreal Gloves Member Event' }).waitFor();
    for (const name of ['Boreal Gloves Member Event', 'Hearth Stove Community Stories']) {
      await page.getByRole('button', { name: `Open ${name}` }).click();
      await page.getByRole('button', { name: 'Delete campaign' }).click();
      const confirmation = page.getByRole('dialog', { name: 'Delete record?' });
      await confirmation.getByRole('button', { name: 'Save' }).click();
      await page.locator('.rv-toast').filter({ hasText: name }).waitFor();
    }
    const toasts = page.locator('.rv-toast');
    assert.equal(await toasts.count(), 2);
    await page.mouse.move(0, 0);
    await page.waitForTimeout(300);
    const collapsed = await Promise.all([toasts.nth(0).boundingBox(), toasts.nth(1).boundingBox()]);
    assert.ok(collapsed[1].y - collapsed[0].y < collapsed[0].height / 2);
    await toasts.first().hover();
    await page.waitForTimeout(300);
    const expanded = await Promise.all([toasts.nth(0).boundingBox(), toasts.nth(1).boundingBox()]);
    assert.ok(expanded[1].y >= expanded[0].y + expanded[0].height - 1);
    await page.locator('.rv-toast').filter({ hasText: 'Boreal Gloves Member Event' }).getByRole('button', { name: 'Undo' }).click();
    await page.getByRole('button', { name: 'Open Boreal Gloves Member Event' }).waitFor();
    assert.equal(await page.locator('.rv-toast').count(), 1);
    await page.locator('.rv-toast').filter({ hasText: 'Hearth Stove Community Stories' }).getByRole('button', { name: 'Undo' }).click();
    await page.getByRole('button', { name: 'Open Hearth Stove Community Stories' }).waitFor();
  } finally { await page.close(); }
});


test('campaign columns expose advanced filters and full-dataset slider bounds', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Boreal Gloves Member Event' }).waitFor();
    const grid = page.locator('.campaign-grid-shell > revo-grid');
    const config = await grid.evaluate(grid => ({ predefined: grid.filter.predefinedFilters, types: Object.fromEntries(grid.columns.map(column => [column.prop, column.filter])) }));
    assert.equal(config.predefined, true);
    assert.deepEqual(config.types.label, ['selection']);
    assert.deepEqual(config.types.status, ['selection']);
    for (const prop of ['spend', 'conversions', 'cpa', 'roas', 'buyers']) assert.deepEqual(config.types[prop], ['number', 'slider']);
    assert.equal(config.types.trend, false);
    const panel = page.getByRole('region', { name: 'Grid configurator' });
    await panel.getByRole('button', { name: /Columns/ }).click();
    const plus = panel.getByRole('button', { name: 'Add Spend to' });
    const gear = panel.getByRole('button', { name: 'Actions for Spend column' });
    await plus.hover();
    await page.getByRole('tooltip').filter({ hasText: 'Add Spend to' }).waitFor();
    const plusColor = await plus.evaluate(el => getComputedStyle(el).backgroundColor);
    await gear.hover();
    await page.getByRole('tooltip').filter({ hasText: 'Actions for Spend column' }).waitFor();
    assert.equal(await gear.evaluate(el => getComputedStyle(el).backgroundColor), plusColor);
    assert.equal(await gear.getAttribute('title'), null);
    await plus.click();
    await page.locator('.pivot-field-action-popover').getByRole('button', { name: 'Filters' }).click();
    const popup = page.locator('.filter-panel-dialog');
    await popup.getByLabel('Minimum value').waitFor();
    const actual = await popup.getByLabel('Minimum value').inputValue();
    const expected = await grid.evaluate(grid => grid.filter.slider.getBounds({ columnProp: 'spend', column: grid.columns.find(c => c.prop === 'spend') }).min);
    assert.equal(Number(actual), expected);
    assert.equal(await popup.locator('select').first().inputValue(), 'eqN');
  } finally { await page.close(); }
});


test('campaign AST selection search stays above its filter popup', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Boreal Gloves Member Event' }).waitFor();
    await page.getByRole('button', { name: 'Filter', exact: true }).click();
    await page.getByRole('button', { name: 'Add condition' }).click();
    const condition = page.locator('.grouped-filter-sentence').first();
    const heights = await condition.locator('.dropdown-trigger, .grouped-filter-tag-editor__control').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
    assert.deepEqual(heights, [32, 32, 32]);
    await page.getByRole('combobox', { name: 'Status filter field' }).click();
    assert.equal(await page.getByRole('option', { name: 'selected', exact: true }).count(), 0);
    assert.equal(await page.getByRole('option', { name: 'actions', exact: true }).count(), 0);
    await page.keyboard.press('Escape');
    const search = page.getByRole('combobox', { name: 'Add Status filter value' });
    await search.fill('Li');
    assert.equal(await search.evaluate(node => getComputedStyle(node).boxShadow), 'none');
    const list = page.getByRole('listbox', { name: /Status/ });
    await list.getByRole('option', { name: 'Live', exact: true }).waitFor();
    assert.equal(await list.getByRole('option', { name: 'Live', exact: true }).evaluate(el => getComputedStyle(el).justifyContent), 'flex-start');
    assert.equal(await condition.locator('.grouped-filter-tag-editor__control').evaluate(el => getComputedStyle(el).outlineStyle), 'none');
    assert.equal(await list.evaluate(el => el.closest('[popover]')?.matches(':popover-open')), true);
    await list.getByRole('option', { name: 'Live', exact: true }).click();
    assert.ok((await condition.locator('.grouped-filter-tag').first().boundingBox()).height <= 25);
    await search.fill('Lear');
    await page.getByRole('option', { name: 'Learning', exact: true }).click();
    assert.equal(await condition.locator('.grouped-filter-tag').count(), 2);
    assert.ok((await condition.locator('.grouped-filter-tag').last().boundingBox()).height <= 25);
    await condition.getByRole('button', { name: 'Remove Learning' }).click();
    assert.equal(await condition.locator('.grouped-filter-tag').count(), 1);
    const dropdownHeights = await condition.locator('.dropdown-trigger').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
    assert.deepEqual(dropdownHeights, [32, 32]);
    await page.getByRole('button', { name: 'Apply', exact: true }).click();
  } finally { await page.close(); }
});

test('campaign AST numeric fields use their configured slider', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Boreal Gloves Member Event' }).waitFor();
    await page.getByRole('button', { name: 'Filter', exact: true }).click();
    await page.getByRole('button', { name: 'Add condition' }).click();
    await page.getByRole('combobox', { name: 'Status filter field' }).click();
    await page.getByRole('option', { name: 'Spend', exact: true }).click();
    const slider = page.locator('.grouped-filter-sentence input[type=range]');
    await slider.waitFor();
    assert.ok(Number(await slider.getAttribute('max')) > 0);
    const before = await slider.boundingBox();
    await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
    await page.mouse.down();
    await page.mouse.move(before.x + before.width * 0.85, before.y + before.height / 2, { steps: 10 });
    const during = await slider.boundingBox();
    assert.ok(Math.abs(during.width - before.width) < 1, `slider width changed from ${before.width} to ${during.width}`);
    await page.mouse.up();
    const exact = page.getByRole('textbox', { name: 'Spend exact filter value' });
    const value = await slider.inputValue();
    assert.equal(await exact.inputValue(), new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(Number(value)));
    await exact.focus();
    await page.waitForFunction(() => document.querySelector('.grouped-filter-slider-input')?.value === document.querySelector('.grouped-filter-sentence input[type=range]')?.value);
    await exact.fill('1000');
    await exact.press('Tab');
    await page.waitForFunction(() => Number(document.querySelector('.grouped-filter-sentence input[type=range]')?.value) === 1000);
    assert.equal(Number(await slider.inputValue()), 1000);
    await exact.fill('999999');
    assert.equal(await exact.getAttribute('aria-invalid'), 'true');
    await exact.press('Tab');
    assert.equal(Number(await slider.inputValue()), 1000);
    await exact.focus();
    await exact.press('Escape');
    assert.equal(await exact.getAttribute('aria-invalid'), null);
  } finally { await page.close(); }
});


test('campaign AST long selected values stay inside the field', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Boreal Gloves Member Event' }).waitFor();
    await page.getByRole('button', { name: 'Filter', exact: true }).click();
    await page.getByRole('button', { name: 'Add condition' }).click();
    await page.getByRole('combobox', { name: 'Status filter field' }).click();
    await page.getByRole('option', { name: 'Campaign', exact: true }).click();
    const search = page.getByRole('combobox', { name: 'Add Campaign filter value' });
    await search.fill('a');
    const suggestions = page.getByRole('listbox', { name: /Campaign filter values/ });
    await suggestions.getByRole('option').first().waitFor();
    assert.ok(await suggestions.getByRole('option').count() > 8);
    const menu = await suggestions.boundingBox();
    const trigger = await search.boundingBox();
    assert.ok(menu.width > trigger.width);
    assert.ok(menu.height > 176 && menu.y + menu.height <= 900);
    await search.fill('Cove Hammock All Season');
    await page.getByRole('option', { name: 'Cove Hammock All Season', exact: true }).click();
    const tag = await page.locator('.grouped-filter-tag').boundingBox();
    const control = await page.locator('.grouped-filter-tag-editor__control').boundingBox();
    assert.ok(tag.x >= control.x && tag.x + tag.width <= control.x + control.width);
    await page.getByRole('button', { name: 'Remove Cove Hammock All Season' }).click();
    assert.equal(await page.locator('.grouped-filter-tag').count(), 0);
  } finally { await page.close(); }
});

test('scrolling inside a column filter does not scroll the page behind it', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 700 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Boreal Gloves Member Event' }).waitFor();
    await page.evaluate(() => { document.body.style.minHeight = '2400px'; });
    await page.locator('.rgHeaderCell').filter({ hasText: 'Spend' }).first().click();
    const menu = page.locator('.rv-context-menu:visible');
    await menu.getByRole('menuitem', { name: 'Filter', exact: true }).hover();
    await menu.getByRole('menuitem', { name: 'Open filter' }).click();
    const popup = page.locator('.filter-panel-dialog:visible');
    await popup.waitFor();
    const box = await popup.boundingBox();
    const before = await page.evaluate(() => window.scrollY);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => window.scrollY), before);
  } finally { await page.close(); }
});

test('shared filter popover contains wheel scrolling and releases it on close', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 700 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Boreal Gloves Member Event' }).waitFor();
    await page.evaluate(() => { document.body.style.minHeight = '2400px'; });
    await page.getByRole('button', { name: 'Filter', exact: true }).click();
    const panel = page.getByRole('dialog', { name: 'Campaign filters' });
    await panel.waitFor();
    const box = await panel.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 450);
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => window.scrollY), 0);
    await panel.evaluate(host => {
      const list = document.createElement('div');
      list.dataset.scrollTest = '';
      Object.assign(list.style, { height: '90px', overflowY: 'auto' });
      const content = document.createElement('div');
      content.style.height = '600px';
      list.append(content);
      host.append(list);
    });
    const list = panel.locator('[data-scroll-test]');
    const listBox = await list.boundingBox();
    await page.mouse.move(listBox.x + listBox.width / 2, listBox.y + listBox.height / 2);
    await page.mouse.wheel(0, 200);
    await page.waitForFunction(() => document.querySelector('[data-scroll-test]')?.scrollTop > 0);
    assert.equal(await page.evaluate(() => window.scrollY), 0);
    await list.evaluate(el => { el.scrollTop = el.scrollHeight; });
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => window.scrollY), 0);
    await page.keyboard.press('Escape');
    await panel.waitFor({ state: 'hidden' });
    await page.mouse.move(5, 5);
    await page.mouse.wheel(0, 450);
    await page.waitForFunction(() => window.scrollY > 0);
  } finally { await page.close(); }
});

test('campaign column filter opens by its header', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Boreal Gloves Member Event' }).waitFor();
    const header = page.locator('.rgHeaderCell').filter({ hasText: 'Spend' }).first();
    const rect = await header.boundingBox();
    await header.click();
    const menu = page.locator('.rv-context-menu:visible');
    await menu.getByRole('menuitem', { name: 'Filter', exact: true }).hover();
    await menu.getByRole('menuitem', { name: 'Open filter' }).click();
    const popup = page.locator('.filter-panel-dialog:visible');
    await popup.waitFor();
    assert.equal(await popup.evaluate(element => getComputedStyle(element).animationName), 'none');
    const launcher = await popup.getByRole('button', { name: 'Groups' }).boundingBox();
    const title = await popup.locator('.filter-slider-title').boundingBox();
    const slider = await popup.locator('.range_container').boundingBox();
    assert.ok(title.y >= launcher.y + launcher.height);
    assert.ok(slider.y >= title.y + title.height);
    assert.ok(Math.abs(title.x - slider.x) < 2);
    const box = await popup.boundingBox();
    assert.ok(box.x > 100 && Math.abs(box.x - rect.x) < 100);
    assert.ok(Math.abs(box.y - (rect.y + rect.height)) < 25);
    await popup.getByLabel('Maximum value').fill('7230');
    await popup.getByLabel('Maximum value').press('Tab');
    await page.waitForFunction(async () => {
      const grid = document.querySelector('.campaign-grid-shell > revo-grid');
      const source = await grid?.getSource();
      return source?.length > 0 && source.every(row => row.spend <= 7230);
    });
    const total = await page.locator('.campaign-grid-shell > revo-grid').evaluate(async grid => (await grid.getSource()).length);
    assert.ok(total > 0);
  } finally { await page.close(); }
});

test('campaign header menu opens the anchored column chooser', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Boreal Gloves Member Event' }).waitFor();
    const header = page.locator('.rgHeaderCell').filter({ hasText: 'Spend' }).first();
    await header.click();
    await page.locator('.rv-context-menu:visible').getByRole('menuitem', { name: 'Manage columns' }).click();
    const popup = page.locator('.rv-column-dialog--popover:visible');
    await popup.waitFor();
    assert.equal(await page.locator('dialog.rv-column-dialog[open]').count(), 0);
    assert.equal(await popup.getByText('selected', { exact: true }).count(), 0);
    assert.equal(await popup.getByText('actions', { exact: true }).count(), 0);
    await popup.getByPlaceholder('Search...').fill('Spend');
    await page.mouse.click(10, 10);
    await popup.waitFor({ state: 'hidden' });
  } finally { await page.close(); }
});

test('collapsed brand sections fit their rank and expand control in one row', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url.replace('#campaign-performance', '#brand-scorecard'));
    for (const name of ['Sales', 'Margin', 'Customers', 'Stock']) {
      await page.getByRole('button', { name: `Collapse ${name}` }).click();
      const action = page.getByRole('button', { name: `Expand ${name}` });
      await action.waitFor();
      const section = page.locator('.brand-section-compact').filter({ has: action });
      assert.equal(await section.locator('.rv-visual-section__title').innerText(), name);
      assert.match(await section.locator('.rv-visual-section__value').innerText(), /^\d+ of \d+$/);
      const bounds = await section.boundingBox();
      for (const element of [action, section.locator('.rv-visual-section__title'), section.locator('.rv-visual-section__value')]) {
        const child = await element.boundingBox();
        assert.ok(child.y >= bounds.y - 1 && child.y + child.height <= bounds.y + bounds.height + 1, `${name} content fits within the collapsed row`);
      }
      assert.equal(await section.locator('.brand-leaders').count(), 0);
    }
    await page.getByRole('button', { name: 'Expand Sales' }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Collapse Sales' }).waitFor();
    assert.ok(await page.locator('.brand-section.sales .brand-leaders').count() > 0);
  } finally { await page.close(); }
});

test('product reporting periods use the shared segmented switch', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url.replace('#campaign-performance', '#product-kpis'));
    const group = page.getByRole('group', { name: 'Reporting period' });
    const current = group.getByRole('button', { name: '13W, last 13 weeks' });
    await current.waitFor();
    assert.equal(await current.getAttribute('aria-pressed'), 'true');
    assert.ok(await group.evaluate(element => element.classList.contains('rv-segmented-switch') && !element.classList.contains('rv-calendar-period-selector')));
    await current.focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.querySelector('[aria-label="Reporting period"] [aria-label="26W, last 26 weeks"]')?.getAttribute('aria-pressed') === 'true');
    await page.getByText(/26 weeks to Oct 11/).waitFor();
    await group.getByRole('button', { name: '4W, last 4 weeks' }).click();
    await page.getByText(/4 weeks to Oct 11/).waitFor();
  } finally { await page.close(); }
});

test('province expand arrows open and close multiple groups', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url.replace('#campaign-performance', '#scale-up-index'));
    for (const name of ['South Holland', 'Drenthe', 'Groningen']) {
      await page.locator('revo-grid.workbench-grid').evaluate(async (grid, province) => {
        const rows = await grid.getVisibleSource();
        await grid.scrollToRow(rows.findIndex(row => row.provinceHead && row.province === province));
      }, name);
      const expand = page.getByRole('button', { name: `Expand ${name}`, exact: true }).first();
      await expand.waitFor();
      assert.equal(await expand.locator('.rv-expand-icon.is-expand').count(), 1);
      await expand.locator('.rv-expand-icon').click();
      const collapse = page.getByRole('button', { name: `Collapse ${name}`, exact: true }).first();
      await collapse.waitFor();
      assert.equal(await collapse.getAttribute('aria-expanded'), 'true');
      assert.equal(await collapse.locator('.rv-expand-icon.is-collapse').count(), 1);
      await collapse.locator('.rv-expand-icon').click();
      await expand.waitFor();
    }
    await page.locator('revo-grid.workbench-grid').evaluate(async grid => {
      const rows = await grid.getVisibleSource();
      await grid.scrollToRow(rows.findIndex(row => row.provinceHead && row.province === 'South Holland'));
    });
    const keyboard = page.getByRole('button', { name: 'Expand South Holland', exact: true }).first();
    await keyboard.focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Collapse South Holland', exact: true }).first().waitFor();
  } finally { await page.close(); }
});

test('province header uses the icon for its next fold action', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url.replace('#campaign-performance', '#scale-up-index'));
    const fold = page.getByRole('button', { name: 'Fold every province' });
    await fold.waitFor();
    assert.equal(await fold.locator('.rv-expand-icon.is-expand').count(), 1);
    await fold.click();
    await page.getByRole('button', { name: /^Collapse / }).first().waitFor();
    await page.waitForFunction(() => document.querySelector('[aria-label="Fold every province"] .rv-expand-icon.is-collapse'));
    await fold.click();
    await page.getByRole('button', { name: /^Expand / }).first().waitFor();
    await page.waitForFunction(() => document.querySelector('[aria-label="Fold every province"] .rv-expand-icon.is-expand'));
  } finally { await page.close(); }
});

test('scale-up summary uses reusable charts and updates with filtering', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url.replace('#campaign-performance', '#scale-up-index'));
    await revealCompany(page, 'Lumen Photonics');
    await page.getByRole('button', { name: 'Open Lumen Photonics' }).waitFor();
    await page.locator('.rv-dot-histogram').first().waitFor();
    assert.equal(await page.locator('.rv-dot-histogram').count(), 4);
    assert.equal(await page.locator('.rv-segmented-summary .rv-segmented-bar__part').count(), 3);
    assert.equal(await page.locator('.rv-segmented-summary__item').allTextContents().then(items => items.map(item => item.split(' ')[0]).join(',')), 'Yes,No,N/A');
    const chart = page.getByRole('group', { name: 'Revenue FY25 distribution' });
    assert.ok(await chart.locator('.rv-dot-histogram__plot button').count() > 0);
    assert.equal(await chart.locator('.rv-dot-histogram__axis span').count(), 2);
    const original = await page.locator('.rv-segmented-summary [role="img"]').getAttribute('aria-label');
    await page.getByRole('searchbox').fill('Lumen Photonics');
    await page.waitForFunction(value => document.querySelector('.rv-segmented-summary [role="img"]')?.getAttribute('aria-label') !== value, original);
    assert.equal(await page.locator('.rv-dot-histogram').count(), 4);
  } finally { await page.close(); }
});

test('scale-up summary charts align with grid columns and reveal company tooltips', async () => {
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  try {
    await page.goto(url.replace('#campaign-performance', '#scale-up-index'));
    const headers = page.locator('.rgHeaderCell');
    const revenue = headers.filter({ hasText: 'Revenue' }).first();
    const screen = headers.filter({ hasText: 'Founder' }).first();
    const chart = page.getByRole('group', { name: 'Revenue FY25 distribution' });
    await chart.waitFor();
    const card = page.locator('.workbench-stat').nth(2);
    await page.waitForFunction(() => document.querySelector('.workbench--scale-up-index .workbench-stats')?.style.gridTemplateColumns.includes('px'));
    const check = async () => {
      const c = await card.boundingBox(), h = await revenue.boundingBox();
      const s = await page.locator('.workbench-stat').nth(1).boundingBox(), sh = await screen.boundingBox();
      assert.ok(Math.abs(c.x - h.x) < 2 && Math.abs(c.width - h.width) < 2, `revenue ${JSON.stringify({ c, h })}`);
      assert.ok(Math.abs(s.x - sh.x) < 2, `screen ${JSON.stringify({ s, sh })}`);
    };
    await check();
    const dot = chart.locator('button').first();
    await dot.hover();
    await dot.evaluate(el => el.getAnimations().forEach(animation => animation.finish()));
    assert.match(await dot.evaluate(el => getComputedStyle(el).transform), /^matrix\(2,/);
    assert.equal(await dot.evaluate(el => getComputedStyle(el).outlineStyle), 'none');
    const tooltip = page.getByRole('tooltip');
    await tooltip.waitFor();
    assert.match(await tooltip.innerText(), /Lumen Photonics[\s\S]*Revenue[\s\S]*€5\.5M/);
    await page.mouse.move(1, 1);
    await tooltip.waitFor({ state: 'hidden' });
    await dot.focus();
    await tooltip.waitFor({ state: 'visible' });
    assert.match(await tooltip.innerText(), /Lumen Photonics/);
    await page.locator('revo-grid').evaluate(grid => { grid.columns = grid.columns.map(column => 'children' in column ? column : column.prop === 'revenue' ? { ...column, size: 180 } : column); });
    await page.waitForFunction(() => [...document.querySelectorAll('.rgHeaderCell')].find(el => el.textContent?.trim() === 'Revenue')?.getBoundingClientRect().width === 180);
    await page.waitForFunction(() => document.querySelector('.workbench-stat:nth-child(3)')?.getBoundingClientRect().width === 180);
    await check();
    await page.setViewportSize({ width: 900, height: 900 });
    await page.locator('revo-grid').evaluate(grid => grid.scrollToCoordinate({ x: 100 }));
    await page.waitForFunction(() => (document.querySelector('.workbench-stat:nth-child(3)')?.style.transform || '').includes('-100px'));
    await page.waitForFunction(() => { const card = document.querySelector('.workbench-stat:nth-child(3)'); const header = [...document.querySelectorAll('.rgHeaderCell')].find(el => el.textContent?.trim() === 'Revenue'); return card && header && Math.abs(card.getBoundingClientRect().x - header.getBoundingClientRect().x) < 2; });
    await check();
  } finally { await page.close(); }
});

test('headcount squares show and highlight the selected quarter', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url.replace('#campaign-performance', '#scale-up-index'));
    await revealCompany(page, 'Lumen Photonics');
    const track = page.getByRole('group', { name: 'Lumen Photonics headcount by quarter' });
    await track.waitFor();
    assert.equal(await track.getByRole('button').count(), 8);
    const q3 = track.getByRole('button', { name: /Lumen Photonics, headcount, Q3 2025/ });
    await q3.hover();
    const tooltip = page.getByRole('tooltip');
    await tooltip.waitFor();
    assert.match(await tooltip.innerText(), /Lumen Photonics, headcount[\s\S]*Q4 2024 to Q3 2026/);
    assert.equal(await tooltip.locator('.rv-metric-history__row').count(), 8);
    assert.match(await tooltip.locator('.rv-metric-history__row.is-active').innerText(), /Q3 2025\s+213, shrank/);
    await track.getByRole('button', { name: /Lumen Photonics, headcount, Q2 2026/ }).hover();
    await page.waitForFunction(() => document.querySelector('.rv-metric-history__row.is-active')?.textContent?.includes('Q2 2026'));
    await page.mouse.move(1, 1);
    await tooltip.waitFor({ state: 'hidden' });
    await q3.focus();
    await tooltip.waitFor({ state: 'visible' });
    assert.match(await tooltip.locator('.rv-metric-history__row.is-active').innerText(), /Q3 2025/);
    await page.keyboard.press('Escape');
    await tooltip.waitFor({ state: 'hidden' });
    await page.locator('revo-grid.workbench-grid').evaluate(async grid => {
      const rows = await grid.getVisibleSource();
      await grid.scrollToRow(rows.findIndex(row => row.provinceHead && row.province === 'South Holland'));
    });
    const groupTrack = page.getByRole('group', { name: 'South Holland headcount by quarter' });
    await groupTrack.getByRole('button').first().hover();
    await tooltip.waitFor({ state: 'visible' });
    assert.match(await tooltip.innerText(), /South Holland, headcount/);
  } finally { await page.close(); }
});

test('brand range and style charts expose their real data in tooltips', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url.replace('#campaign-performance', '#brand-scorecard'));
    const range = page.getByRole('img', { name: 'Aster Peak monthly range for Markdown' });
    await range.waitFor();
    await range.hover();
    const tooltip = page.getByRole('tooltip');
    await tooltip.waitFor();
    assert.match(await tooltip.innerText(), /Aster Peak[\s\S]*Markdown by month[\s\S]*Highest, .*\s+[\d.]+%[\s\S]*Median month\s+[\d.]+%[\s\S]*Lowest, .*\s+[\d.]+%/);
    assert.equal(await tooltip.locator('.rv-metric-history__marker').count(), 3);
    await page.mouse.move(1, 1);
    await tooltip.waitFor({ state: 'hidden' });
    await range.focus();
    await tooltip.waitFor({ state: 'visible' });
    await page.keyboard.press('Escape');
    await tooltip.waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'Styles', exact: true }).click();
    const plot = page.getByRole('group', { name: 'Wildhaven profit by style' });
    const point = plot.locator('i[role="button"]').first();
    await point.hover();
    await point.evaluate(el => el.getAnimations().forEach(animation => animation.finish()));
    assert.ok(await point.evaluate(el => new DOMMatrix(getComputedStyle(el).transform).a > 1.4));
    await tooltip.waitFor({ state: 'visible' });
    assert.match(await tooltip.innerText(), /Wildhaven[\s\S]*Profit[\s\S]*Orders/);
  } finally { await page.close(); }
});


test('campaign identity and action cells use shared Pro renderers', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url + '#campaign-performance');
    const identity = page.locator('.rv-identity-cell').first();
    await identity.waitFor();
    const open = identity.locator('button.rv-identity-cell__action');
    assert.ok((await open.getAttribute('aria-label')).startsWith('Open '));
    await open.click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    const campaignId = await dialog.locator('.scale-profile__id').innerText();
    const campaignName = await dialog.locator('.campaign-profile__title strong').innerText();
    await page.keyboard.press('Escape');
    const rowAction = page.locator('button.rv-cell-action').first();
    assert.ok(await rowAction.count() > 0);
    assert.equal(await rowAction.locator('svg path').count(), 1);
    assert.equal(await rowAction.locator('svg').evaluate(node => node.closest('[aria-hidden]')?.getAttribute('aria-hidden')), 'true');
    await rowAction.focus();
    await page.keyboard.press('Enter');
    await dialog.waitFor();
    assert.equal(await dialog.locator('.scale-profile__id').innerText(), campaignId);
    assert.equal(await dialog.locator('.campaign-profile__title strong').innerText(), campaignName);
    await dialog.getByRole('tab', { name: 'Performance' }).click();
    await dialog.getByRole('table', { name: `${campaignName} weekly performance` }).waitFor();
    await dialog.getByRole('button', { name: 'Edit', exact: true }).click();
    assert.equal(await dialog.getByLabel('Name').inputValue(), campaignName);
  } finally { await page.close(); }
});

test('category forecast row actions use the shared Pro renderer', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url.replace('#campaign-performance', '#category-forecast'));
    await page.getByRole('searchbox').fill('Camp Chairs');
    await page.locator('revo-grid.forecast-grid').evaluate(grid => grid.scrollToColumnProp('actions'));
    const action = page.getByRole('button', { name: 'Edit line · Camp Chairs' });
    await action.waitFor();
    assert.ok(await action.evaluate(element => element.classList.contains('rv-cell-action')));
    await action.click();
    await page.getByRole('dialog').waitFor();
  } finally { await page.close(); }
});

test('cohort benchmark comparison uses the correct favorable direction', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url.replace('#campaign-performance', '#patient-cohorts'));
    const cells = page.locator('.cohort-heat[data-benchmark-label]');
    await cells.first().waitFor();
    const examples = await cells.evaluateAll(nodes => nodes.map((node, index) => ({
      index, outcome: node.dataset.benchmarkOutcome,
      delta: Number(node.dataset.benchmarkRate) - Number(node.dataset.benchmarkAverage),
    })));
    for (const outcome of ['Hold', 'Booked']) {
      const sample = examples.find(item => item.outcome === outcome && item.delta > 0);
      assert.ok(sample, `expected a visible ${outcome} value above the cohort average`);
      await cells.nth(sample.index).focus();
      await page.locator('.rv-benchmark-card__badge').getByText(outcome, { exact: true }).waitFor();
      const change = page.locator('.rv-benchmark-card__change');
      await change.waitFor();
      assert.ok(await change.evaluate((node, tone) => node.classList.contains(`is-${tone}`), outcome === 'Hold' ? 'negative' : 'positive'));
    }
  } finally { await page.close(); }
});

test('cohort search handles no matches and restores the full totals', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url.replace('#campaign-performance', '#patient-cohorts'));
    const search = page.getByRole('searchbox');
    await page.locator('.cohort-heat').first().waitFor();
    const grid = page.locator('.workbench-grid');
    const initial = await grid.evaluate(element => element.source.length);
    await search.fill('no such cohort signal 1234');
    await page.waitForFunction(() => document.querySelector('.workbench-grid')?.source?.length === 0);
    assert.doesNotMatch(await page.locator('.cohort-heading-summary').innerText(), /NaN|Infinity/);
    await search.clear();
    await page.waitForFunction(count => document.querySelector('.workbench-grid')?.source?.length === count, initial);
  } finally { await page.close(); }
});

test('sales group headers and region controls fit their grid cells', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  try {
    await page.goto(url.replace('#campaign-performance', '#sales-to-target'));
    const subtitle = page.locator('.sales-group-heading small').filter({ hasText: 'Sep 2026' }).first();
    await subtitle.waitFor();
    const header = await subtitle.evaluate(element => {
      const text = element.getBoundingClientRect();
      const group = element.closest('.group-rgRow').getBoundingClientRect();
      const row = element.closest('.header-rgRow').getBoundingClientRect();
      return { textTop: text.top, textBottom: text.bottom, groupTop: group.top, groupBottom: group.bottom, rowBottom: row.bottom };
    });
    assert.ok(header.textTop >= header.groupTop && header.textBottom <= header.groupBottom && header.textBottom <= header.rowBottom, `header subtitle clipped: ${JSON.stringify(header)}`);
    const rail = page.locator('.sales-region-rail').getByRole('button', { name: 'Collapse Americas' });
    await rail.waitFor();
    const bounds = await rail.evaluate(element => {
      const button = element.getBoundingClientRect();
      const cell = element.closest('.rgCell').getBoundingClientRect();
      return { left: button.left, right: button.right, cellLeft: cell.left, cellRight: cell.right, railWidth: element.parentElement.getBoundingClientRect().width };
    });
    assert.ok(Math.abs(bounds.railWidth - (bounds.cellRight - bounds.cellLeft)) <= 1, `region rail should fill its column: ${JSON.stringify(bounds)}`);
    assert.ok(bounds.left >= bounds.cellLeft - 1 && bounds.right <= bounds.cellRight + 1, `region control clipped: ${JSON.stringify(bounds)}`);
    const icon = await rail.locator('svg').boundingBox();
    const label = await rail.locator('span').boundingBox();
    assert.ok(icon.y + icon.height <= label.y + 1, `region icon should sit above text: ${JSON.stringify({ icon, label })}`);
  } finally { await page.close(); }
});

test('campaign search prompt fits on desktop and mobile', async () => {
  const page = await browser.newPage();
  try {
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(url);
      const input = page.getByPlaceholder('Search campaign, ID, market…');
      await input.waitFor();
      const measurement = await input.evaluate(el => {
        const style = getComputedStyle(el);
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        return { available: el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight), needed: context.measureText(el.placeholder).width };
      });
      assert.ok(measurement.available >= measurement.needed, `${width}px: ${JSON.stringify(measurement)}`);
      await input.fill('Boreal');
      await page.getByRole('button', { name: 'Open Boreal Gloves Member Event' }).waitFor();
    }
  } finally { await page.close(); }
});


test('campaign column fills spare width and keeps its mobile minimum', async () => {
  const page = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Boreal Gloves Member Event' }).waitFor();
    await page.waitForFunction(async () => [...document.querySelectorAll('revo-grid .rgHeaderCell')].find(cell => cell.textContent.trim().startsWith('Campaign'))?.getBoundingClientRect().width > 285);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(async () => [...document.querySelectorAll('revo-grid .rgHeaderCell')].find(cell => cell.textContent.trim().startsWith('Campaign'))?.getBoundingClientRect().width === 160);
  } finally { await page.close(); }
});

test('company columns retain widths and summary alignment after hiding and restoring', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  try {
    await page.goto(url.replace('#campaign-performance', '#scale-up-index'));
    const grid = page.locator('revo-grid').first();
    await grid.locator('.rgHeaderCell').first().waitFor();
    await page.waitForTimeout(300);
    const widths = () => grid.locator('.rgHeaderCell').evaluateAll(nodes => nodes.map(node => [node.textContent.trim(), node.getBoundingClientRect().width]));
    const before = await widths();
    await grid.evaluate(el => { el.hideColumns = ['rank']; });
    await page.waitForTimeout(300);
    const alignment = async () => {
      const card = await page.locator('.workbench-stat').nth(2).boundingBox();
      const header = await grid.locator('.rgHeaderCell').filter({ hasText: 'Revenue' }).first().boundingBox();
      assert.ok(Math.abs(card.x - header.x) < 2 && Math.abs(card.width - header.width) < 2, JSON.stringify({ card, header }));
    };
    await alignment();
    await grid.evaluate(el => { el.hideColumns = []; });
    await page.waitForTimeout(300);
    assert.deepEqual(await widths(), before);
    await alignment();
  } finally { await page.close(); }
});

test('resizing a visible company column while Rank is hidden survives restoring Rank', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  try {
    await page.goto(url.replace('#campaign-performance', '#scale-up-index'));
    const grid = page.locator('revo-grid').first();
    await grid.locator('.rgHeaderCell').first().waitFor();
    await grid.evaluate(el => { el.resize = true; el.hideColumns = ['rank']; });
    const header = grid.locator('.rgHeaderCell').filter({ hasText: 'Revenue' }).first();
    const handle = header.locator('.resizable');
    await handle.waitFor();
    const original = (await header.boundingBox()).width;
    const bounds = await handle.boundingBox();
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width / 2 + 55, bounds.y + bounds.height / 2, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(250);
    const resized = (await header.boundingBox()).width;
    assert.ok(resized > original + 30, JSON.stringify({ original, resized }));
    await grid.evaluate(el => { el.hideColumns = []; });
    await page.waitForTimeout(300);
    const restored = (await header.boundingBox()).width;
    assert.ok(Math.abs(restored - resized) < 1, JSON.stringify({ resized, restored }));
    const card = await page.locator('.workbench-stat').nth(2).boundingBox();
    const headerBox = await header.boundingBox();
    assert.ok(Math.abs(card.x - headerBox.x) < 2 && Math.abs(card.width - headerBox.width) < 2, JSON.stringify({ card, headerBox }));
  } finally { await page.close(); }
});

test('cohort notes switch controls the visible signal notes', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url.replace('#campaign-performance', '#patient-cohorts'));
    const toggle = page.getByRole('switch', { name: 'Toggle signal notes' });
    await toggle.waitFor();
    const note = page.getByText('Acute pain and mobility limits', { exact: true }).first();
    await note.waitFor();
    await toggle.click();
    await note.waitFor({ state: 'hidden' });
    assert.equal(await toggle.getAttribute('aria-checked'), 'false');
    await toggle.click();
    await note.waitFor();
    assert.equal(await toggle.getAttribute('aria-checked'), 'true');
  } finally { await page.close(); }
});

test('product action menu uses the shared menu and supports delete undo', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url.replace('#campaign-performance', '#product-kpis'));
    await page.getByRole('button', { name: 'Open Granite Trail Boot' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('summary[aria-label="Product actions"]').click();
    const menu = dialog.getByRole('menu', { name: 'Product actions' });
    await menu.getByRole('menuitem', { name: 'Delete product' }).focus();
    await page.keyboard.press('Escape');
    assert.equal(await dialog.locator('summary[aria-label="Product actions"]').evaluate(node => node.parentElement.open), false);
    await dialog.locator('summary[aria-label="Product actions"]').click();
    await menu.getByRole('menuitem', { name: 'Delete product' }).click();
    await page.getByRole('dialog', { name: 'Delete record?' }).getByRole('button', { name: 'Save' }).click();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await page.getByRole('button', { name: 'Open Granite Trail Boot' }).waitFor();
  } finally { await page.close(); }
});
