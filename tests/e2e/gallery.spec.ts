import { expect, test } from '@playwright/test';

const featureSlugs = ['pivot', 'gantt', 'kanban', 'scheduler'];
const retainedSlugs = ['core', 'excel', 'ecommerce', 'project-table', 'filtering', 'infinity-scroll', 'column-collapse', 'row-master', 'tree-data', 'planning'];

test('gallery is complete, keyboard navigable, and responsive', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Fourteen complete ways');
  await expect(page.locator('.showcase-card')).toHaveCount(14);
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

test('remote filtering recipe forwards JSON-safe multi-condition and quick-filter payloads', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/filtering/demo/?recipe=remote');

  const output = page.locator('.remote-filter-recipe__request pre');
  await expect(page.locator('.remote-filter-recipe revo-grid')).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Apply mixed filters' }).click();
  await expect(output).toContainText('"mode": "pagination"');
  await page.getByRole('searchbox', { name: 'Remote global search' }).fill('Lisbon pending');

  await expect(output).toContainText('"text": "Lisbon pending"');
  const request = JSON.parse(await output.textContent() ?? '{}');
  expect(request.mode).toBe('pagination');
  expect(request.singleConditionFilters).toBeDefined();
  expect(request.multiConditionFilters.status[0].value).toBeInstanceOf(Array);
  expect(request.multiConditionFilters.total[0].value).toEqual({ fromValue: 250, toValue: 800 });
  expect(request.multiConditionFilters.orderDate[0].value).toBe('2026-01-01T00:00:00.000Z');
  expect(request.quickFilter).toEqual({ text: 'Lisbon pending' });

  await page.getByRole('button', { name: 'Infinity Scroll' }).click();
  await expect(output).toContainText('"mode": "infinity"');
  expect(errors).toEqual([]);
});
