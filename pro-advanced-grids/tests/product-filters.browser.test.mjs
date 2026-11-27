import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';
import { preview } from 'vite';

const { chromium } = createRequire(import.meta.url)('playwright');
let server, browser, url;
before(async () => {
  server = await preview({ configFile: process.env.DEMO_TEST_CONFIG, mode: 'ts', build: { outDir: process.env.DEMO_REUSE_TEST_OUT_DIR ?? 'dist/browser-test' }, preview: { host: '127.0.0.1', port: 0 } });
  url = `${server.resolvedUrls.local[0]}#product-kpis`;
  browser = await chromium.launch({ headless: true });
});
after(async () => {
  await browser?.close();
  if (server) await new Promise((resolve, reject) => server.httpServer.close(error => error ? reject(error) : resolve()));
});

test('guardrail buttons use compact labels and retain descriptive accessible names', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    await page.goto(url);
    for (const [name, label] of [['Sales below target', 'Low sales'], ['Margin below floor', 'Low margin'], ['Discount above cap', 'High discount'], ['Cover < 4 wk', 'Low cover']]) {
      const control = page.getByRole('button', { name: new RegExp(`^${name}:`) });
      await control.waitFor();
      assert.ok((await control.innerText()).includes(label));
      assert.ok(await control.evaluate(el => el.scrollHeight <= el.clientHeight));
    }
    if (process.env.DEMO_SCREENSHOT_PATH) await page.screenshot({ path: process.env.DEMO_SCREENSHOT_PATH });
  } finally { await page.close(); }
});

test('generated product photos load in the grid and product details', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    await page.goto(url);
    const photo = page.locator('.product-photo').first();
    await photo.waitFor();
    const background = await photo.evaluate(el => getComputedStyle(el).backgroundImage);
    assert.match(background, /catalog-generated\.png/);
    const response = await page.request.get(new URL('product-photos/catalog-generated.png', page.url()).href);
    assert.equal(response.status(), 200);
    assert.match(response.headers()['content-type'], /image\/png/);
    await page.getByRole('button', { name: 'Open Alder Summit Boot' }).click();
    const detailPhoto = page.getByRole('dialog').locator('.product-profile__photo.product-photo');
    await detailPhoto.waitFor();
    assert.match(await detailPhoto.evaluate(el => getComputedStyle(el).backgroundImage), /catalog-generated\.png/);
    if (process.env.DEMO_SCREENSHOT_PATH) await page.screenshot({ path: process.env.DEMO_SCREENSHOT_PATH });
  } finally { await page.close(); }
});

test('decision views restore a guardrail after reload and can be deleted', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    await page.goto(url);
    for (const label of ['Save view', 'Delete view']) {
      const control = page.getByRole('button', { name: label });
      await control.locator('svg[aria-hidden="true"]').waitFor({ state: 'attached' });
    }
    assert.equal(await page.locator('.workbench-quick-filter .rv-badge').count(), 4);
    await page.getByRole('button', { name: 'Performance targets' }).focus();
    await page.getByRole('tooltip').getByText('Performance targets').waitFor();
    await page.getByRole('button', { name: /Margin below floor/ }).click();
    await page.getByRole('button', { name: 'Save view' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('View name').fill('Margin review');
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await page.reload();
    await page.getByRole('searchbox').fill('Cove');
    await page.getByRole('combobox', { name: 'Decision view' }).click();
    await page.getByRole('option', { name: 'Margin review', exact: true }).click();
    assert.equal(await page.getByRole('searchbox').inputValue(), 'Cove');
    assert.equal(await page.getByRole('button', { name: /Margin below floor/ }).getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: 'Delete view' }).click();
    await page.reload();
    await page.getByRole('combobox', { name: 'Decision view' }).click();
    assert.equal(await page.getByRole('option', { name: 'Margin review', exact: true }).count(), 0);
  } finally { await page.close(); }
});

