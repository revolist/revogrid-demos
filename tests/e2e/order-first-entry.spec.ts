import { expect, test, type Page } from '@playwright/test';

const entry = '/demo/';
const count = (page: Page) => page.locator('.order-explorer__count');
const progress = (page: Page) => page.getByLabel('Scenario progress');
const summaryReset = (page: Page) => page.locator('.order-first-entry__summary-actions').getByRole('button', { name: 'Reset demo' });

function contrastRatio(foreground: string, background: string) {
  const values = (value: string) => value.match(/[\d.]+/g)!.slice(0, 3).map(Number);
  const luminance = (value: string) => {
    const [red, green, blue] = values(value).map(channel => {
      const normalized = channel / 255;
      return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    });
    return red * 0.2126 + green * 0.7152 + blue * 0.0722;
  };
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}
async function queueAndSearch(page: Page) {
  await page.getByRole('button', { name: 'Review queue', exact: true }).click();
  await expect(count(page)).toHaveText('24 of 120 orders');
  await expect(progress(page)).toHaveText('1 of 3 complete');
  await page.getByRole('searchbox', { name: 'Search orders' }).fill('Northstar');
  await expect(count(page)).toHaveText('6 of 120 orders');
  await page.getByRole('searchbox', { name: 'Search orders' }).fill(' Northstar  ');
  await expect(count(page)).toHaveText('6 of 120 orders');
  await expect(progress(page)).toHaveText('2 of 3 complete');
}

test.beforeEach(async ({ page }) => {
  // Third-party analytics/cookie scripts are unrelated to a local demo test.
  await page.route(/cdn-cookieyes\.com|googletagmanager\.com/, route => route.abort());
});

test('orders narrow through real grid filters; reset restores state and confirmed progress', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(entry);
  await page.evaluate(() => {
    (window as any).firstEntryHostEvents = [];
    window.addEventListener('order-explorer-action', (event: Event) => {
      (window as any).firstEntryHostEvents.push((event as CustomEvent).detail);
    });
  });
  await expect(count(page)).toHaveText('120 of 120 orders');
  await page.screenshot({ path: 'test-results/order-first-entry-desktop.png', fullPage: true });
  await queueAndSearch(page);
  await page.getByRole('button', { name: 'Total ≥ $1,000', exact: true }).click();
  await expect(count(page)).toHaveText('2 of 120 orders');
  await expect(progress(page)).toHaveText('3 of 3 complete');
  await expect(page.getByText('You found 2 matching orders.')).toBeVisible();
  await expect(page.locator('.order-first-entry__success').getByRole('link', { name: 'Try free for 30 days' })).toHaveAttribute('href', /demo_id=filtering/);
  await page.screenshot({ path: 'test-results/order-first-entry-complete.png', fullPage: true });
  const rows = await page.locator('.order-first-entry revo-grid').evaluate(async (grid: any) => grid.getVisibleSource());
  expect(rows.map((row: any) => row.orderNumber)).toEqual(['ORD-104005', 'ORD-104006']);
  const analytics = await page.evaluate(() => (window as any).dataLayer.filter((item: any) => item.event === 'demo_action'));
  expect(analytics.map((item: any) => item.action_id)).toEqual(['preset', 'search', 'filter']);
  expect(JSON.stringify(analytics)).not.toContain('Northstar');
  const hostEvents = await page.evaluate(() => (window as any).firstEntryHostEvents);
  expect(hostEvents).toEqual([
    { progress: 1, resultCount: 24 },
    { progress: 2, resultCount: 6 },
    { progress: 3, resultCount: 2 },
  ]);

  await page.getByRole('button', { name: 'Total ≥ $1,000', exact: true }).click();
  await expect(count(page)).toHaveText('6 of 120 orders');
  await page.getByRole('combobox', { name: 'Status' }).selectOption('Payment Hold');
  await expect(count(page)).toHaveText('2 of 120 orders');
  await page.getByRole('combobox', { name: 'Status' }).selectOption('');
  await expect(count(page)).toHaveText('6 of 120 orders');
  await page.getByRole('searchbox').fill('ORD-104001');
  await expect(count(page)).toHaveText('1 of 120 orders');
  await page.getByRole('searchbox').fill('no matching customer');
  await expect(count(page)).toHaveText('0 of 120 orders');
  await expect(page.getByRole('status').filter({ hasText: 'No orders match' })).toBeVisible();
  await expect(page.locator('.order-first-entry__success')).toHaveCount(0);

  // Change public grid state and prove reset disposes the entire previous instance.
  await page.locator('.order-first-entry revo-grid').evaluate((grid: any) => {
    grid.columns = grid.columns.map((column: any) => ({ ...column, size: 250, order: 'desc' }));
    (window as any).oldOrderGrid = grid;
  });
  await summaryReset(page).click();
  await expect(count(page)).toHaveText('120 of 120 orders');
  await expect(progress(page)).toHaveText('0 of 3 complete');
  expect(await page.evaluate(() => (window as any).oldOrderGrid.isConnected)).toBe(false);
  expect(await page.locator('.order-first-entry revo-grid').evaluate((grid: any) => grid.columns.some((col: any) => col.order))).toBe(false);
  await expect(page.getByRole('searchbox')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Review queue', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await queueAndSearch(page);
  await page.getByRole('button', { name: 'Total ≥ $1,000', exact: true }).click();
  await expect(progress(page)).toHaveText('3 of 3 complete');
  expect(errors).toEqual([]);
});

