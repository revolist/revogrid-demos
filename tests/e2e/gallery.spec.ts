import { expect, test } from '@playwright/test';

const featureSlugs = ['pivot', 'gantt', 'kanban', 'scheduler'];
const retainedSlugs = [
  'ai-agent',
  'advanced-grids',
  'category-forecast',
  'core-project-portfolio',
  'core',
  'excel',
  'ecommerce',
  'project-table',
  'filtering',
  'infinity-scroll',
  'column-collapse',
  'data-grid-context-menu',
  'row-master',
  'audit-history',
  'tree-data',
  'planning',
  'construction-operations',
  'construction-gantt-simple',
];

test('gallery is complete, keyboard navigable, and responsive', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('See what you can build');
  await expect(page.locator('.showcase-card')).toHaveCount(33);
  for (const section of ['Analytics & business', 'Planning & workflows', 'Grid features']) {
    await expect(page.getByRole('heading', { name: section })).toBeVisible();
  }
  await expect(page.getByRole('heading', { name: 'Kanban Workflow Board' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Resource Scheduler/ })).toHaveAttribute('href', '/scheduler/demo/');
  await expect(page.getByRole('heading', { name: 'Pivot Table & Charts' })).toBeVisible();
  const scenarios = page.locator('.showcase-card a[href^="/examples/"]');
  await expect(scenarios).toHaveCount(12);
  const preview = scenarios.first().locator('img');
  await expect(preview).toHaveCSS('filter', 'grayscale(1)');
  await expect.poll(() => preview.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await scenarios.first().click();
  await expect(page.locator('revo-grid').first()).toBeVisible();
  await expect(page.locator('.workbench-nav')).toHaveCount(0);
  await page.goto('/');
  await page.evaluate(() => window.scrollTo(0, 700));
  await expect(page.locator('.header-bar')).toBeInViewport();
  await expect(page.locator('.header-bar')).toHaveCSS('position', 'sticky');
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.showcase-card').first()).toBeVisible();
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect.poll(() => page.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgb(9, 9, 9)');
  expect(errors).toEqual([]);
});

test('each advanced grid opens directly without the combined navigation', async ({ page }) => {
  await page.goto('/');
  const links = await page.locator('.showcase-card a[href^="/examples/"]').evaluateAll(elements =>
    elements.map(element => (element as HTMLAnchorElement).getAttribute('href')!),
  );
  expect(links).toHaveLength(12);
  expect(new Set(links).size).toBe(12);
  for (const link of links) {
    await page.goto(link);
    await expect(page.locator('.workbench-content')).toHaveAttribute('data-example-id', link.split('/')[2]);
    await expect(page.locator('revo-grid').first()).toBeVisible();
    await expect(page.locator('.workbench-nav')).toHaveCount(0);
  }
  await page.reload();
  await expect(page.locator('.workbench-content')).toHaveAttribute('data-example-id', links.at(-1)!.split('/')[2]);
  await expect(page.locator('revo-grid').first()).toBeVisible();
  await page.goto('/advanced-grids/demo/#campaign-performance');
  await expect(page.locator('.workbench-content')).toHaveAttribute('data-example-id', 'campaign-performance');
  await expect(page.locator('revo-grid').first()).toBeVisible();
});

test('search and category filters work together and can be cleared', async ({ page }) => {
  await page.goto('/');
  const search = page.getByRole('searchbox', { name: 'Search examples' });
  const groups = page.getByRole('group', { name: 'Filter by category' });
  const results = page.getByRole('status');
  await expect(page.locator('.catalog-search .rv-search-input')).toHaveCount(1);
  await expect(groups).toHaveClass(/rv-segmented-switch/);
  await expect(results).toHaveText('33 examples');
  await expect(results).toHaveClass(/visually-hidden/);
  await expect(page.locator('.catalog-count, .showcase-group-heading > span')).toHaveCount(0);
  await groups.getByRole('button', { name: 'All examples' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(groups.getByRole('button', { name: 'Analytics & business' })).toHaveAttribute('aria-pressed', 'true');
  await expect(results).toHaveText('13 examples');
  await groups.getByRole('button', { name: 'Planning & workflows' }).click();
  await expect(groups.getByRole('button', { name: 'Planning & workflows' })).toHaveAttribute('aria-pressed', 'true');
  await expect(results).toHaveText('10 examples');
  await search.fill('kanban workflow');
  await expect(results).toHaveText('1 example');
  await expect(page.getByRole('heading', { name: 'Kanban Workflow Board' })).toBeVisible();
  await search.fill('no matching example 5738');
  await expect(results).toHaveText('0 examples');
  await expect(page.getByText('No examples match your search.')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(search).toBeFocused();
  await expect(results).toHaveText('33 examples');
  await expect(groups.getByRole('button', { name: 'All examples' })).toHaveAttribute('aria-pressed', 'true');
});

test('a showcase card opens its demo and the old route redirects', async ({ page }) => {
  await page.goto('/');
  const scheduler = page.getByRole('link', { name: /Resource Scheduler/ });
  await expect(scheduler).toHaveAttribute('href', '/scheduler/demo/');
  await scheduler.click();
  await expect(page).toHaveURL(/\/scheduler\/demo\/$/);
  await expect(page.locator('revo-grid').first()).toBeVisible({ timeout: 15_000 });
  await page.goto('/scheduler/?example=calendar#week');
  await expect(page).toHaveURL(/\/scheduler\/demo\/\?example=calendar#week$/);
});

test('gallery follows the system theme and remembers a theme choice', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.locator('.hero-frameworks img')).toHaveCount(4);
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(9, 9, 9)');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Switch to light theme' })).toBeVisible();
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
});