test('low-cover queue excludes missing demand and survives saved views', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    await page.goto(url);
    const queue = page.getByRole('button', { name: /^Cover < 4 wk:/ });
    await queue.click();
    assert.equal(await queue.getAttribute('aria-pressed'), 'true');
    const rows = await page.locator('revo-grid').first().evaluate(grid => grid.getVisibleSource());
    assert.ok(rows.length > 0);
    assert.ok(rows.every(row => row.stockCover != null && row.stockCover < 4));
    await page.getByRole('button', { name: 'Save view' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('View name').fill('Replenish');
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await page.reload();
    await page.getByRole('combobox', { name: 'Decision view' }).click();
    await page.getByRole('option', { name: 'Replenish', exact: true }).click();
    assert.equal(await queue.getAttribute('aria-pressed'), 'true');
    if (process.env.DEMO_SCREENSHOT_PATH) await page.screenshot({ path: process.env.DEMO_SCREENSHOT_PATH });
  } finally { await page.close(); }
});

test('updating inventory recalculates the low-cover queue and can be undone', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: /^Cover < 4 wk:/ }).click();
    await page.getByRole('button', { name: 'Actions for Alder Summit Boot' }).click();
    const dialog = page.getByRole('dialog');
    const inventory = dialog.getByRole('spinbutton', { name: 'Units on hand' });
    const previous = await inventory.inputValue();
    await inventory.fill('100000');
    if (process.env.DEMO_SCREENSHOT_PATH) await page.screenshot({ path: process.env.DEMO_SCREENSHOT_PATH });
    await dialog.getByRole('button', { name: 'Save Changes' }).click();
    await page.getByRole('button', { name: 'Open Alder Summit Boot' }).waitFor({ state: 'detached' });
    await page.getByRole('button', { name: 'Undo', exact: true }).last().click();
    await page.getByRole('button', { name: 'Open Alder Summit Boot' }).waitFor();
    await page.getByRole('button', { name: 'Actions for Alder Summit Boot' }).click();
    assert.equal(await inventory.inputValue(), previous);
  } finally { await page.close(); }
});

test('replenishment suggestion records a review without changing inventory', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: /^Cover < 4 wk:/ }).click();
    await page.getByRole('button', { name: 'Open Alder Summit Boot' }).click();
    const dialog = page.getByRole('dialog');
    const details = dialog.getByRole('region', { name: 'Details' });
    assert.match(await details.innerText(), /Units to 8 weeks\s+[\d,]+ suggested/);
    assert.match(await details.innerText(), /Estimated demand\s+[\d,]+ units \/ week · [+-]\d+\.\d% vs prior 4 weeks/);
    const grid = page.locator('revo-grid').first();
    const before = await grid.evaluate(async grid => (await grid.getVisibleSource()).find(row => row.label === 'Alder Summit Boot').product.onHand);
    if (process.env.DEMO_SCREENSHOT_PATH) await page.screenshot({ path: process.env.DEMO_SCREENSHOT_PATH });
    await dialog.getByText('Set Decision', { exact: true }).click();
    await dialog.getByRole('menuitem', { name: 'Review Replenishment' }).click();
    assert.match(await details.innerText(), /Review Replenishment/);
    assert.equal(await grid.evaluate(async grid => (await grid.getVisibleSource()).find(row => row.label === 'Alder Summit Boot').product.onHand), before);
    await dialog.getByRole('tab', { name: 'Activity' }).click();
    assert.match(await dialog.innerText(), /Decision set to Review Replenishment/);
  } finally { await page.close(); }
});

test('bulk stock review changes only low-cover products and supports undo', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    await page.goto(url);
    const grid = page.locator('revo-grid').first();
    const read = () => grid.evaluate(async grid => (await grid.getVisibleSource()).filter(row => ['Alder Summit Boot', 'Fernbank Walking Boot'].includes(row.label)).map(row => ({ label: row.label, decision: row.product.decision, onHand: row.product.onHand })));
    const before = await read();
    await page.getByRole('checkbox', { name: 'Select Alder Summit Boot' }).click();
    await page.getByRole('checkbox', { name: 'Select Fernbank Walking Boot' }).click();
    const bar = page.getByRole('toolbar', { name: 'Selected products' });
    if (process.env.DEMO_SCREENSHOT_PATH) await page.screenshot({ path: process.env.DEMO_SCREENSHOT_PATH });
    await bar.getByRole('button', { name: 'Review low stock' }).click();
    await page.getByText('1 product updated.').first().waitFor();
    const updated = await read();
    assert.equal(updated.find(row => row.label === 'Alder Summit Boot').decision, 'replenish');
    assert.deepEqual(updated.find(row => row.label === 'Fernbank Walking Boot'), before.find(row => row.label === 'Fernbank Walking Boot'));
    await page.getByRole('button', { name: 'Undo', exact: true }).last().click();
    assert.deepEqual(await read(), before);
  } finally { await page.close(); }
});

