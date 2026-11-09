import { expect, test } from '@playwright/test';

test('retained workspace filters remain visible and can be cleared in every view', async ({ page }) => {
  await page.goto(process.env.PLANNING_DEMO_URL ?? '/planning/demo/');
  const workspace = page.locator('.planning-demo');
  const search = workspace.getByRole('searchbox', { name: 'Search tasks', exact: true });
  await search.fill('Define requirements');
  await expect(workspace.locator('revogr-data .rgCell').filter({ hasText: 'Define requirements' })).toBeVisible();
  await workspace.getByRole('tab', { name: /^kanban$/i }).click();
  await workspace.getByRole('button', { name: 'Active tasks', exact: true }).click();
  await search.fill('QA-NOMATCH');
  const status = workspace.getByRole('combobox', { name: 'Status', exact: true });
  const priority = workspace.getByRole('combobox', { name: 'Priority', exact: true });
  for (const view of ['Gantt', 'Scheduler', 'Calendar', 'Grid']) {
    await workspace.getByRole('tab', { name: new RegExp(`^${view}$`, 'i') }).click();
    await expect(status).toBeVisible();
    await expect(status).toHaveAttribute('data-value', 'active');
    await expect(priority).toBeVisible();
  }
  await search.fill('Define requirements');
  await expect(workspace.locator('revogr-data .rgCell').filter({ hasText: 'Define requirements' })).toHaveCount(0);
  await status.click();
  await page.getByRole('option', { name: 'Status: All', exact: true }).click();
  await expect(workspace.locator('revogr-data .rgCell').filter({ hasText: 'Define requirements' })).toBeVisible();
});
