import { expect, test, type Frame } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });

for (const framework of ['ts', 'vue', 'react', 'angular']) {
  test(`AI report views preserve their conversation and source in ${framework}`, async ({ page }) => {
    await page.route(/cookieyes\.com/, route => route.abort());
    await page.route('**/api/ai-view/interpret', route => route.fulfill({ status: 503, body: '' }));
    await page.goto(`/?framework=${framework}`, { waitUntil: 'domcontentloaded' });
    let demo: Frame | undefined;
    await expect.poll(async () => {
      for (const frame of page.frames()) {
        if (await frame.getByLabel('Ask AI to change this view').count()) { demo = frame; return true; }
      }
      return false;
    }, { timeout: 60000 }).toBe(true);
    const grid = demo!.locator('.ai-view-demo__surface > revo-grid');
    const dashboard = demo!.locator('.ai-view-demo__chart');
    const charts = dashboard.locator('.rv-pivot-chart-embedded');
    const expectDashboardCards = async () => {
      for (const chart of await charts.all()) {
        const card = (await chart.boundingBox())!;
        const plot = (await chart.locator('.rv-pivot-chart-dialog__chart').boundingBox())!;
        expect(card.height).toBeGreaterThanOrEqual(380);
        expect(card.height).toBeLessThanOrEqual(420);
        expect(card.width).toBeLessThanOrEqual((await dashboard.boundingBox())!.width);
        expect(plot.y + plot.height).toBeLessThanOrEqual(card.y + card.height);
      }
    };
    const source = await grid.evaluate((grid: HTMLRevoGridElement) => grid.source);
    expect(await grid.evaluate((grid: HTMLRevoGridElement) => grid.stretch)).toBe('all');
    const prompt = demo!.getByLabel('Ask AI to change this view');
    const view = () => grid.evaluate(async (grid: HTMLRevoGridElement) => {
      const plugins = await grid.getPlugins();
      return (plugins.find((plugin: any) => plugin.switchView && plugin.back) as any).getSnapshot().view;
    });
    const submit = async (request: string, expectedView: string) => {
      await prompt.click();
      await prompt.fill(request);
      await prompt.press('Enter');
      await expect.poll(() => grid.evaluate(async (grid: HTMLRevoGridElement) => {
        const plugins = await grid.getPlugins();
        return (plugins.find((plugin: any) => plugin.clearChat && plugin.submit) as any).getSnapshot().phase;
      })).toBe('completed');
      await expect.poll(view).toBe(expectedView);
    };

    await expect(demo!.getByRole('radiogroup', { name: 'Report view' })).toHaveCount(0);
    await submit('Show grouped rows by Status', 'grid');
    expect(await grid.evaluate((grid: HTMLRevoGridElement) => grid.grouping.props)).toEqual(['status']);
    await submit('Only Europe', 'grid');
    await submit('Show donut chart by amount and status', 'chart');
    await expect(grid).toBeVisible();
    await expect(charts).toHaveCount(1);
    await expectDashboardCards();
    const reportWidth = await grid.evaluate((grid: HTMLRevoGridElement) => grid.clientWidth);
    await expect.poll(() => grid.evaluate(async (grid: HTMLRevoGridElement) => {
      const owner = (await grid.getPlugins()).find((plugin: any) => plugin.providers?.dimension) as any;
      return owner.providers.dimension.stores.rgCol.store.get('realSize');
    })).toBeGreaterThanOrEqual(reportWidth - 20);
    await expect(dashboard.locator('.rv-pivot-chart-dialog__settings')).toHaveCount(0);
    await expect(dashboard.getByRole('button', { name: 'View data', exact: true })).toHaveCount(0);
    await expect(dashboard.getByRole('button', { name: 'View chart', exact: true })).toHaveCount(0);
    const gridBox = await grid.boundingBox();
    const chartBox = await dashboard.boundingBox();
    expect(chartBox!.x).toBeGreaterThanOrEqual(gridBox!.x + gridBox!.width);
    const toolbar = demo!.getByRole('toolbar', { name: 'Grid controls', exact: true });
    await expect(toolbar.getByRole('radio', { name: 'Data Grid', exact: true })).toBeVisible();
    const historyBox = (await toolbar.getByRole('button', { name: 'Undo data change', exact: true }).boundingBox())!;
    const backBox = (await toolbar.getByRole('radio', { name: 'Data Grid', exact: true }).boundingBox())!;
    expect(Math.abs(historyBox.y - backBox.y)).toBeLessThan(4);

    await submit('Show a dashboard with donut and area charts', 'chart');
    await expect(charts).toHaveCount(2);
    await expectDashboardCards();
    if (framework === 'ts') {
      await page.mouse.move(0, 0);
      await page.screenshot({ path: 'test-results/screenshots/03-dashboard.png' });
      await charts.first().hover();
      await expect(charts.first().locator('.rv-pivot-chart-dialog__visual-header')).toHaveCSS('opacity', '1');
      await page.screenshot({ path: 'test-results/screenshots/04-hover.png' });
    }
    await submit('Show this as Pivot', 'pivot');
    await expect(dashboard).toBeHidden();
    await expect(grid).toBeVisible();
    await submit('Go back to the previous view', 'chart');
    await expect(charts).toHaveCount(2);
    await demo!.getByRole('radio', { name: 'Data Grid', exact: true }).click();
    await expect.poll(view).toBe('grid');
    expect(await grid.evaluate((grid: HTMLRevoGridElement) => grid.source)).toEqual(source);
    expect(await grid.evaluate((grid: HTMLRevoGridElement) => grid.grouping.props)).toEqual(['status']);
    expect(await grid.evaluate((grid: HTMLRevoGridElement) => grid.stretch)).toBe('all');
    const columns = await grid.evaluate(async (grid: HTMLRevoGridElement) => (await grid.getColumns()).map(({ prop, size, columnType }) => ({ prop, size, columnType })));
    expect(columns.find(column => column.prop === 'amount')?.columnType).toBe('number');
    const width = await grid.evaluate((grid: HTMLRevoGridElement) => grid.clientWidth);
    await expect.poll(() => grid.evaluate(async (grid: HTMLRevoGridElement) => {
      const plugins = await grid.getPlugins();
      const stretch = plugins.find((plugin: any) => plugin.providers?.dimension && plugin.providers?.viewport) as any;
      return stretch.providers.dimension.stores.rgCol.store.get('realSize');
    })).toBeGreaterThanOrEqual(width - 20);
    await expect(dashboard).toBeHidden();
    await expect(demo!.getByRole('radio', { name: 'Data Grid', exact: true })).toHaveAttribute('aria-checked', 'true');
    const control = demo!.getByRole('radio', { name: 'Pivot Chart', exact: true });
    await expect(control).toBeVisible();
    await control.click();
    await expect.poll(view).toBe('chart');
    await expect(charts).toHaveCount(2);
    await demo!.getByRole('radio', { name: 'Data Grid', exact: true }).click();
    await expect.poll(view).toBe('grid');

    await submit('Go back to the previous view', 'chart');
    await expect(charts).toHaveCount(2);
    const steps = demo!.locator('.rv-ai-trail-trigger');
    await demo!.getByRole('radio', { name: 'Data Grid', exact: true }).click();
    await expect.poll(view).toBe('grid');
    await expect(demo!.locator('.rv-ai-message--user')).toHaveCount(7);
    await prompt.press('Escape');
    await submit('Go back to the previous view', 'chart');
    await expect(charts).toHaveCount(2);
    await demo!.getByRole('button', { name: 'New conversation', exact: true }).click();
    await expect(demo!.locator('.rv-ai-message--user')).toHaveCount(0);
    await expect(charts).toHaveCount(2);
    await expect.poll(view).toBe('chart');
    await expect(grid).toBeVisible();
    await expect.poll(view).toBe('chart');
    await expect(demo!.getByRole('button', { name: 'Reset workspace', exact: true })).toHaveCount(0);
    await expect(demo!.locator('.rv-ai-trail-trigger')).toHaveCount(0);
    if (framework === 'ts') await submit('Show a dashboard with donut and area charts', 'chart');
    if (framework === 'ts') {
      if (await steps.count() && await steps.getAttribute('aria-expanded') === 'true') await steps.click();
      await page.setViewportSize({ width: 390, height: 1100 });
      await expect.poll(async () => {
        const data = await grid.boundingBox();
        const chart = await dashboard.boundingBox();
        return chart!.y >= data!.y + data!.height;
      }).toBe(true);
      const dataBox = await grid.boundingBox();
      const dashboardBox = await dashboard.boundingBox();
      const assistantBox = await demo!.locator('.ai-view-demo__assistant').boundingBox();
      expect(dashboardBox!.y).toBeGreaterThanOrEqual(dataBox!.y + dataBox!.height);
      expect(assistantBox!.y).toBeGreaterThanOrEqual(dashboardBox!.y + dashboardBox!.height);
      await page.screenshot({ path: 'test-results/screenshots/06-mobile.png' });
    }
  });
}

