import { chooseSelect, selectValue } from './select-helper.mjs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';
import { preview } from 'vite';

const { chromium } = createRequire(import.meta.url)('playwright');
let server;
let browser;
let url;
before(async () => {
  server = await preview({ mode: 'ts', build: { outDir: process.env.DEMO_REUSE_TEST_OUT_DIR ?? 'dist/browser-test' }, preview: { host: '127.0.0.1', port: 0, strictPort: false } });
  url = `${server.resolvedUrls.local[0]}#project-budget`;
  browser = await chromium.launch({ headless: true });
});
after(async () => {
  await browser?.close();
  if (server) await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()));
});

test('budget sorting, vendor grouping and forecast edits stay data-driven', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    page.setDefaultTimeout(10000);
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Journey prototypes' }).waitFor();
    assert.deepEqual(await page.locator('.rv-time-range-header small').allTextContents(), ['Aug', 'Oct', 'Dec', 'Feb']);
    assert.equal(await page.locator('revo-grid').evaluate(grid => grid.columns.find(column => column.prop === 'schedule')?.columnType), 'budgetSchedule');
    const collapse = page.getByRole('button', { name: 'Collapse Design', exact: true });
    assert.equal(await collapse.getAttribute('aria-expanded'), 'true');
    await collapse.focus(); await page.keyboard.press('Enter');
    const expand = page.getByRole('button', { name: 'Expand Design', exact: true });
    await expand.waitFor(); assert.equal(await expand.getAttribute('aria-expanded'), 'false');
    await expand.click(); await page.getByRole('button', { name: 'Open Journey prototypes' }).waitFor();
    for (const selector of ['.rv-identity-cell', '.rv-group-cell--tree', '.rv-visual-cell__badge', '.rv-visual-cell__value-action', '.rv-visual-cell__delta', '.rv-timeline-container', '.rv-cell-action']) {
      assert.ok(await page.locator(selector).count() > 0, `Missing shared cell type: ${selector}`);
    }
    const read = () => page.locator('revo-grid').evaluate((grid) => ({ rows: grid.source, total: grid.pinnedBottomSource[0] }));
    const initial = await read();
    const wireframes = initial.rows.find((row) => row.label === 'Journey prototypes');
    assert.equal(wireframes.start, 30);
    assert.equal(wireframes.plannedEnd, 55);
    const plans = await page.locator('.budget-track__plan').evaluateAll((elements) => elements.map((element) => ({ left: parseFloat(element.style.left), width: parseFloat(element.style.width) })));
    assert.ok(plans.some(({ left, width }) => Math.abs(left - 30 / 243 * 100) < 0.001 && Math.abs(width - 25 / 243 * 100) < 0.001));
    await page.getByRole('button', { name: 'Budget column menu' }).click();
    await page.locator('.rv-context-menu:visible').getByRole('menuitem', { name: 'Sort ascending', exact: true }).click();
    assert.deepEqual((await read()).rows.filter((row) => row.group).slice(0, 3).map((row) => row.label), ['Discovery', 'Launch', 'Data Migration']);
    await page.getByRole('button', { name: 'Budget column menu' }).focus();
    await page.keyboard.press('Enter');
    await page.locator('.rv-context-menu:visible').getByRole('menuitem', { name: 'Sort descending', exact: true }).click();
    assert.equal((await read()).rows.find((row) => row.group).label, 'Build');
    await page.getByRole('button', { name: 'Budget column menu' }).click();
    await page.locator('.rv-context-menu:visible').getByRole('menuitem', { name: 'Clear sort', exact: true }).click();
    assert.equal((await read()).rows.find((row) => row.group).label, 'Discovery');
    await page.getByRole('button', { name: 'Update forecast for Interface foundations, now $16,200' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('spinbutton', { name: 'Hours Left' }).fill('25');
    await dialog.getByLabel('Reason').fill('Estimate revised');
    assert.match(await dialog.innerText(), /Forecast \$16,950.*Over\/Under −\$2,550/);
    await dialog.getByRole('button', { name: 'Apply' }).click();
    assert.equal((await read()).total.forecast, initial.total.forecast + 750);
    await page.getByRole('button', { name: 'Undo' }).click();
    assert.equal((await read()).total.forecast, initial.total.forecast);
    await chooseSelect(page.getByLabel('Group lines by'), 'Vendor');
    await page.getByRole('button', { name: 'Expand Lantern Studio' }).click();
    await page.getByRole('button', { name: 'Open Journey prototypes' }).click();
    await page.getByRole('dialog').getByRole('tab', { name: 'Activity' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Edit Line' }).click();
    assert.equal(await selectValue(page.getByRole('dialog').getByLabel('Vendor', { exact: true })), 'Lantern Studio');
    await page.getByRole('dialog').getByRole('button', { name: 'Save Changes' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
    const edited = (await read()).rows.find((row) => row.label === 'Journey prototypes');
    assert.equal(edited.start, 30);
    assert.equal(edited.plannedEnd, 55);
  } finally {
    await page.close();
  }
});

test('budget controls fit the mobile viewport', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    page.setDefaultTimeout(10000);
    await page.goto(url);
    await page.getByLabel('Group lines by').waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
    await page.getByRole('button', { name: 'Comfortable rows' }).click();
    assert.equal(await page.locator('revo-grid').evaluate((grid) => grid.rowSize), 54);
  } finally {
    await page.close();
  }
});


test('budget line drawer shows billing history and applies cover with undo', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    page.setDefaultTimeout(10000); await page.goto(url);
    await page.getByRole('button', { name: 'Open Portal application' }).click();
    const dialog = page.getByRole('dialog');
    assert.match(await dialog.getByRole('region', { name: 'Spend' }).innerText(), /\$41,250.*\$69,300.*\$74,580/s);
    assert.deepEqual(await dialog.getByRole('list', { name: 'Spend breakdown' }).getByRole('listitem').allTextContents(), ['Actual', 'Forecast', 'Over', 'Budget']);
    const spendBar = dialog.getByRole('img', { name: 'Spend $41,250, forecast $74,580, budget $69,300' });
    assert.equal(await spendBar.locator('.rv-segmented-bar__part').count(), 3);
    assert.ok(Math.abs(await spendBar.locator('.rv-segmented-bar__part').first().evaluate(node => parseFloat(node.style.width)) - 41250 / 74580 * 100) < 0.01);
    await dialog.getByRole('tab', { name: 'Activity' }).click();
    assert.match(await dialog.getByRole('region', { name: 'Spend to Date' }).innerText(), /58 h at \$165.*\$9,570/s);
    await dialog.getByRole('tab', { name: 'Decision' }).click();
    await dialog.getByRole('group', { name: 'Decision' }).getByRole('button', { name: 'Cover' }).click();
    assert.match(await dialog.innerText(), /\$28,610.*\$23,330/s);
    await dialog.getByLabel('Note to Lantern Studio').fill('Approved overrun');
    await dialog.getByLabel('Note to Lantern Studio').clear();
    await dialog.getByRole('button', { name: 'Save Decision' }).click();
    assert.match(await dialog.getByRole('alert').innerText(), /Say why/);
    await dialog.getByLabel('Note to Lantern Studio').fill('Approved overrun');
    await dialog.getByRole('button', { name: 'Save Decision' }).click();
    let line = (await page.locator('revo-grid').evaluate(grid => grid.source)).find(item => item.label === 'Portal application');
    assert.equal(line.budget, 74580); assert.equal(line.forecast, 74580);
    assert.match(await page.locator('.rv-metric-tile--visual').first().innerText(), /\$23,330/);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    line = (await page.locator('revo-grid').evaluate(grid => grid.source)).find(item => item.label === 'Portal application');
    assert.equal(line.budget, 69300); assert.equal(line.forecast, 74580);
    assert.match(await page.locator('.rv-metric-tile--visual').first().innerText(), /\$28,610/);
  } finally { await page.close(); }
});

