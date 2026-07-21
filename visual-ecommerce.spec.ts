import { test, expect } from 'playwright/test';

for (const [framework, port] of Object.entries({ ts: 4173, react: 4174, vue: 4175, angular: 4176 })) {
  test(`e-commerce ${framework} summary headers`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${port}`);
    await page.waitForSelector('revo-grid.summary-header');
    await expect(page.getByText('Personal', { exact: true })).toBeVisible();
    await expect(page.getByText('Spending', { exact: true })).toBeVisible();
    await expect(page.locator('.summary-container')).toHaveCount(12);
    expect(await page.locator('.pie-chart-canvas').count()).toBeGreaterThanOrEqual(2);
    expect(await page.locator('.bar-chart-container').count()).toBeGreaterThanOrEqual(3);
    expect(await page.locator('.summary-percentage-content').count()).toBeGreaterThanOrEqual(2);
    await expect(page.locator('[data-value="_checkbox"]')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect(errors).toEqual([]);
  });
}