test('AI views reveal native settings only on an explicit request', async ({ page }) => {
  await page.route(/cookieyes\.com/, route => route.abort());
  await page.route('**/api/ai-view/interpret', route => route.fulfill({ status: 503, body: '' }));
  await page.goto('/?framework=ts');
  const prompt = page.getByLabel('Ask AI to change this view');
  const submit = async (text: string) => {
    await prompt.click();
    await prompt.fill(text);
    await prompt.press('Enter');
    await expect(page.locator('.rv-ai-message--assistant').last()).toContainText('Showing');
  };
  const dashboard = page.locator('.ai-view-demo__chart');
  const settings = dashboard.locator('.rv-pivot-chart-dialog__settings');
  await submit('Show donut chart by amount and status');
  await expect(settings).toHaveCount(0);
  await expect(dashboard.getByRole('button', { name: 'View data', exact: true })).toHaveCount(0);
  await expect(dashboard.getByRole('button', { name: 'View chart', exact: true })).toHaveCount(0);
  await submit('Show chart settings');
  await expect(settings).toBeVisible();
  await expect(settings.getByRole('tab', { name: 'Layout', exact: true })).toBeVisible();
  const configuredCard = (await dashboard.locator('.rv-pivot-chart-embedded').boundingBox())!;
  const editor = (await settings.boundingBox())!;
  expect(editor.width).toBeGreaterThanOrEqual(configuredCard.width - 2);
  expect(editor.x + editor.width).toBeLessThanOrEqual(configuredCard.x + configuredCard.width);
  await expect(dashboard.locator('.rv-pivot-chart-dialog__visual')).toBeHidden();
  await page.screenshot({ path: 'test-results/screenshots/05-settings.png' });
  await dashboard.getByRole('button', { name: 'Close settings', exact: true }).click();
  await expect(settings).toHaveCount(0);
  await expect(dashboard.locator('.rv-pivot-chart-dialog__visual')).toBeVisible();
  await expect(dashboard.getByRole('button', { name: 'View data', exact: true })).toHaveCount(0);
  await submit('Show chart settings');
  await expect(settings).toBeVisible();
  await submit('Hide chart settings');
  await expect(settings).toHaveCount(0);
  await submit('Show this as Pivot');
  await expect(page.locator('.pivot-config')).toHaveCount(0);
  await submit('Show Pivot settings');
  await expect(page.locator('.pivot-config')).toBeVisible();
  await submit('Hide Pivot settings');
  await expect(page.locator('.pivot-config')).toHaveCount(0);
});