test('budget line decision adjusts remaining work and preserves the plan', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    page.setDefaultTimeout(10000); await page.goto(url);
    await page.getByRole('button', { name: 'Open Portal application' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('tab', { name: 'Overview' }).focus(); await page.keyboard.press('ArrowRight');
    assert.equal(await dialog.getByRole('tab', { name: 'Decision' }).getAttribute('aria-selected'), 'true');
    const hoursLeft = dialog.getByRole('spinbutton', { name: 'Hours Left' });
    await hoursLeft.fill('179');
    await dialog.getByRole('button', { name: 'Increase Hours Left' }).click();
    assert.equal(await hoursLeft.inputValue(), '180');
    assert.match(await dialog.innerText(), /\$70,950/);
    await dialog.getByLabel('Note to Lantern Studio').fill('Revised estimate');
    await dialog.getByRole('button', { name: 'Save Decision' }).click();
    const line = (await page.locator('revo-grid').evaluate(grid => grid.source)).find(item => item.label === 'Portal application');
    assert.equal(line.budget, 69300); assert.equal(line.forecast, 70950);
    await page.getByRole('button', { name: 'Open Portal application' }).click();
    await dialog.getByRole('tab', { name: 'Activity' }).click();
    assert.match(await dialog.getByRole('region', { name: 'Change Log' }).innerText(), /Revised estimate/);
  } finally { await page.close(); }
});


