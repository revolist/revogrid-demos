import { expect, test } from '@playwright/test';

for (const framework of ['ts', 'vue', 'react', 'angular']) {
  test(`chart announcements stay visually hidden in ${framework}`, async ({ page }) => {
    await page.route('**/api/ai-view/interpret', route => route.fulfill({ status: 503, body: '' }));
    await page.goto(`/?framework=${framework}`);
    const prompt = page.getByLabel('Ask AI to change this view');
    await expect(prompt).toBeVisible({ timeout: 60000 });
    await expect.poll(async () => Math.round((await page.locator('.ai-view-demo__assistant').boundingBox())!.width)).toBe(333);
    await prompt.fill('Show a dashboard with donut and area charts');
    await prompt.press('Enter');
    const dashboard = page.locator('.ai-view-demo__chart');
    await expect(dashboard.locator('.rv-pivot-chart-embedded')).toHaveCount(2);
    for (const card of await dashboard.locator('.rv-pivot-chart-embedded').all()) {
      const box = (await card.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(380);
      expect(box.width).toBeGreaterThanOrEqual(360);
      await expect(card).toHaveCSS('border-radius', '14px');
    }
    const announcements = dashboard.locator('.rv-pivot-chart-dialog__visually-hidden[role="status"]');
    await expect(announcements).toHaveCount(2);
    for (const status of await announcements.all()) {
      await expect(status).toHaveAttribute('aria-live', 'polite');
      await expect(status).toHaveCSS('position', 'absolute');
      await expect(status).toHaveCSS('width', '1px');
      await expect(status).toHaveCSS('height', '1px');
      await expect(status).toHaveCSS('overflow', 'hidden');
      await expect(status).toHaveCSS('clip', 'rect(0px, 0px, 0px, 0px)');
    }
    if (framework === 'ts') {
      await page.screenshot({ path: 'test-results/screenshots/ai-dashboard-desktop.png', animations: 'disabled' });
      await page.setViewportSize({ width: 390, height: 1100 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const card of await dashboard.locator('.rv-pivot-chart-embedded').all()) {
        expect((await card.boundingBox())!.width).toBeLessThanOrEqual(390);
      }
      await page.screenshot({ path: 'test-results/screenshots/ai-dashboard-mobile.png', animations: 'disabled', fullPage: true });
    }
  });
}