test('Pivot and dashboard results are read-only while Data remains editable', async ({ page }) => {
  await page.route('**/api/ai-view/interpret', route => route.fulfill({ status: 503, body: '' }));
  await page.goto('/?framework=ts');
  const grid = page.locator('.ai-view-demo__surface > revo-grid');
  const prompt = page.getByLabel('Ask AI to change this view');
  const submit = async (text: string) => {
    await prompt.fill(text);
    await prompt.press('Enter');
    await expect.poll(() => grid.evaluate(async (grid: HTMLRevoGridElement) => {
      const plugins = await grid.getPlugins();
      return (plugins.find((plugin: any) => plugin.clearChat && plugin.submit) as any).getSnapshot().phase;
    })).toBe('completed');
  };
  for (const request of ['Show a dashboard with donut and area charts', 'Show this as Pivot']) {
    await submit(request);
    await expect.poll(() => grid.evaluate((grid: HTMLRevoGridElement) => grid.readonly)).toBe(true);
    const amount = grid.getByRole('gridcell', { name: '34,040.00', exact: true });
    await amount.dblclick();
    await page.keyboard.press('Enter');
    await page.keyboard.press('7');
    await page.keyboard.press('Delete');
    await expect(grid.locator('revogr-edit input')).toBeHidden();
    await expect(amount).toBeVisible();
  }
  await page.getByRole('radio', { name: 'Data Grid', exact: true }).click();
  await expect.poll(() => grid.evaluate((grid: HTMLRevoGridElement) => grid.readonly)).toBe(false);
  const firstAmount = await grid.evaluate((grid: HTMLRevoGridElement) => grid.source[0].amount);
  await grid.getByRole('gridcell', { name: Number(firstAmount).toLocaleString('en-US', { minimumFractionDigits: 2 }), exact: true }).first().dblclick();
  const editor = grid.locator('revogr-edit input');
  await expect(editor).toBeVisible();
  await editor.fill('100000');
  await editor.press('Enter');
  await expect(grid.getByRole('gridcell', { name: '100,000.00', exact: true })).toBeVisible();
  const expectedOpen = await grid.evaluate((grid: HTMLRevoGridElement) =>
    grid.source.filter(row => row.status === 'Open').reduce((sum, row) => sum + Number(row.amount), 0));
  await submit('Show a dashboard with donut and area charts');
  await expect(page.locator('.ai-view-demo__chart .rv-pivot-chart-embedded')).toHaveCount(2);
  await expect.poll(() => grid.evaluate(async (grid: HTMLRevoGridElement) => {
    const plugins = await grid.getPlugins();
    const charts = plugins.find((plugin: any) => plugin.getChartData) as any;
    const data = await charts.getChartData();
    return data.values[data.categories.findIndex((category: any) => category.label === 'Open')][0];
  })).toBe(expectedOpen);
  await page.getByRole('button', { name: 'New conversation', exact: true }).click();
  await expect(page.locator('.ai-view-demo__chart .rv-pivot-chart-embedded')).toHaveCount(2);
  await page.getByRole('radio', { name: 'Data Grid', exact: true }).click();
  await expect(grid.getByRole('gridcell', { name: '100,000.00', exact: true })).toBeVisible();
});