test('budget editor preserves billed history and supports mixed pricing', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    page.setDefaultTimeout(10000); await page.goto(url);
    await page.getByRole('button', { name: 'Open Portal application' }).click();
    const dialog = page.getByRole('dialog'); await dialog.getByRole('tab', { name: 'Activity' }).click();
    await dialog.getByRole('button', { name: 'Edit Line' }).click();
    assert.equal(await dialog.getByLabel('Starts', { exact: true }).isDisabled(), true);
    assert.equal(await dialog.getByLabel('Rate', { exact: true }).isDisabled(), true);
    assert.equal(await dialog.getByRole('button', { name: 'Increase Rate' }).isDisabled(), true);
    const hours = dialog.getByRole('spinbutton', { name: 'Hours', exact: true });
    const initialHours = Number(await hours.inputValue());
    await dialog.getByRole('button', { name: 'Increase Hours' }).click();
    assert.equal(Number(await hours.inputValue()), initialHours + 1);
    await hours.fill('500');
    assert.match(await dialog.innerText(), /Budget.*\$82,500/s);
    await dialog.getByRole('button', { name: 'Save Changes' }).click();
    let item = (await page.locator('revo-grid').evaluate(grid => grid.source)).find(row => row.label === 'Portal application');
    assert.equal(item.budget, 82500); assert.equal(item.actual, 41250); assert.equal(item.forecast, 74580);
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    item = (await page.locator('revo-grid').evaluate(grid => grid.source)).find(row => row.label === 'Portal application');
    assert.equal(item.budget, 69300);
    await page.getByRole('button', { name: 'Add Line', exact: true }).click();
    await dialog.getByLabel('Line name').fill('Mixed project work');
    await dialog.getByLabel('Hours', { exact: true }).fill('100');
    await dialog.getByLabel('Rate', { exact: true }).fill('150');
    await dialog.getByLabel('Licenses', { exact: true }).fill('6');
    await chooseSelect(dialog.getByLabel('Unit', { exact: true }), 'Seats');
    await dialog.getByLabel('Price', { exact: true }).fill('500');
    await dialog.getByLabel('Fixed Fee', { exact: true }).fill('2000');
    assert.match(await dialog.innerText(), /Budget.*\$20,000/s);
    await dialog.getByRole('button', { name: 'Add Line', exact: true }).click();
    item = (await page.locator('revo-grid').evaluate(grid => grid.source)).find(row => row.label === 'Mixed project work');
    assert.equal(item.budget, 20000); assert.equal(item.forecast, 20000); assert.equal(item.actual, 0);
    await page.getByRole('button', { name: 'Open Mixed project work' }).click();
    await dialog.getByRole('tab', { name: 'Activity' }).click(); await dialog.getByRole('button', { name: 'Edit Line' }).click();
    assert.equal(await dialog.getByLabel('Licenses', { exact: true }).inputValue(), '6');
    assert.equal(await selectValue(dialog.getByLabel('Unit', { exact: true })), 'Seats');
    assert.equal(await dialog.getByLabel('Fixed Fee', { exact: true }).inputValue(), '2000');
    await dialog.getByRole('button', { name: 'Back', exact: true }).click();
    await dialog.getByRole('tab', { name: 'Decision' }).click();
    await dialog.getByRole('spinbutton', { name: 'Hours Left' }).fill('80');
    assert.match(await dialog.innerText(), /\$17,000/);
    await dialog.getByRole('button', { name: 'Save Decision' }).click();
    item = (await page.locator('revo-grid').evaluate(grid => grid.source)).find(row => row.label === 'Mixed project work');
    assert.equal(item.forecast, 17000); assert.equal(item.budget, 20000);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    item = (await page.locator('revo-grid').evaluate(grid => grid.source)).find(row => row.label === 'Mixed project work');
    assert.equal(item.forecast, 20000);
  } finally { await page.close(); }
});

test('budget decision chart uses historical weekly pace and switches to hours', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Portal application' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('tab', { name: 'Decision' }).click();
    const controls = dialog.getByRole('group', { name: 'Chart measure' });
    const spend = controls.getByRole('button', { name: /Build Spend/ });
    const hours = controls.getByRole('button', { name: /Build Hours/ });
    assert.match(await spend.innerText(), /\$4,004/); assert.match(await hours.innerText(), /19 h/);
    assert.equal(await spend.getAttribute('aria-pressed'), 'true');
    await hours.click();
    assert.equal(await hours.getAttribute('aria-pressed'), 'true');
    await dialog.getByRole('group', { name: /Build hours by week/ }).locator('[data-pivot-chart-combination-mark]').first().waitFor();
    await spend.click(); await dialog.getByRole('group', { name: /Build spend by week/ }).locator('[data-pivot-chart-combination-mark]').first().waitFor();
  } finally { await page.close(); }
});

