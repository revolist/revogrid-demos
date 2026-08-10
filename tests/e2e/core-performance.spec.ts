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
  await expect(metrics.locator('.hr-performance-metric', { hasText: 'Data preparation' }).locator('strong')).not.toHaveText('N/A');
  await expect(metrics.locator('.hr-performance-metric', { hasText: 'Grid apply to paint' }).locator('strong')).not.toHaveText('N/A');
  await expect(metrics.locator('.hr-performance-metric', { hasText: 'Dataset' }).locator('strong')).toHaveText('100 × 7');

  const metricHelp = metrics.getByRole('button', { name: /^About / });
  await expect(metricHelp).toHaveCount(5);
  await metricHelp.first().focus();
  await expect(metrics.getByRole('tooltip').first()).toBeVisible();

  await page.locator('.hr-select').first().selectOption('1000');
  await expect(metrics.locator('.hr-performance-metric', { hasText: 'Dataset' }).locator('strong')).toHaveText('1,000 × 11');

  await page.getByRole('button', { name: 'Save view' }).click();
  await expect(page.getByText('Saved locally')).toBeVisible();
  await page.reload();
  await expect(page.locator('.hr-select').first()).toHaveValue('1000');
  await expect(page.getByText('Saved locally')).toBeVisible();

  const grid = page.locator('revo-grid').first();
  await grid.hover();
  await page.mouse.wheel(0, 800);
  await expect(metrics.locator('.hr-performance-metric', { hasText: 'Scroll' }).locator('strong')).toContainText('FPS');

  await page.getByRole('button', { name: 'Reset view' }).click();
  await expect(page.locator('.hr-select').first()).toHaveValue('100');
  await expect(page.getByText('View reset')).toBeVisible();
  expect(errors).toEqual([]);
});