test('product filters apply across pages and expose typed column filters', async () => {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Add Product' }).waitFor();
    const grid = page.locator('revo-grid').first();
    const types = await grid.evaluate(grid => Object.fromEntries(grid.columns.map(column => [column.prop, column.filter])));
    assert.deepEqual(types.label, ['selection']);
    assert.deepEqual(types.status, ['selection']);
    assert.deepEqual(types.revenue, ['number', 'slider']);
    assert.deepEqual(types.profit, ['number', 'slider']);
    assert.equal(types.actions, false);
    await page.getByRole('button', { name: 'Filter', exact: true }).click();
    await page.getByRole('dialog', { name: 'Product filters' }).waitFor();
    await page.keyboard.press('Escape');
    await grid.evaluate(async grid => {
      const plugin = (await grid.getPlugins()).find(plugin => typeof plugin.setFilterAst === 'function');
      await plugin.setFilterAst({ type: 'group', operator: 'and', children: [{ type: 'condition', field: 'status', operator: 'equal', valueType: 'string', value: 'On Track' }] });
    });
    await page.waitForFunction(async () => {
      const rows = await document.querySelector('revo-grid').getVisibleSource();
      return rows.length > 0 && rows.every(row => row.status === 'On Track');
    });
    assert.match(await page.locator('.product-page-info').innerText(), /of \d+ products/);
    await page.locator('.rgHeaderCell').filter({ hasText: 'Revenue' }).first().click();
    const menu = page.locator('.rv-context-menu:visible');
    await menu.getByRole('menuitem', { name: 'Filter', exact: true }).hover();
    await menu.getByRole('menuitem', { name: 'Open filter' }).click();
    await page.locator('.filter-panel-dialog:visible').waitFor();
  } finally {
    await page.close();
  }
});

test('guardrail shortcuts filter the selected period and keep focus', async () => {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  try {
    await page.goto(url);
    const margin = page.getByRole('button', { name: /^Margin below floor:/ });
    await margin.waitFor();
    await margin.focus();
    await margin.press('Enter');
    assert.equal(await margin.getAttribute('aria-pressed'), 'true');
    assert.equal(await margin.evaluate(button => button === document.activeElement), true);
    await page.waitForFunction(async () => {
      const rows = await document.querySelector('revo-grid').getVisibleSource();
      return rows.length > 0 && rows.every(row => row.guardrailsPassed[1] === false);
    });
    await margin.press('Enter');
    assert.equal(await margin.getAttribute('aria-pressed'), 'false');
    await page.waitForFunction(async () => (await document.querySelector('revo-grid').getVisibleSource()).length === 10);
  } finally {
    await page.close();
  }
});

