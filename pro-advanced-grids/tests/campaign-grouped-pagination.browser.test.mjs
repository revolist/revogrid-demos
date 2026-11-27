import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';
import { preview } from 'vite';

const { chromium } = createRequire(import.meta.url)('playwright');
let server, browser, url;

before(async () => {
  server = await preview({
    configFile: process.env.DEMO_TEST_CONFIG,
    mode: 'ts',
    build: { outDir: process.env.DEMO_REUSE_TEST_OUT_DIR ?? 'dist/browser-test' },
    preview: { host: '127.0.0.1', port: 0 },
  });
  url = `${server.resolvedUrls.local[0]}#campaign-performance`;
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.httpServer.close(resolve));
});

test('campaign configurator pages whole filtered groups and retains keyed selections', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    page.setDefaultTimeout(8000);
    await page.goto(url);
    const grid = page.locator('revo-grid.workbench-grid');
    const panel = page.getByRole('region', { name: 'Grid configurator' });
    const rows = panel.getByRole('region', { name: 'Row Groups', exact: true });
    const values = panel.getByRole('region', { name: 'Values', exact: true });
    const pagination = grid.getByRole('navigation', { name: 'Page' });
    const summary = grid.locator('.rv-grid-group-summary-value');
    await pagination.getByText('1-10 of 30 items').waitFor();
    const fullData = await grid.evaluate(element => element.getSource());
    const firstPageIds = await grid.evaluate(async element => (await element.getVisibleSource()).map(row => row.id));
    const live = fullData.filter(row => row.status === 'Live');
    const liveSpend = live.reduce((sum, row) => sum + row.spend, 0);
    assert.ok(live.some(row => !firstPageIds.includes(row.id)));
    const fullSummary = await page.locator('.workbench-stats').innerText();

    await panel.getByRole('button', { name: /^Columns \(/ }).click();
    const field = prop => panel.locator(`.grid-configurator-tree-row[data-field="${prop}"]`);
    await field('status').dragTo(rows);
    await rows.getByRole('button', { name: 'Remove Status from Row Groups' }).waitFor();
    await field('spend').dragTo(values);
    await values.getByRole('button', { name: 'Remove Spend from Values' }).waitFor();
    await pagination.getByText('1-5 of 5 groups').waitFor();
    assert.equal(await summary.first().textContent(), String(liveSpend));
    assert.equal(await page.locator('.workbench-stats').innerText(), fullSummary);

    await grid.evaluate(element => {
      element.pagination = { ...element.pagination, itemsPerPage: 2 };
    });
    await pagination.getByText('1-2 of 5 groups').waitFor();
    await grid.getByRole('button', { name: 'Expand Live' }).click();
    await grid.getByRole('button', { name: 'Collapse Live' }).waitFor();
    const firstGroupIds = await grid.evaluate(async element =>
      (await element.getVisibleSource()).filter(row => row.id).map(row => row.id));
    assert.deepEqual(firstGroupIds, live.map(row => row.id));
    await pagination.getByText('1-2 of 5 groups').waitFor();
    const selectedRow = grid.getByRole('checkbox', { name: 'Select row 2', exact: true });
    await selectedRow.check();

    await pagination.getByRole('button', { name: 'Page 2', exact: true }).click();
    await pagination.getByText('3-4 of 5 groups').waitFor();
    await grid.getByRole('button', { name: 'Expand Learning' }).click();
    await grid.getByRole('button', { name: 'Collapse Learning' }).waitFor();
    await selectedRow.check();
    await page.getByRole('toolbar', { name: 'Selected campaigns' }).getByText(/2 selected/).waitFor();
    await pagination.getByRole('button', { name: 'Page 1', exact: true }).click();
    await grid.getByRole('button', { name: 'Collapse Live' }).waitFor();
    assert.equal(await selectedRow.isChecked(), true);
    await grid.getByRole('button', { name: 'Collapse Live' }).click();
    await grid.getByRole('button', { name: 'Expand Live' }).waitFor();
    await page.getByRole('toolbar', { name: 'Selected campaigns' }).getByRole('button', { name: 'Clear', exact: true }).click();

    await grid.getByRole('button', { name: 'Expand Limited' }).click();
    await grid.getByRole('button', { name: 'Collapse Limited' }).waitFor();
    const selectAll = grid.getByRole('checkbox', { name: 'Select all rows', exact: true });
    await selectAll.check();
    const selectionBar = page.getByRole('toolbar', { name: 'Selected campaigns' });
    await selectionBar.getByText(/3 selected/).waitFor();
    await pagination.getByRole('button', { name: 'Page 2', exact: true }).click();
    await grid.getByRole('button', { name: 'Collapse Learning' }).waitFor();
    assert.equal(await selectAll.isChecked(), false);
    await pagination.getByRole('button', { name: 'Page 1', exact: true }).click();
    await grid.getByRole('button', { name: 'Collapse Limited' }).waitFor();
    assert.equal(await selectAll.isChecked(), true);
    await selectAll.uncheck();
    await selectionBar.waitFor({ state: 'hidden' });
    await page.waitForFunction(() =>
      [...document.querySelectorAll('revo-grid.workbench-grid input.row-select-checkbox')].every(input => !input.checked));
    if (process.env.GROUPED_CAMPAIGN_SCREENSHOT) {
      await page.screenshot({ path: process.env.GROUPED_CAMPAIGN_SCREENSHOT });
    }
    await grid.getByRole('button', { name: 'Collapse Limited' }).click();

    const spend = grid.locator('.rgHeaderCell').filter({ hasText: 'Spend' }).first();
    await spend.click();
    await page.locator('.rv-context-menu:visible').getByRole('menuitem', { name: 'Sort ascending', exact: true }).click();
    const firstSortedStatus = [...fullData].sort((a, b) => a.spend - b.spend)[0].status;
    await page.waitForFunction(async status => {
      const element = document.querySelector('revo-grid.workbench-grid');
      return (await element.getVisibleSource())[0]?.status === status;
    }, firstSortedStatus);
    await pagination.getByRole('button', { name: 'Page 3', exact: true }).click();
    await pagination.getByText('5-5 of 5 groups').waitFor();

    await page.getByRole('button', { name: 'Filter', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Campaign filters' });
    await dialog.getByRole('button', { name: 'Add condition' }).click();
    await dialog.getByRole('combobox', { name: 'Status filter operator' }).click();
    await page.getByRole('option', { name: 'is any of', exact: true }).click();
    await dialog.getByRole('combobox', { name: 'Add Status filter value' }).fill('Limited');
    await page.getByRole('option', { name: 'Limited', exact: true }).click();
    await dialog.getByRole('button', { name: 'Apply', exact: true }).click();
    await pagination.getByText('1-1 of 1 groups').waitFor();
    await grid.getByRole('button', { name: 'Expand Limited' }).click();
    await grid.getByRole('button', { name: 'Collapse Limited' }).waitFor();
    const limited = fullData.filter(row => row.status === 'Limited').sort((a, b) => a.spend - b.spend);
    const visible = await grid.evaluate(async element => (await element.getVisibleSource()).filter(row => row.id));
    assert.deepEqual(visible.map(row => row.id), limited.map(row => row.id));
    assert.equal(await summary.textContent(), String(limited.reduce((sum, row) => sum + row.spend, 0)));

    await rows.getByRole('button', { name: 'Remove Status from Row Groups' }).click();
    await pagination.getByText('1-2 of 3 items').waitFor();
    await page.waitForFunction(async expected => {
      const element = document.querySelector('revo-grid.workbench-grid');
      const actual = (await element.getVisibleSource()).map(row => row.id);
      return actual.length === expected.length && actual.every((id, index) => id === expected[index]);
    }, limited.slice(0, 2).map(row => row.id));
  } finally {
    await page.close();
  }
});

test('campaign configurator resets the page when reordering nested row groups', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    page.setDefaultTimeout(8000);
    await page.goto(url);
    const grid = page.locator('revo-grid.workbench-grid');
    const panel = page.getByRole('region', { name: 'Grid configurator' });
    const rows = panel.getByRole('region', { name: 'Row Groups', exact: true });
    const pagination = grid.getByRole('navigation', { name: 'Page' });
    await pagination.getByText('1-10 of 30 items').waitFor();
    await grid.evaluate(element => { element.pagination = { ...element.pagination, itemsPerPage: 2 }; });
    await panel.getByRole('button', { name: /^Columns \(/ }).click();
    await panel.locator('.grid-configurator-tree-row[data-field="status"]').dragTo(rows);
    await rows.getByRole('button', { name: 'Remove Status from Row Groups' }).waitFor();
    await rows.getByRole('button', { name: 'Add to Row Groups' }).click();
    await page.getByRole('button', { name: 'Campaign', exact: true }).click();
    await pagination.getByText('1-2 of 5 groups').waitFor();
    await pagination.getByRole('button', { name: 'Page 2', exact: true }).click();
    await pagination.getByText('3-4 of 5 groups').waitFor();
    const status = rows.getByRole('listitem').filter({ hasText: 'Status' });
    const campaign = rows.getByRole('listitem').filter({ hasText: 'Campaign' });
    await campaign.dragTo(status, { targetPosition: { x: 12, y: 5 } });
    await pagination.getByText('1-2 of 30 groups').waitFor();
    assert.deepEqual(await grid.evaluate(element => element.grouping.props), ['label', 'status']);
  } finally {
    await page.close();
  }
});
