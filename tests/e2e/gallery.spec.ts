import { expect, test } from '@playwright/test';

const featureSlugs = ['pivot', 'gantt', 'kanban', 'scheduler'];
const retainedSlugs = ['core', 'excel', 'ecommerce', 'project-table', 'planning'];

test('gallery is complete, keyboard navigable, and responsive', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Nine complete ways');
  await expect(page.locator('.showcase-card')).toHaveCount(9);
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