test('promotion calendar previews weekly metrics and restores totals on exit', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Add Product' }).waitFor();
    const row = page.locator('.rgRow').filter({ has: page.locator('.rv-action-strip') }).first();
    const initial = await row.innerText();
    assert.ok(await row.locator('.rv-action-strip__item--divider').count() > 0);
    await row.locator('.rv-action-strip button').nth(16).hover();
    await page.waitForFunction(initial => {
      const row = [...document.querySelectorAll('.rgRow')].find(el => el.querySelector('.rv-action-strip'));
      return row && row.innerText !== initial;
    }, initial);
    await page.mouse.move(10, 10);
    await page.waitForFunction(initial => {
      const row = [...document.querySelectorAll('.rgRow')].find(el => el.querySelector('.rv-action-strip'));
      return row && row.innerText === initial;
    }, initial);
    await row.locator('.rv-action-strip button').nth(16).focus();
    await page.waitForFunction(initial => {
      const row = [...document.querySelectorAll('.rgRow')].find(el => el.querySelector('.rv-action-strip'));
      return row && row.innerText !== initial;
    }, initial);
    assert.equal(await row.locator('.rv-action-strip button').nth(16).evaluate(el => el === document.activeElement), true);
    await page.getByRole('button', { name: 'Add Product' }).focus();
    await page.waitForFunction(initial => {
      const row = [...document.querySelectorAll('.rgRow')].find(el => el.querySelector('.rv-action-strip'));
      return row && row.innerText === initial;
    }, initial);
  } finally { await page.close(); }
});

test('product revenue chart shows weekly comparison tooltip on hover and focus', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Add Product' }).waitFor();
    const point = page.locator('.rv-comparison-sparkline__target').first();
    const label = await point.getAttribute('aria-label');
    assert.match(label, /Week ending/);
    assert.match(label, /This period/);
    assert.match(label, /Period before/);
    await point.hover();
    const tooltip = page.locator('.grid-tooltip--visible');
    await tooltip.waitFor();
    assert.equal((await tooltip.textContent()).trim(), label);
    await page.mouse.move(10, 10);
    await tooltip.waitFor({ state: 'hidden' });
    await point.focus();
    await tooltip.waitFor();
    assert.equal((await tooltip.textContent()).trim(), label);
  } finally { await page.close(); }
});

test('reporting window highlights matching months and weeks', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Add Product' }).waitFor();
    const header = page.locator('.rv-time-range-header');
    const color = month => header.locator(`[data-month="2026-${month}"]`).evaluate(el => getComputedStyle(el).color);
    const strip = page.locator('.rv-action-strip').first();
    await page.waitForFunction(() => document.querySelectorAll('.rv-action-strip__item.outside-period').length > 0);
    assert.equal(await strip.locator('.outside-period').count(), 13);
    assert.notEqual(await color('06'), await color('07'));
    await page.getByRole('button', { name: '4W, last 4 weeks' }).click();
    await page.waitForFunction(() => document.querySelector('.rv-action-strip')?.querySelectorAll('.outside-period').length === 22);
    assert.equal(await color('07'), await color('06'));
    assert.notEqual(await color('09'), await color('07'));
    await page.getByRole('button', { name: '26W, last 26 weeks' }).click();
    await page.waitForFunction(() => document.querySelector('.rv-action-strip')?.querySelectorAll('.outside-period').length === 0);
    assert.equal(await color('06'), await color('07'));
  } finally { await page.close(); }
});

test('month dividers fall between the month labels', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    await page.goto(url);
    await page.locator('.rv-action-strip__item--divider').first().waitFor();
    const geometry = await page.evaluate(() => {
      const headers = [...document.querySelectorAll('.rv-time-range-header small')].map(el => {
        const rect = el.getBoundingClientRect(); return rect.left + rect.width / 2;
      });
      const dividers = [...document.querySelector('.rv-action-strip').querySelectorAll('.rv-action-strip__item--divider')].map(el => el.getBoundingClientRect().left + parseFloat(getComputedStyle(el, '::before').left));
      return { headers, dividers };
    });
    assert.equal(geometry.headers.length, 6);
    for (let index = 0; index < geometry.headers.length - 1; index++) {
      assert.ok(geometry.dividers[index + 1] > geometry.headers[index]);
      assert.ok(geometry.dividers[index + 1] < geometry.headers[index + 1]);
    }
  } finally { await page.close(); }
});