test('dashboard widget removal and record commands retain view configuration', async ({ page }) => {
  await page.route('**/api/ai-view/interpret', route => route.fulfill({ status: 503, body: '' }));
  await page.goto('/?framework=ts');
  const prompt = page.getByLabel('Ask AI to change this view');
  const submit = async (text: string) => {
    await prompt.fill(text);
    await prompt.press('Enter');
    await expect.poll(async () => page.locator('.ai-view-demo__surface > revo-grid').evaluate(async (grid: HTMLRevoGridElement) => {
      const plugins = await grid.getPlugins();
      return (plugins.find((plugin: any) => plugin.clearChat && plugin.submit) as any).getSnapshot().phase;
    })).toBe('completed');
  };
  const cards = page.locator('.ai-view-demo__chart .rv-pivot-chart-embedded');
  await submit('Show a dashboard with donut and area charts');
  await expect(cards).toHaveCount(2);
  const header = cards.first().locator('.rv-pivot-chart-dialog__visual-header');
  await page.mouse.move(0, 0);
  await expect(header).toHaveCSS('opacity', '0');
  await cards.first().hover();
  await expect(header).toHaveCSS('opacity', '1');
  const headerBox = (await header.boundingBox())!;
  const plotBox = (await cards.first().locator('.rv-pivot-chart-dialog__chart').boundingBox())!;
  expect(headerBox.height).toBeLessThanOrEqual(42);
  expect(plotBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height);
  await expect(page.locator('.ai-view-demo__toolbar')).toHaveCSS('border-bottom-width', '0px');
  await expect(page.locator('.ai-view-demo__surface > revo-grid')).toHaveCSS('border-top-width', '1px');
  await cards.first().getByRole('button', { name: 'Close Pivot chart', exact: true }).click();
  await expect(cards).toHaveCount(1);
  await expect(cards.locator('svg').first()).toBeVisible();
  await submit('Show orders above 1000');
  await expect(page.getByRole('radio', { name: 'Data Grid', exact: true })).toBeVisible();
  await expect(cards).toHaveCount(1);
  await expect(page.locator('.rv-ai-message--error')).toHaveCount(0);
  await submit('Sort highest amount first');
  await expect(cards).toHaveCount(1);
  await expect(page.locator('.rv-ai-message--error')).toHaveCount(0);
  await page.getByRole('radio', { name: 'Data Grid', exact: true }).click();
  await expect(cards).toHaveCount(0);
  await expect.poll(() => page.locator('.ai-view-demo__surface > revo-grid').evaluate(async (grid: HTMLRevoGridElement) => {
    const plugins = await grid.getPlugins();
    return (plugins.find((plugin: any) => plugin.switchView && plugin.back) as any).getSnapshot().busy;
  })).toBe(false);
  await submit('Go back to the previous view');
  await expect(cards).toHaveCount(1);
  await cards.first().hover();
  await cards.first().getByRole('button', { name: 'Close Pivot chart', exact: true }).click();
  await expect(cards).toHaveCount(0);
  await page.getByRole('radio', { name: 'Data Grid', exact: true }).click();
  await expect.poll(() => page.locator('.ai-view-demo__surface > revo-grid').evaluate(async (grid: HTMLRevoGridElement) => {
    const plugins = await grid.getPlugins();
    return (plugins.find((plugin: any) => plugin.switchView && plugin.back) as any).getSnapshot().busy;
  })).toBe(false);
  await submit('Go back to the previous view');
  await expect(cards).toHaveCount(0);
});

