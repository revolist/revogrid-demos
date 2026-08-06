import { expect, test } from '@playwright/test';

const featureSlugs = ['pivot', 'gantt', 'kanban', 'scheduler'];
const retainedSlugs = ['core', 'excel', 'ecommerce', 'project-table', 'filtering', 'infinity-scroll', 'column-collapse', 'row-master', 'audit-history', 'tree-data', 'planning'];

test('gallery is complete, keyboard navigable, and responsive', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Fifteen complete ways');
  await expect(page.locator('.showcase-card')).toHaveCount(15);
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.showcase-card').first()).toBeVisible();
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect.poll(() => page.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgb(9, 13, 24)');
  expect(errors).toEqual([]);
});

for (const slug of [...featureSlugs, ...retainedSlugs]) {
  test(`${slug} detail and demo routes render`, async ({ page }) => {
    await page.goto(`/${slug}/`);
    await expect(page.getByRole('link', { name: 'View live demo' })).toHaveAttribute('href', './demo/');
    await page.goto(`/${slug}/demo/`);
    await expect(page.locator('revo-grid').first()).toBeVisible({ timeout: 15_000 });
  });
}

test('audit history attributes a live edit and appends it to the ledger', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/audit-history/demo/');

  const grid = page.locator('revo-grid');
  const customerCell = grid.locator('.rgCell[data-rgcol="1"][data-rgrow="0"]').first();
  await expect(page.locator('.rv-audit-history-panel')).toBeVisible({ timeout: 15_000 });
  await customerCell.dblclick();
  await grid.locator('input').fill('Northwind Labs');
  await page.keyboard.press('Enter');

  await expect.poll(() => grid.evaluate(async element => {
    const plugins = await (element as HTMLRevoGridElement).getPlugins();
    const audit = plugins.find(plugin => typeof (plugin as { getRecords?: unknown }).getRecords === 'function') as { getRecords: () => Array<{ changes: Array<{ newValue?: unknown }> }> } | undefined;
    return audit?.getRecords().length;
  })).toBe(5);
  const latestValue = await grid.evaluate(async element => {
    const plugins = await (element as HTMLRevoGridElement).getPlugins();
    const audit = plugins.find(plugin => typeof (plugin as { getRecords?: unknown }).getRecords === 'function') as { getRecords: () => Array<{ changes: Array<{ newValue?: unknown }> }> };
    return audit.getRecords().at(-1)?.changes[0]?.newValue;
  });
  expect(latestValue).toBe('Northwind Labs');
  expect(errors).toEqual([]);
});

test('feature pages expose trial and upgrade paths', async ({ page }) => {
  for (const slug of featureSlugs) {
    await page.goto(`/${slug}/`);
    await expect(page.getByRole('link', { name: 'Request trial' })).toHaveAttribute('href', 'https://pro.rv-grid.com/guides/installation-npm-trial/');
    await expect(page.getByRole('link', { name: 'Get Pro Advanced' })).toHaveAttribute('href', 'https://rv-grid.com/pricing/');
  }
});

test('filtering showcase composes global search, chips, and Clear All responsively', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/filtering/demo/');

  const explorer = page.getByRole('region', { name: 'Advanced Filtering: Order Explorer' });
  const grid = explorer.locator('revo-grid');
  const count = explorer.locator('.order-explorer__count');
  await expect(grid).toBeVisible({ timeout: 15_000 });
  await expect(grid.locator('revogr-header .column-icon')).toHaveCount(9);

  const orderDate = grid.locator('revogr-header .rgHeaderCell', { hasText: 'Order date' }).first();
  expect((await orderDate.boundingBox())?.width).toBeGreaterThanOrEqual(179);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(explorer).toBeVisible();

  await explorer.getByRole('button', { name: 'Try example' }).click();
  await expect(explorer.locator('.order-explorer__quick-chip')).toContainText('Search: Lisbon pending');
  await expect.poll(async () => count.textContent()).not.toBe('1,000 of 1,000 orders');

  await explorer.getByRole('button', { name: 'Clear All' }).click();
  await expect(explorer.getByRole('listitem')).toHaveCount(0);
  await expect(count).toHaveText('1,000 of 1,000 orders');
  expect(errors).toEqual([]);
});