test('product visuals and applied targets remain correct across pages', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    await page.goto(url);
    const grid = page.locator('revo-grid').first();
    await page.getByRole('button', { name: 'Open Alder Summit Boot' }).waitFor();
    for (const [number, name] of [[2, 'Frostfield Thermal Top'], [3, 'Birchline Hammock']]) {
      await page.locator('.rv-pagination-panel').getByRole('button', { name: `Page ${number}`, exact: true }).click();
      await page.getByRole('button', { name: `Open ${name}` }).waitFor();
      assert.ok(await page.locator('.rv-identity-cell__image.product-photo, .rv-identity-cell__image.product-fallback').count() >= 9);
      assert.ok(await page.locator('.product-fallback svg').count() > 0 || number === 2);
    }
    await page.locator('.rv-pagination-panel').getByRole('button', { name: 'Page 2', exact: true }).click();
    await page.getByRole('button', { name: 'Open Frostfield Thermal Top' }).waitFor();
    const before = await grid.evaluate(async element => (await element.getVisibleSource()).map(row => ({ id: row.id, status: row.status, marks: row.marks })));
    await page.getByRole('button', { name: 'Performance targets' }).click();
    const popup = page.getByRole('dialog', { name: 'Performance targets' });
    await popup.getByRole('combobox', { name: 'Weekly sales target' }).click();
    const list = page.getByRole('listbox').last();
    await list.evaluate(element => { element.scrollTop = element.scrollHeight; element.dispatchEvent(new Event('scroll', { bubbles: true })); });
    await page.getByRole('option', { name: '$40K / wk', exact: true }).click();
    await popup.getByRole('button', { name: 'Apply targets' }).click();
    await page.waitForFunction(async previous => (await document.querySelector('revo-grid').getVisibleSource()).some(row => JSON.stringify(row.marks) !== JSON.stringify(previous.find(item => item.id === row.id)?.marks)), before);
    const rows = await grid.evaluate(element => element.getVisibleSource());
    assert.ok(rows.some(row => row.marks[0] !== before.find(item => item.id === row.id)?.marks[0]));
    const first = rows[0];
    const statusCell = page.locator('.rv-status-segments').first();
    await page.waitForFunction(expected => document.querySelector('.rv-status-segments__heading')?.textContent?.includes(expected), first.status);
    assert.match(await statusCell.innerText(), new RegExp(first.status));
    assert.equal(await statusCell.locator('.rv-status-segments__marks i').count(), 3);
    await page.locator('.rv-pagination-panel').getByRole('button', { name: 'Page 1', exact: true }).click();
    await page.getByRole('button', { name: 'Open Alder Summit Boot' }).waitFor();
    assert.equal((await grid.evaluate(element => element.getVisibleSource()))[0].guardrailsPassed[0], false);
  } finally { await page.close(); }
});

test('performance targets preview and apply shared dropdown selections', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    page.setDefaultTimeout(5000);
    await page.goto(url);
    const trigger = page.getByRole('button', { name: 'Performance targets' });
    await trigger.click();
    const popup = page.getByRole('dialog', { name: 'Performance targets' });
    await popup.waitFor();
    assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
    const sales = popup.getByRole('combobox', { name: 'Weekly sales target' });
    assert.equal(await sales.getAttribute('data-value'), '20000');
    assert.equal(await popup.locator('.product-targets__icon svg').count(), 3);
    assert.match(await popup.getByLabel('Product status preview').innerText(), /On Track.*At Risk.*Off Track/s);
    const initial = await popup.locator('.product-targets__metric-summary').first().innerText();
    await sales.click();
    const list = page.getByRole('listbox').last();
    await list.waitFor();
    await list.evaluate(element => { element.scrollTop = element.scrollHeight; element.dispatchEvent(new Event('scroll', { bubbles: true })); });
    await popup.waitFor({ state: 'visible' });
    await page.getByRole('option', { name: '$40K / wk', exact: true }).click();
    assert.equal(await sales.getAttribute('data-value'), '40000');
    assert.notEqual(await popup.locator('.product-targets__metric-summary').first().innerText(), initial);
    await popup.getByRole('button', { name: 'Cancel' }).click();
    await trigger.click();
    assert.equal(await popup.getByRole('combobox', { name: 'Weekly sales target' }).getAttribute('data-value'), '20000');
    const before = await page.locator('revo-grid').evaluate(async grid => (await grid.getVisibleSource()).map(row => ({ id: row.id, marks: row.marks })));
    await popup.getByRole('combobox', { name: 'Minimum profit margin' }).click();
    await page.getByRole('option', { name: '40%', exact: true }).click();
    await popup.getByRole('button', { name: 'Apply targets' }).click();
    await page.waitForFunction(async previous => {
      const rows = await document.querySelector('revo-grid').getVisibleSource();
      return rows.some(row => JSON.stringify(row.marks) !== JSON.stringify(previous.find(item => item.id === row.id)?.marks));
    }, before);
    await popup.waitFor({ state: 'hidden' });
    await trigger.click();
    assert.equal(await popup.getByRole('combobox', { name: 'Minimum profit margin' }).getAttribute('data-value'), '40');
    await popup.getByRole('button', { name: 'Restore defaults' }).click();
    assert.equal(await popup.getByRole('combobox', { name: 'Minimum profit margin' }).getAttribute('data-value'), '25');
    await page.keyboard.press('Escape');
    await popup.waitFor({ state: 'hidden' });
    await trigger.click();
    assert.equal(await popup.getByRole('combobox', { name: 'Minimum profit margin' }).getAttribute('data-value'), '40');
  } finally { await page.close(); }
});

