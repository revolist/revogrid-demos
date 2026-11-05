import { expect, test } from '@playwright/test';

test('AI formats and highlights native Pivot totals and restores presentation after switching views', async ({
  page,
}) => {
  await page.route('**/api/ai-view/interpret', (route) =>
    route.fulfill({ status: 503, body: '' }),
  );
  await page.goto('/?framework=ts');
  const grid = page.locator('.ai-view-demo__surface > revo-grid');
  const prompt = page.getByLabel('Ask AI to change this view');
  await expect(prompt).toBeVisible();
  const source = await grid.evaluate((grid: HTMLRevoGridElement) => {
    grid.source = grid.source.map((row, index) =>
      index === 0 ? { ...row, amount: -100000 } : row,
    );
    return grid.source;
  });
  const submit = async (request: string) => {
    await prompt.fill(request);
    await prompt.press('Enter');
    await expect(prompt).toHaveValue('');
    await expect
      .poll(() =>
        grid.evaluate(async (grid: HTMLRevoGridElement) => {
          const assistant = (await grid.getPlugins()).find(
            (plugin: any) => plugin.submit && plugin.clearChat,
          ) as any;
          return assistant.getSnapshot().phase;
        }),
      )
      .toBe('completed');
  };
  const measure = () =>
    grid.evaluate(async (grid: HTMLRevoGridElement) => {
      const pivot = (await grid.getPlugins()).find(
        (plugin: any) => plugin.updatePivotConfig,
      ) as any;
      return pivot
        .getRuntimeSnapshot()
        ?.config.values.find((value: any) => value.prop === 'amount');
    });
  const values = grid.locator(
    'revogr-data[type="rgRow"] .rgCell[data-rgcol="1"]',
  );
  await submit('Show this as Pivot');
  await submit('Format Amount as currency');
  await expect
    .poll(async () => (await measure()).format?.preset)
    .toBe('currency');
  await expect(values.first()).toContainText('$');
  await submit('Amounts above 100');
  await expect(values.nth(1)).toHaveCSS(
    'background-color',
    'rgb(254, 243, 199)',
  );
  await expect(values.first()).not.toHaveCSS(
    'background-color',
    'rgb(254, 243, 199)',
  );
  const saved = await measure();
  await page.getByRole('radio', { name: 'Data Grid', exact: true }).click();
  expect(
    await grid.evaluate((grid: HTMLRevoGridElement) => grid.source),
  ).toEqual(source);
  await page.getByRole('radio', { name: 'Pivot', exact: true }).click();
  await expect.poll(measure).toEqual(saved);
  await expect(values.nth(1)).toHaveCSS(
    'background-color',
    'rgb(254, 243, 199)',
  );
  await expect(values.first()).toContainText('$');
  await submit('Clear Amount highlights');
  await expect(values.nth(1)).not.toHaveCSS(
    'background-color',
    'rgb(254, 243, 199)',
  );
  await expect(values.first()).toContainText('$');
  await submit('Highlight invalid Amounts');
  await expect(values.first()).toHaveCSS(
    'background-color',
    'rgb(254, 226, 226)',
  );
  await expect(values.nth(1)).not.toHaveCSS(
    'background-color',
    'rgb(254, 226, 226)',
  );
  await submit('Check Amounts');
  await expect(page.locator('.rv-ai-message--assistant').last()).toContainText(
    '1 invalid Amounts found.',
  );
  await page.getByRole('radio', { name: 'Data Grid', exact: true }).click();
  await page.getByRole('radio', { name: 'Pivot', exact: true }).click();
  await expect(values.first()).toHaveCSS(
    'background-color',
    'rgb(254, 226, 226)',
  );
  await expect(values.first()).toContainText('$');
  await submit('Show this as an area chart');
  await submit('Amounts above 100');
  await page.getByRole('radio', { name: 'Data Grid', exact: true }).click();
  await page.getByRole('radio', { name: 'Pivot Chart', exact: true }).click();
  await expect(values.nth(1)).toHaveCSS(
    'background-color',
    'rgb(254, 243, 199)',
  );
  await expect(values.first()).toContainText('$');
});