test('budget history attributes the latest change to its actual author', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole('searchbox').fill('Content clean-up');
    await page.getByRole('button', { name: 'Open Content clean-up' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('tab', { name: 'Decision' }).click();
    assert.match(await dialog.locator('.budget-profile__change').first().innerText(), /Amara Okafor/);
    await dialog.getByRole('tab', { name: 'Activity' }).click();
    assert.match(await dialog.getByRole('region', { name: 'Change Log' }).innerText(), /Amara Okafor/);
  } finally { await page.close(); }
});

test('budget overview chart switches date ranges without losing the decision warning', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Portal application' }).click();
    const dialog = page.getByRole('dialog');
    const section = dialog.getByRole('region', { name: 'Budget vs Forecast' });
    const chart = section.getByRole('group', { name: /Portal application: planned, actual and forecast/ });
    await chart.locator('[data-pivot-chart-combination-line]').first().waitFor();
    const all = await chart.locator('circle').count();
    const inspection = chart.locator('[data-pivot-chart-inspection][tabindex="0"]').first();
    await inspection.focus();
    await page.keyboard.press('ArrowRight');
    await page.getByRole('tooltip').waitFor();
    const range = section.getByRole('group', { name: 'Chart range' });
    await range.getByRole('button', { name: '3M' }).click();
    assert.equal(await range.getByRole('button', { name: '3M' }).getAttribute('aria-pressed'), 'true');
    await chart.locator('[data-pivot-chart-combination-line]').first().waitFor();
    assert.ok(await chart.locator('circle').count() < all);
    await section.getByText(/Forecast is \$5,280 over budget/).waitFor();
    await range.getByRole('button', { name: 'All' }).click();
    await chart.locator('[data-pivot-chart-combination-line]').first().waitFor();
    assert.equal(await chart.locator('circle').count(), all);
  } finally { await page.close(); }
});

test('budget chart gradients remain local when charts are redrawn', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Portal application' }).click();
    const dialog = page.getByRole('dialog');
    const retain = async (chart) => chart.evaluate((svg) => {
      const copy = svg.cloneNode(true);
      copy.style.display = 'none';
      document.body.append(copy);
    });
    const check = async () => {
      const result = await page.evaluate(() => {
        const svgs = [...document.querySelectorAll('svg')].filter((svg) => svg.querySelector('linearGradient[id^="chart-datum-paint-"]'));
        const ids = svgs.flatMap((svg) => [...svg.querySelectorAll('linearGradient')].map((gradient) => gradient.id));
        const local = svgs.every((svg) => [...svg.querySelectorAll('[fill^="url(#"]')].every((mark) => {
          const id = mark.getAttribute('fill').slice(5, -1);
          return [...svg.querySelectorAll('linearGradient')].some((gradient) => gradient.id === id);
        }));
        return { count: svgs.length, unique: new Set(ids).size === ids.length, local };
      });
      assert.ok(result.count >= 2);
      assert.equal(result.unique, true);
      assert.equal(result.local, true);
    };
    await dialog.getByRole('tab', { name: 'Decision' }).click();
    const weekly = dialog.getByRole('group', { name: /Build spend by week/ });
    await weekly.locator('linearGradient').first().waitFor({ state: 'attached' });
    await retain(weekly.locator('svg').first());
    await dialog.getByRole('button', { name: /Build Hours/ }).click();
    await dialog.getByRole('group', { name: /Build hours by week/ }).locator('linearGradient').first().waitFor({ state: 'attached' });
    await check();
  } finally { await page.close(); }
});

test('budget metrics reuse visual tiles with accessible progress', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    const cards = page.locator('.rv-metric-tile--visual');
    await cards.first().waitFor();
    assert.equal(await cards.count(), 4);
    assert.deepEqual(await cards.locator('dt').allTextContents(), ['Total Budget', 'Actual Spend', 'Forecast', 'At Risk']);
    for (const card of await cards.all()) {
      assert.equal(await card.locator('progress[aria-label]').count(), 1);
      assert.equal(await card.locator('.bar-chart-bar').count(), 10);
    }
    assert.equal(await cards.locator('.rv-metric-tile__icon svg').count(), 4);
    for (const detail of await cards.locator('.rv-metric-tile__detail b').all()) assert.equal(await detail.evaluate(el => getComputedStyle(el, '::before').content), 'none');
    const paths = await cards.locator('.rv-metric-tile__icon svg path').evaluateAll(nodes => nodes.map(node => node.getAttribute('d')));
    assert.equal(new Set(paths).size, 4);
    const colors = await cards.locator('.bar-chart-bar:first-child').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).backgroundColor));
    assert.equal(new Set(colors).size, 4);
    assert.match(await cards.first().innerText(), /\$299,008/);
  } finally { await page.close(); }
});