test('reset cancels pending search and controls remain accessible on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(entry);
  await expect(count(page)).toHaveText('120 of 120 orders');
  const queue = page.getByRole('button', { name: 'Review queue', exact: true });
  await queue.focus();
  await page.keyboard.press('Enter');
  await expect(count(page)).toHaveText('24 of 120 orders');
  await page.getByRole('searchbox').fill('Northstar');
  await summaryReset(page).click();
  await expect(count(page)).toHaveText('120 of 120 orders');
  await page.waitForTimeout(300); // Wait past the intentionally cancelled 150ms debounce.
  await expect(count(page)).toHaveText('120 of 120 orders');
  await expect(progress(page)).toHaveText('0 of 3 complete');
  await expect(page.getByRole('navigation', { name: 'Demo scenarios' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Browse all demos' })).toHaveAttribute('href', '/demo/?scenario=performance');
  await expect(page.locator('.VPSidebar')).toBeHidden();
  await expect(page.locator('.VPLocalNav')).toBeHidden();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/order-first-entry-mobile.png', fullPage: true });
  const gridTop = await page.locator('.order-first-entry__grid-shell').evaluate(element => element.getBoundingClientRect().top);
  expect(gridTop).toBeLessThan(844);
  const mobileColumns = await page.locator('.order-first-entry revo-grid').evaluate((grid: any) => grid.columns.map((column: any) => column.name));
  expect(mobileColumns).toEqual(['Order', 'Total (USD)', 'Status']);
  const keyColumnWidth = await page.locator('.order-first-entry revo-grid').evaluate((grid: any) => grid.columns.reduce((sum: number, column: any) => sum + column.size, 0));
  const tableWidth = await page.locator('.order-first-entry__grid-shell').evaluate(element => element.clientWidth);
  expect(keyColumnWidth).toBeLessThanOrEqual(tableWidth);
  const showAll = page.getByRole('button', { name: 'Show all columns' });
  await expect(showAll).toBeVisible();
  const stepWidth = await page.locator('.order-first-entry__step').first().evaluate(element => element.getBoundingClientRect().width);
  expect(stepWidth).toBeGreaterThanOrEqual(260);
  for (const target of [queue, showAll, summaryReset(page)]) {
    const box = await target.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  await showAll.click();
  const allColumns = await page.locator('.order-first-entry revo-grid').evaluate((grid: any) => grid.columns.map((column: any) => column.name));
  expect(allColumns).toEqual(['Order', 'Customer', 'Total (USD)', 'Status', 'City', 'Region', 'Order date']);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('scenario navigation, trial context, and the legacy performance address work', async ({ page }) => {
  await page.goto(entry);
  await expect(page.locator('body')).toHaveClass(/order-first-entry-workspace--filtering/);
  await expect(count(page)).toHaveText('120 of 120 orders');
  await page.getByRole('link', { name: 'Try free for 30 days', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Your selected demo' })).toContainText('Order Explorer · Pro Lite');
  await expect(page.getByRole('link', { name: 'View example code' })).toHaveAttribute('href', /pro-filtering\/src\/filtering.vue/);
  expect(await page.evaluate(() => {
    const context = document.querySelector('.trial-demo-context')!;
    const hero = document.querySelector('.trial-hero')!;
    return Boolean(context.compareDocumentPosition(hero) & Node.DOCUMENT_POSITION_FOLLOWING);
  })).toBe(true);
  await page.getByRole('link', { name: 'Back to Order Explorer' }).click();
  await expect(count(page)).toHaveText('120 of 120 orders');

  const cases = [
    ['Editing', 'project-tracker', 'Pro Lite'],
    ['Planning', 'planning', 'Pro Advanced'],
    ['Performance', 'grid-at-scale', 'Core'],
    ['Filtering', 'filtering', 'Pro Lite'],
  ];
  for (const [label, id, plan] of cases) {
    await page.getByRole('navigation', { name: 'Demo scenarios' }).getByRole('link', { name: label, exact: true }).click();
    await expect(page.locator('.demo-page-layout')).toHaveAttribute('data-demo-id', id);
    await expect(page.getByRole('navigation', { name: 'Demo scenarios' }).getByRole('link', { name: label, exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('.demo-page-plan')).toHaveText(plan);
    await expect(page.locator('revo-grid').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('link', { name: 'Try free for 30 days', exact: true })).toHaveAttribute('href', new RegExp(`demo_id=${id}`));
  }
  await page.goto('/demo/?scenario=performance');
  await expect(page.locator('.demo-page-layout')).toHaveAttribute('data-demo-id', 'grid-at-scale');
  await expect(page.getByRole('navigation', { name: 'Demo scenarios' })).toHaveCount(0);
  await expect(page.locator('body')).not.toHaveClass(/order-first-entry-workspace/);
  await page.goto('/demo/filtering');
  await expect(page.getByRole('button', { name: 'High-value Europe', exact: true })).toBeVisible();
  await expect(page.locator('.order-first-entry')).toHaveCount(0);
});

test('selected actions keep readable contrast across interaction states and themes', async ({ page }) => {
  await page.goto(entry);
  const queue = page.getByRole('button', { name: 'Review queue', exact: true });
  await queue.click();
  await expect(count(page)).toHaveText('24 of 120 orders');
  for (const dark of [false, true]) {
    await page.evaluate(value => {
      document.documentElement.classList.toggle('dark', value);
      document.documentElement.setAttribute('data-theme', value ? 'dark' : 'light');
    }, dark);
    await queue.hover();
    await queue.focus();
    await page.waitForTimeout(200);
    const colors = await queue.evaluate(element => {
      const style = getComputedStyle(element);
      return { foreground: style.color, background: style.backgroundColor };
    });
    expect(
      contrastRatio(colors.foreground, colors.background),
      `selected queue contrast (${dark ? 'dark' : 'light'}): ${JSON.stringify(colors)}`,
    ).toBeGreaterThanOrEqual(4.5);
    await expect(queue).toHaveAttribute('aria-pressed', 'true');
  }
});

test('rapid search and amount refinement confirm both actions after applying', async ({ page }) => {
  await page.goto(entry);
  await expect(page.locator('.order-first-entry revo-grid')).toContainText('ORD-104001');
  await page.getByRole('button', { name: 'Review queue', exact: true }).click();
  await expect(progress(page)).toHaveText('1 of 3 complete');
  await page.getByRole('searchbox').fill('Northstar');
  await page.getByRole('button', { name: 'Total ≥ $1,000', exact: true }).click();
  await expect(count(page)).toHaveText('2 of 120 orders');
  await expect(progress(page)).toHaveText('3 of 3 complete');
});
