import { expect, test } from '@playwright/test';

test('Joined calendar keeps the grid date format when opening and saving', async ({ page }) => {
  await page.goto('/');
  const grid = page.locator('revo-grid');
  const cell = grid.locator('.rgCell[data-rgcol="5"][data-rgrow="2"]').first();
  await expect(cell).toHaveText('3/3/2020');
  await cell.dblclick();
  const input = page.locator('.duet-date__input');
  await expect(input).toHaveValue('3/3/2020');
  await expect(input).toHaveAttribute('placeholder', 'M/D/YYYY');
  await page.getByRole('button', { name: '4 March', exact: true }).click();
  await expect(cell).toHaveText('3/4/2020');
  await cell.dblclick();
  await expect(input).toHaveValue('3/4/2020');
  await input.fill('12/25/2021');
  await input.press('Tab');
  await expect(cell).toHaveText('12/25/2021');
  await expect.poll(() => grid.evaluate((element: any) => element.source[2].joined)).toBe('2021-12-25');
  await cell.dblclick();
  await expect(input).toHaveValue('12/25/2021');
});