test('budget row density controls use distinct full-height icons', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    const bar = page.locator('.rv-search-action-bar');
    const compact = bar.getByRole('button', { name: 'Compact rows' });
    const comfortable = bar.getByRole('button', { name: 'Comfortable rows' });
    await compact.waitFor();
    assert.notEqual(await compact.locator('svg path').first().getAttribute('d'), await comfortable.locator('svg path').first().getAttribute('d'));
    const barHeight = (await bar.boundingBox()).height;
    assert.ok((await compact.boundingBox()).height >= barHeight - 2);
    assert.ok((await comfortable.boundingBox()).height >= barHeight - 2);
    assert.equal(await bar.getByRole('button', { name: 'Columns' }).evaluate(el => getComputedStyle(el).fontSize), '0px');
    await comfortable.click();
    assert.equal(await page.locator('revo-grid').first().evaluate(el => el.rowSize), 54);
    await compact.click();
    assert.equal(await page.locator('revo-grid').first().evaluate(el => el.rowSize), 41);
  } finally { await page.close(); }
});

test('budget summary sits outside the bordered grid section', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    const summary = page.locator('.workbench--project-budget .workbench-stats');
    await summary.waitFor();
    const frame = page.locator('.workbench--project-budget .demo-shell__body');
    const toolbar = page.locator('.workbench--project-budget .workbench-toolbar');
    const grid = page.locator('.workbench--project-budget .workbench-grid');
    assert.equal(await frame.evaluate(el => getComputedStyle(el).borderTopWidth), '0px');
    assert.equal(await toolbar.evaluate(el => getComputedStyle(el).borderTopWidth), '1px');
    assert.equal(await grid.evaluate(el => getComputedStyle(el).borderLeftWidth), '1px');
    const summaryBox = await summary.boundingBox();
    const toolbarBox = await toolbar.boundingBox();
    assert.ok(summaryBox.y + summaryBox.height <= toolbarBox.y + 1);
  } finally { await page.close(); }
});

test('budget lines use white tiles with Font Awesome icons on a white grid', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.goto(url);
    const grid = page.locator('revo-grid.workbench-grid').first();
    const icons = grid.locator('.budget-line__icon');
    await icons.first().waitFor();
    assert.equal(await grid.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)');
    assert.equal(await icons.locator('svg').count(), await icons.count());
    assert.ok((await icons.evaluateAll(nodes => nodes.map(el => getComputedStyle(el).backgroundColor))).every(color => color === 'rgb(255, 255, 255)'));
    assert.ok(new Set(await icons.locator('svg path').evaluateAll(nodes => nodes.map(node => node.getAttribute('d')))).size > 2);
  } finally { await page.close(); }
});

test('budget bulk actions select groups, update lines, and undo deletion', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.goto(url);
    const group = page.getByRole('checkbox', { name: 'Select Discovery', exact: true });
    await group.waitFor();
    await group.click();
    const bar = page.getByRole('toolbar', { name: 'Selected budget lines' });
    await bar.waitFor();
    assert.match(await bar.innerText(), /3 lines selected/);
    await bar.getByRole('button', { name: 'Delete' }).click();
    await bar.waitFor({ state: 'hidden' });
    await page.locator('.rv-toast').getByText('3 lines deleted.', { exact: true }).waitFor();
    await page.getByRole('checkbox', { name: 'Select Discovery', exact: true }).waitFor({ state: 'detached' });
    await page.getByRole('button', { name: 'Undo' }).last().click();
    await page.getByRole('checkbox', { name: 'Select Discovery', exact: true }).waitFor();
    await page.getByRole('checkbox', { name: 'Select Interface foundations', exact: true }).click();
    await bar.waitFor();
    await bar.getByRole('button', { name: 'Mark done' }).click();
    await page.locator('.rv-toast').getByText('1 line marked done.', { exact: true }).waitFor();
    assert.equal(await page.locator('revo-grid').first().evaluate(grid => grid.source.find(row => row.label === 'Interface foundations')?.line.lineStatus), 'done');
  } finally { await page.close(); }
});