for (const slug of [...featureSlugs, ...retainedSlugs]) {
  test(`${slug} legacy route opens its demo`, async ({ page }) => {
    await page.goto(`/${slug}/`);
    await expect(page).toHaveURL(new RegExp(`/${slug}/demo/`));
    await expect(page.locator('revo-grid').first()).toBeVisible({ timeout: 15_000 });
  });
}

test('tree toolbar groups icon actions and keeps Sticky parents on the right', async ({ page }) => {
  await page.goto('/tree-data/demo/');

  const toolbar = page.locator('.tree-toolbar');
  const actions = toolbar.getByRole('group', { name: 'Tree actions' });
  const sticky = toolbar.getByRole('switch', { name: 'Sticky parents' });
  const expand = actions.getByRole('button', { name: 'Expand all' });
  const collapse = actions.getByRole('button', { name: 'Collapse all' });
  const exportButton = actions.getByRole('button', { name: 'Export to Excel' });

  for (const button of [expand, collapse, exportButton]) {
    await expect(button.locator('svg')).toBeVisible();
    await expect(button).toHaveCSS('width', '28px');
    await expect(button).toHaveCSS('height', '28px');
    await expect(button).toHaveCSS('border-radius', '6px');
  }
  await expect(actions).toHaveCSS('height', '38px');
  await collapse.hover();
  await expect(collapse).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(sticky).toBeChecked();
  const actionsBox = await actions.boundingBox();
  const stickyBox = await sticky.boundingBox();
  expect(stickyBox!.x).toBeGreaterThan(actionsBox!.x + actionsBox!.width);

  const grid = page.locator('revo-grid');
  const member = grid.getByText('Eva Green', { exact: true });
  await collapse.click();
  await expect(member).toHaveCount(0);
  await expand.focus();
  await page.keyboard.press('Enter');
  await expect(member).toBeVisible();
  await sticky.click();
  await expect(sticky).not.toBeChecked();
  await expect.poll(() => grid.evaluate(element => (element as HTMLRevoGridElement).tree?.stickyParents)).toBe(false);
  await expect(member).toBeVisible();

  const download = page.waitForEvent('download');
  await exportButton.click();
  expect((await download).suggestedFilename()).toMatch(/\.xlsx$/);
});

test('construction gallery route keeps the canonical TypeScript build and current scoped styles', async ({ page }) => {
  await page.goto('/construction-operations/demo/');

  const shell = page.locator('.construction-fabrication');
  const projectLink = shell.locator('.construction-fabrication__project-link').first();
  await expect(shell).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('construction-operations-grid')).toHaveCount(0);
  await expect(projectLink).toHaveCSS('color', 'rgb(29, 78, 216)');
  await expect(shell.locator('.rowHeaders .revo-drag-icon').first()).toBeHidden();
});

test('audit history attributes a live edit and appends it to the ledger', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/audit-history/demo/');

  const grid = page.locator('revo-grid');
  const customerCell = grid.locator('.rgCell[data-rgcol="1"][data-rgrow="0"]').first();
  await expect(page.locator('.rv-audit-history-panel')).toBeVisible({ timeout: 15_000 });
  await customerCell.dblclick();
  await grid.locator('input').fill('Northwind Labs');
  await page.keyboard.press('Enter');

  await expect.poll(() => grid.evaluate(async element => {
    const plugins = await (element as HTMLRevoGridElement).getPlugins();
    const audit = plugins.find(plugin => typeof (plugin as { getRecords?: unknown }).getRecords === 'function') as { getRecords: () => Array<{ changes: Array<{ newValue?: unknown }> }> } | undefined;
    return audit?.getRecords().length;
  })).toBe(5);
  const latestValue = await grid.evaluate(async element => {
    const plugins = await (element as HTMLRevoGridElement).getPlugins();
    const audit = plugins.find(plugin => typeof (plugin as { getRecords?: unknown }).getRecords === 'function') as { getRecords: () => Array<{ changes: Array<{ newValue?: unknown }> }> };
    return audit.getRecords().at(-1)?.changes[0]?.newValue;
  });
  expect(latestValue).toBe('Northwind Labs');
  expect(errors).toEqual([]);
});

test('filtering showcase composes global search, filter badges, and Clear All responsively', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/filtering/demo/');

  const explorer = page.getByRole('region', { name: 'Advanced Filtering: Order Explorer' });
  const grid = explorer.locator('revo-grid');
  const count = explorer.locator('.order-explorer__count');
  await expect(grid).toBeVisible({ timeout: 15_000 });
  await expect(grid.locator('revogr-header .column-icon')).toHaveCount(9);

  const orderDate = grid.locator('revogr-header .rgHeaderCell', { hasText: 'Order date' }).first();
  expect((await orderDate.boundingBox())?.width).toBeGreaterThanOrEqual(179);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(explorer).toBeVisible();
  await expect(explorer.getByRole('listitem')).toHaveCount(2);

  await explorer.getByRole('button', { name: 'Try example' }).click();
  await expect(explorer.getByRole('searchbox', { name: 'Search all visible columns' })).toHaveValue('Lisbon pending');
  await expect.poll(async () => count.textContent()).not.toBe('1,000 of 1,000 orders');

  await explorer.getByRole('button', { name: 'Clear All' }).click();
  await expect(explorer.getByRole('listitem')).toHaveCount(0);
  await expect(count).toHaveText('1,000 of 1,000 orders');
  expect(errors).toEqual([]);
});
