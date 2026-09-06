import { expect, test } from '@playwright/test';

test('core demo separates preparation, grid paint, and scroll measurements', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', error => errors.push(error.message));

  await page.goto(process.env.CORE_DEMO_PATH ?? '/core/demo/');

  const metrics = page.getByRole('region', { name: 'Browser performance metrics' });
  await expect(metrics).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Reset view' }).click();
  await expect(page.locator('.hr-select').first()).toHaveValue('10000');
  await expect(metrics.locator('.hr-performance-metric', { hasText: 'Data preparation' }).locator('strong')).not.toHaveText('N/A');
  await expect(metrics.locator('.hr-performance-metric', { hasText: 'Grid apply to paint' }).locator('strong')).not.toHaveText('N/A');
  await expect(metrics.locator('.hr-performance-metric', { hasText: 'Dataset' }).locator('strong')).toHaveText('10,000 × 100');
  const scrollMetric = metrics.locator('.hr-performance-metric', { hasText: 'Scroll' }).locator('strong');
  await expect(scrollMetric).toHaveText('Scroll to measure');

  const metricHelp = metrics.getByRole('button', { name: /^About / });
  await expect(metricHelp).toHaveCount(5);
  await metricHelp.first().focus();
  await expect(metrics.getByRole('tooltip').first()).toBeVisible();

  await page.locator('.hr-select').first().selectOption('1000');
  await expect(metrics.locator('.hr-performance-metric', { hasText: 'Dataset' }).locator('strong')).toHaveText('1,000 × 100');

  await page.getByRole('button', { name: 'Save view' }).click();
  await expect(page.getByText('Saved locally')).toBeVisible();
  await page.reload();
  await expect(page.locator('.hr-select').first()).toHaveValue('1000');
  await expect(page.getByText('Saved locally')).toBeVisible();

  const grid = page.locator('revo-grid').first();
  await grid.hover();
  for (let i = 0; i < 6; i += 1) {
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(50);
  }
  await expect(scrollMetric).toContainText('FPS');
  const measuredScrollFps = await scrollMetric.textContent();
  await page.waitForTimeout(300);
  await expect(scrollMetric).toHaveText(measuredScrollFps ?? '');

  await page.getByRole('button', { name: 'Reset view' }).click();
  await expect(page.locator('.hr-select').first()).toHaveValue('10000');
  await expect(page.getByText('View reset')).toBeVisible();
  expect(errors).toEqual([]);
});

test('core demo keeps the grid usable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 620 });
  await page.goto(process.env.CORE_DEMO_PATH ?? '/core/demo/');

  const grid = page.locator('revo-grid').first();
  const gridWrapper = page.locator('.hr-grid-wrapper').first();
  const performance = page.getByRole('region', { name: 'Browser performance metrics' });
  await expect(grid).toBeVisible({ timeout: 15_000 });
  await expect(performance).toBeAttached();

  const gridBox = await gridWrapper.boundingBox();
  const performanceBox = await performance.boundingBox();

  expect(gridBox?.height).toBeGreaterThanOrEqual(300);
  expect(performanceBox?.y).toBeGreaterThanOrEqual((gridBox?.y ?? 0) + (gridBox?.height ?? 0));
});
