import { expect, test } from '@playwright/test';

test('search and column views preserve the customer workspace', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.analytics-avatar-select').first()).toBeVisible();
  const visibleCount = () => page.locator('revo-grid').evaluate(async grid => (await (grid as HTMLRevoGridElement).getVisibleSource()).length);
  const search = page.getByRole('searchbox', { name: 'Search customers' });
  await search.fill('Fiona');
  await expect.poll(visibleCount).toBe(153);
  await search.fill('no-such-customer-xyz');
  await expect(page.locator('.ecommerce-empty')).toBeVisible();
  await search.fill('');
  await expect.poll(visibleCount).toBe(1000);
  await expect(search).toHaveValue('');
  await page.getByRole('combobox', { name: 'Column view' }).click();
  await page.getByRole('option', { name: 'All fields', exact: true }).click();
  await expect(page.getByText('Personal', { exact: true }).first()).toBeVisible();
  await page.getByRole('combobox', { name: 'Column view' }).click();
  await page.getByRole('option', { name: 'Customer overview', exact: true }).click();
  await expect(page.locator('.ecommerce-shell')).toHaveAttribute('data-view', 'overview');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const searchBounds = await search.boundingBox();
  const viewBounds = await page.getByLabel('Column view').boundingBox();
  expect(searchBounds!.width).toBeGreaterThan(300);
  expect(viewBounds!.x + viewBounds!.width).toBeLessThanOrEqual(390);
  expect(errors).toEqual([]);
});


test('workspace controls use shared UI presentation and primary action', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Export', exact: true })).toHaveClass(/rv-btn-primary/);
  await expect(page.locator('.ecommerce-heading button, .ecommerce-footer, .ecommerce-result-count')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Reset/ })).toHaveCount(0);
  const buttons = page.locator('.ecommerce-toolbar button');
  for (const button of await buttons.all()) await expect(button).toHaveClass(/\brv-btn\b/);
  await expect(page.locator('.ecommerce-toolbar .rv-search-input')).toHaveCount(1);
  await expect(page.locator('.ecommerce-toolbar .dropdown-container')).toHaveCount(2);
  await expect(page.locator('.ecommerce-toolbar select')).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Saved segments' }).click();
  await page.getByRole('option', { name: 'High-value Gold customers', exact: true }).click();
  await expect.poll(() => page.locator('revo-grid').evaluate(async grid => (await (grid as HTMLRevoGridElement).getVisibleSource()).length)).toBe(136);
  await page.getByRole('combobox', { name: 'Saved segments' }).click();
  await page.getByRole('option', { name: 'Saved segments', exact: true }).click();
  await expect.poll(() => page.locator('revo-grid').evaluate(async grid => (await (grid as HTMLRevoGridElement).getVisibleSource()).length)).toBe(1000);
});

test('Lifetime value opens a usable numeric distribution filter', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.locator('.analytics-avatar-select').first().waitFor();
  await page.getByText('Lifetime value', { exact: true })
    .locator('xpath=ancestor::*[@role="columnheader"]')
    .locator('button.rv-filter').click();
  const editor = page.locator('.histogram-brush-filter');
  await expect(editor).toBeVisible();
  await expect(editor.locator('.rv-distribution-chart')).toBeVisible();
  await expect(editor.locator('input[type="range"]')).toHaveCount(2);
  await editor.locator('input.fromSlider').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Tab');
  await expect.poll(() => page.locator('revo-grid').evaluate(async grid => (await (grid as HTMLRevoGridElement).getVisibleSource()).length)).toBeLessThan(1000);
  await expect(editor.locator('.rv-distribution-chart')).toBeVisible();
  expect(errors.filter(message => !message.includes('favicon'))).toEqual([]);
});


test('dragging a column into the grouping panel groups the customers', async ({ page }) => {
  await page.goto('/');
  const label = page.getByText('Membership', { exact: true }).first();
  const panel = page.locator('revo-grid > .group-panel');
  await expect(label).toBeVisible();
  const header = (await label.boundingBox())!;
  const target = (await panel.boundingBox())!;
  await page.mouse.move(header.x + header.width / 2, header.y + header.height / 2);
  await page.mouse.down();
  await page.mouse.move(header.x + header.width / 2 + 8, header.y + header.height / 2, { steps: 4 });
  await page.mouse.move(target.x + 200, target.y + target.height / 2, { steps: 14 });
  await page.mouse.up();
  await expect.poll(() => page.locator('revo-grid').evaluate(grid => (grid as HTMLRevoGridElement).grouping?.props)).toContain('Membership Type');
  await expect(panel.locator('.group-item')).toBeVisible();
  await expect(page.locator('.ecommerce-empty')).toBeHidden();
  await page.getByRole('combobox', { name: 'Column view' }).click();
  await page.getByRole('option', { name: 'All fields', exact: true }).click();
  await expect(page.locator('.ecommerce-empty')).toBeHidden();
  await expect(page.locator('revo-grid .groupingRow').first()).toBeVisible();
  await page.locator('.groupingRow .group-expand').first().click();
  await expect(page.locator('.analytics-avatar-select').first()).toBeVisible();
  await expect(page.locator('.ecommerce-empty')).toBeHidden();
  const search = page.getByRole('searchbox', { name: 'Search customers' });
  await search.fill('no-such-customer-xyz');
  await expect(page.locator('.ecommerce-empty')).toBeVisible();
  await search.fill('');
  await expect(page.locator('.ecommerce-empty')).toBeHidden();
});

test('toolbar controls keep compact geometry across responsive breakpoints', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.analytics-avatar-select').first()).toBeVisible();
  for (const width of [900, 801, 980, 981, 800, 640, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const toolbar = page.locator('.ecommerce-toolbar');
    for (const control of [toolbar.locator('.rv-search-input'), page.getByRole('combobox', { name: 'Saved segments' }), page.getByRole('combobox', { name: 'Column view' }), page.getByRole('button', { name: 'Export', exact: true })]) {
      const box = (await control.boundingBox())!;
      expect(box.height, `control height at ${width}px`).toBeLessThanOrEqual(48);
      expect(box.x, `left edge at ${width}px`).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, `right edge at ${width}px`).toBeLessThanOrEqual(width);
    }
    expect((await toolbar.boundingBox())!.height, `toolbar height at ${width}px`).toBeLessThanOrEqual(180);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});