test('steps retain chart and dashboard requests before a filter command', async ({ page }) => {
  await page.route('**/api/ai-view/interpret', route => route.fulfill({ status: 503, body: '' }));
  await page.goto('/?framework=ts');
  await page.locator('.ai-view-demo__surface > revo-grid').evaluate((grid: HTMLRevoGridElement) => {
    grid.aiAssistant = { ...grid.aiAssistant!, ui: { ...grid.aiAssistant!.ui, mode: 'toolbar' } };
  });
  const grid = page.locator('.ai-view-demo__surface > revo-grid');
  const prompt = page.getByLabel('Ask AI to change this view');
  const requests = ['Show donut chart by amount and status', 'Show this as an area chart', 'Show a dashboard with donut and area charts', 'Show orders above 1000'];
  for (const request of requests) {
    await prompt.fill(request);
    await prompt.press('Enter');
    await expect.poll(() => grid.evaluate(async (grid: HTMLRevoGridElement) => {
      const plugins = await grid.getPlugins();
      return (plugins.find((plugin: any) => plugin.clearChat && plugin.submit) as any).getSnapshot().phase;
    })).toBe('completed');
  }
  const trigger = page.locator('.rv-ai-trail-trigger');
  await expect(trigger).toHaveText('');
  await expect(trigger).toHaveAccessibleName('Request history');
  await trigger.click();
  const steps = page.locator('.rv-ai-trail-steps .rv-ai-step');
  await expect(steps).toHaveCount(4);
  for (let index = 0; index < requests.length; index++) await expect(steps.nth(index)).toContainText(requests[index]);
  for (let index = 0; index < 3; index++) await expect(steps.nth(index).getByRole('button')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/screenshots/ai-mixed-steps.png', animations: 'disabled' });
  await steps.nth(3).getByRole('button', { name: 'Remove request: Show orders above 1000', exact: true }).click();
  await expect(steps).toHaveCount(3);
  await expect(steps).toHaveCount(3);
  await expect(page.locator('.rv-ai-trail-message')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/screenshots/ai-mixed-steps-after-removal.png', animations: 'disabled' });
});

test('filtering keeps the same dashboard charts and updates their totals', async ({ page }) => {
  await page.route('**/api/ai-view/interpret', route => route.fulfill({ status: 503, body: '' }));
  await page.goto('/?framework=ts');
  const grid = page.locator('.ai-view-demo__surface > revo-grid');
  const prompt = page.getByLabel('Ask AI to change this view');
  const source = await grid.evaluate((grid: HTMLRevoGridElement) => grid.source);
  const suggestions = page.getByRole('group', { name: 'Suggested requests', exact: true });
  await expect(suggestions.locator('.rv-ai-suggestion')).toHaveCount(2);
  await expect(suggestions.locator('.rv-ai-suggestion')).toHaveText(['Orders above 1K', 'Only Europe']);
  await suggestions.getByRole('combobox', { name: 'More', exact: true }).click();
  await expect(page.getByRole('option', { name: 'Order Charts', exact: true })).toBeVisible();
  await expect(page.getByRole('option', { name: 'Group by status', exact: true })).toBeVisible();
  await expect(page.getByRole('option', { name: /settings|configurator|pivot/i })).toHaveCount(0);
  await page.screenshot({ path: 'test-results/screenshots/ai-suggestions-trimmed.png', animations: 'disabled' });
  await page.keyboard.press('Escape');
  const submit = async (text: string) => {
    await prompt.fill(text); await prompt.press('Enter');
    await expect.poll(() => grid.evaluate(async (grid: HTMLRevoGridElement) => {
      const plugins = await grid.getPlugins();
      const state = (plugins.find((plugin: any) => plugin.clearChat && plugin.submit) as any).getSnapshot();
      return state.phase;
    })).toBe('completed');
  };
  const models = () => grid.evaluate(async (grid: HTMLRevoGridElement) => {
    const plugins = await grid.getPlugins();
    return (plugins.find((plugin: any) => plugin.getChartModels) as any).getChartModels();
  });
  await submit('Show a dashboard with donut and area charts');
  const initial = await models();
  expect(initial.map((model: any) => model.chartType)).toEqual(['donut', 'area']);
  expect(initial[1].query.slice.rows).toEqual(['country']);
  const chartData = () => grid.evaluate(async (grid: HTMLRevoGridElement) => {
    const plugins = await grid.getPlugins();
    const owner = plugins.find((plugin: any) => plugin.getChartModels) as any;
    return Promise.all(owner.getChartModels().map((model: any) => owner.getChartData({ chartType: model.chartType, query: model.query })));
  });
  const datasets = await chartData();
  expect(datasets[0].series[0].label).toBe('Amount (sum)');
  expect(datasets[1].categories.map((category: any) => category.label).sort()).toEqual(['Canada', 'Germany', 'Japan', 'Portugal', 'Singapore', 'USA']);
  await grid.evaluate((grid: HTMLRevoGridElement) => {
    (window as any).sourceFlashes = 0;
    grid.addEventListener('aftersourceset', () => {
      if (grid.source.some(row => Object.hasOwn(row, 'id'))) (window as any).sourceFlashes++;
    });
  });
  const charts = page.locator('.ai-view-demo__chart .rv-pivot-chart-embedded');
  await submit('Show orders above 1000');
  await expect(charts).toHaveCount(2);
  expect((await models()).map((model: any) => model.chartId)).toEqual(initial.map((model: any) => model.chartId));
  const total = () => grid.evaluate(async (grid: HTMLRevoGridElement) => {
    const plugins = await grid.getPlugins();
    const data = await (plugins.find((plugin: any) => plugin.getChartData) as any).getChartData();
    return data.values.flat().reduce((sum: number, value: number) => sum + value, 0);
  });
  expect(await total()).toBe(source.filter(row => row.amount > 1000).reduce((sum, row) => sum + row.amount, 0));
  await submit('Only Europe');
  await expect(charts).toHaveCount(2);
  expect((await chartData())[1].categories.map((category: any) => category.label).sort()).toEqual(['Germany', 'Portugal']);
  expect(await total()).toBe(source.filter(row => row.amount > 1000 && row.region === 'Europe').reduce((sum, row) => sum + row.amount, 0));
  const configuration = (items: any[]) => items.map(({ drill, ...model }) => ({ ...model, drill: { ...drill, revision: undefined } }));
  expect(configuration(await models())).toEqual(configuration(initial));
  expect(await page.evaluate(() => (window as any).sourceFlashes)).toBe(0);
  await page.screenshot({ path: 'test-results/screenshots/filtered-dashboard.png', animations: 'disabled' });
  await expect(page.locator('.rv-ai-trail-trigger')).toHaveCount(0);
  const beforeConversation = await models();
  const beforeRows = await grid.evaluate((grid: HTMLRevoGridElement) => grid.source);
  await prompt.fill('Draft to discard');
  await page.getByRole('button', { name: 'New conversation', exact: true }).click();
  await expect(prompt).toHaveValue('');
  await expect(page.locator('.rv-ai-message--user')).toHaveCount(0);
  await expect(charts).toHaveCount(2);
  expect(await models()).toEqual(beforeConversation);
  expect(await grid.evaluate((grid: HTMLRevoGridElement) => grid.source)).toEqual(beforeRows);
  expect(await page.evaluate(() => (window as any).sourceFlashes)).toBe(0);
  await submit('Orders above 1K');
  await expect.poll(total).toBe(source.filter(row => row.amount > 1000 && row.region === 'Europe').reduce((sum, row) => sum + row.amount, 0));
  await page.reload();
  await expect(prompt).toBeVisible();
  await expect(charts).toHaveCount(0);
  expect(await grid.evaluate((grid: HTMLRevoGridElement) => grid.source)).toEqual(source);
  await submit('Totals by status');
  await grid.evaluate((grid: HTMLRevoGridElement) => {
    (window as any).sourceFlashes = 0;
    grid.addEventListener('aftersourceset', () => {
      if (grid.source.some(row => Object.hasOwn(row, 'id'))) (window as any).sourceFlashes++;
    });
  });
  await submit('Orders above 1K');
  expect(await total()).toBe(source.filter(row => row.amount > 1000).reduce((sum, row) => sum + row.amount, 0));
  expect(await page.evaluate(() => (window as any).sourceFlashes)).toBe(0);
});


test('view navigation and AI results use host translations', async ({ page }) => {
  await page.route('**/api/ai-view/interpret', route => route.fulfill({ status: 503, body: '' }));
  await page.goto('/?framework=ts');
  const grid = page.locator('.ai-view-demo__surface > revo-grid');
  await expect(page.getByLabel('Ask AI to change this view')).toBeVisible({ timeout: 60000 });
  await expect(grid.getByRole('columnheader', { name: 'Order', exact: true })).toBeVisible();
  await grid.evaluate((grid: HTMLRevoGridElement) => {
    const translations = {
      Pivot: 'Synthèse', 'Pivot Chart': 'Tableau de bord',
      'Showing {view}.': 'Affichage : {view}.',
      'Data Grid': 'Retour aux données',
      'Ask AI to change this view': 'Modifier cette vue',
      'Unknown or unavailable view.': 'Vue inconnue.',
    };
    grid.viewSwitcher = { ...grid.viewSwitcher, translations };
    grid.aiAssistant = { ...grid.aiAssistant!, translations };
  });
  const prompt = page.getByLabel('Modifier cette vue', { exact: true });
  await prompt.fill('Show a dashboard with donut and area charts');
  await prompt.press('Enter');
  await expect(page.getByText('Affichage : Tableau de bord.', { exact: true })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Retour aux données', exact: true })).toBeVisible();
  await prompt.fill('Show this as Pivot');
  await prompt.press('Enter');
  await expect(page.getByText('Affichage : Synthèse.', { exact: true })).toBeVisible();
  const navigation = await grid.evaluate(async (grid: HTMLRevoGridElement) => {
    const plugins = await grid.getPlugins();
    const views = plugins.find((plugin: any) => plugin.switchView && plugin.back) as any;
    let error: string | undefined;
    try { await views.switchView('missing'); } catch (reason) { error = (reason as Error).message; }
    return { labels: views.getSnapshot().views.map((view: any) => view.label), error };
  });
  expect(navigation).toEqual({ labels: ['Retour aux données', 'Synthèse', 'Tableau de bord'], error: 'Vue inconnue.' });
  await page.getByRole('radio', { name: 'Retour aux données', exact: true }).click();
  await expect(grid.getByRole('columnheader', { name: 'Order', exact: true })).toBeVisible();
});


test('regular grid uses numeric editing, slider and selection filters, and status choices', async ({ page }) => {
  await page.route('**/api/ai-view/interpret', route => route.fulfill({ status: 503, body: '' }));
  await page.goto('/?framework=ts');
  const grid = page.locator('.ai-view-demo__surface > revo-grid');
  await expect(grid.getByRole('gridcell', { name: '100.00', exact: true })).toBeVisible();
  const metadata = await grid.evaluate(async (grid: HTMLRevoGridElement) => ({
    columns: (await grid.getColumns()).map(({ prop, columnType, filter }) => ({ prop, columnType, filter })),
    filter: grid.filter,
  }));
  expect(metadata.columns).toEqual(expect.arrayContaining([
    expect.objectContaining({ prop: 'amount', columnType: 'number', filter: ['number', 'slider'] }),
    expect.objectContaining({ prop: 'country', filter: ['string', 'selection'] }),
    expect.objectContaining({ prop: 'status', columnType: 'dropdown' }),
  ]));
  expect(metadata.filter).toMatchObject({ selection: { excelMode: 'windows' } });
  await expect(grid.locator('.filter-header-selection-trigger')).toHaveCount(0);
  await grid.getByRole('columnheader').filter({ hasText: 'Amount' }).locator('.rv-filter').first().click();
  const popup = page.locator('revogr-filter-panel');
  await expect(popup.locator('.from-range-input')).toBeVisible();
  await popup.getByLabel('Close filter').click();
  await grid.getByRole('columnheader').filter({ hasText: 'Country' }).locator('.rv-filter').first().click();
  await expect(popup.locator('.filter-list-option', { hasText: 'Portugal' })).toBeVisible();
  const checkboxStyle = async (element: HTMLInputElement) => {
    await Promise.all(element.getAnimations().map(animation => animation.finished.catch(() => {})));
    const style = getComputedStyle(element);
    return [style.width, style.height, style.borderRadius, style.backgroundColor, style.borderColor, style.appearance];
  };
  await page.mouse.move(0, 0);
  const selectAll = popup.locator('.filter-excel-check-row input[type="checkbox"]').first();
  const listCheckboxes = popup.locator('.filter-list-option input[type="checkbox"]');
  expect(await selectAll.evaluate(checkboxStyle)).toEqual(await listCheckboxes.first().evaluate(checkboxStyle));
  await listCheckboxes.first().uncheck();
  await expect(selectAll).toHaveJSProperty('indeterminate', true);
  expect(await selectAll.evaluate(checkboxStyle)).toEqual(await listCheckboxes.nth(1).evaluate(checkboxStyle));

  await popup.getByLabel('Close filter').click();
  await grid.getByRole('gridcell').filter({ has: page.locator('.dropdown-trigger') }).first().locator('.dropdown-trigger').click();
  await page.locator('.dropdown-option').filter({ hasText: /^Shipped$/ }).click();
  await expect.poll(() => grid.evaluate((grid: HTMLRevoGridElement) => grid.source[0].status)).toBe('Shipped');
  await page.screenshot({ path: 'test-results/screenshots/ai-regular-grid.png', animations: 'disabled' });
});

test('Amount validation, dynamic highlights and Format Cells reuse native tools and keep numbers', async ({ page }) => {
  await page.route('**/api/ai-view/interpret', route => route.fulfill({ status: 503, body: '' }));
  await page.goto('/?framework=ts');
  const grid = page.locator('.ai-view-demo__surface > revo-grid');
  const prompt = page.getByLabel('Ask AI to change this view');
  const amount = grid.getByRole('gridcell', { name: '100.00', exact: true });
  await expect(amount).toHaveCSS('text-align', 'right');
  await amount.dblclick();
  const editor = grid.locator('revogr-edit input');
  await editor.fill('1250');
  await editor.press('Enter');
  await expect.poll(() => grid.evaluate((grid: HTMLRevoGridElement) => ({ value: grid.source[0].amount, type: typeof grid.source[0].amount }))).toEqual({ value: 1250, type: 'number' });
  const submit = async (text: string) => {
    await prompt.fill(text); await prompt.press('Enter');
    await expect.poll(() => grid.evaluate(async (grid: HTMLRevoGridElement) => {
      const plugin = (await grid.getPlugins()).find((plugin: any) => plugin.clearChat && plugin.submit) as any;
      return plugin.getSnapshot().phase;
    })).toBe('completed');
  };
  await submit('Amounts above 100');
  await expect(grid.getByRole('gridcell', { name: '1,250.00', exact: true })).toHaveCSS('background-color', 'rgb(254, 243, 199)');
  await submit('Format Amount as currency');
  await expect(grid.getByRole('gridcell', { name: '$1,250.00', exact: true })).toBeVisible();
  expect(await grid.evaluate((grid: HTMLRevoGridElement) => grid.source[0].amount)).toBe(1250);
  // Simulate imported bad data; ordinary numeric editing prevents invalid commits.
  await grid.evaluate((grid: HTMLRevoGridElement) => { grid.source = grid.source.map((row, index) => index === 0 ? { ...row, amount: -25 } : row); });
  await submit('Highlight invalid Amounts');
  await expect(grid.locator('.validation-error').first()).toBeVisible();
  await submit('Check Amounts');
  await expect(page.locator('.rv-ai-message--assistant').last()).toContainText('1 invalid Amounts found.');
});