test('performance targets remain usable on a narrow screen', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 700 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Performance targets' }).click();
    const popup = page.getByRole('dialog', { name: 'Performance targets' });
    await popup.waitFor();
    const bounds = await popup.boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390);
    assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= 700);
    await popup.getByRole('combobox', { name: 'Maximum discount' }).click();
    await page.getByRole('option', { name: '15%', exact: true }).click();
    assert.equal(await popup.getByRole('combobox', { name: 'Maximum discount' }).getAttribute('data-value'), '15');
    await popup.getByRole('button', { name: 'Cancel' }).click();
    await popup.waitFor({ state: 'hidden' });
  } finally { await page.close(); }
});


test('performance target dropdowns are cleaned up when switching demos', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Performance targets' }).click();
    await page.getByRole('combobox', { name: 'Weekly sales target' }).click();
    await page.getByRole('option', { name: '$20K / wk', exact: true }).waitFor();
    await page.evaluate(() => { location.hash = 'campaign-performance'; });
    await page.getByRole('button', { name: 'New Campaign' }).waitFor();
    assert.equal(await page.locator('.product-targets-popover:visible').count(), 0);
    assert.equal(await page.getByRole('option', { name: '$20K / wk', exact: true }).count(), 0);
    await page.evaluate(() => { location.hash = 'product-kpis'; });
    await page.getByRole('button', { name: 'Performance targets' }).click();
    assert.equal(await page.getByRole('combobox', { name: 'Weekly sales target' }).getAttribute('data-value'), '20000');
  } finally { await page.close(); }
});

test('product column fills spare width and keeps its minimum on mobile', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  try {
    await page.goto(url);
    await page.locator('revo-grid').waitFor();
    await page.waitForFunction(async () => [...document.querySelectorAll('revo-grid .rgHeaderCell')].find(cell => cell.textContent.trim().startsWith('Product'))?.getBoundingClientRect().width > 210);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(async () => [...document.querySelectorAll('revo-grid .rgHeaderCell')].find(cell => cell.textContent.trim().startsWith('Product'))?.getBoundingClientRect().width === 210);
  } finally { await page.close(); }
});

test('product bulk actions preserve selection across pages and clear it', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole('checkbox', { name: 'Select Alder Summit Boot' }).click();
    const bar = page.getByRole('toolbar', { name: 'Selected products' });
    await bar.waitFor();
    assert.match(await bar.innerText(), /1 product selected/);
    await page.locator('.rv-pagination-panel').getByRole('button', { name: 'Page 2', exact: true }).click();
    await page.getByRole('checkbox', { name: 'Select Frostfield Thermal Top' }).click();
    assert.match(await bar.innerText(), /2 products selected/);
    await bar.getByRole('button', { name: 'Stop promos' }).click();
    await page.locator('.rv-toast').getByText('2 products updated.', { exact: true }).waitFor();
    await bar.waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'Undo' }).last().click();
  } finally { await page.close(); }
});
