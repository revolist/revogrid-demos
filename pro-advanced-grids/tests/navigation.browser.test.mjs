import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';
import { preview } from 'vite';
const { chromium } = createRequire(import.meta.url)('playwright');
let server, browser, url;
before(async () => {
  server = await preview({ configFile: false, mode: 'ts', build: { outDir: process.env.DEMO_REUSE_TEST_OUT_DIR ?? 'dist/browser-test' }, preview: { host: '127.0.0.1', port: 0, strictPort: false } });
  url = server.resolvedUrls.local[0];
  browser = await chromium.launch({ headless: true });
});
after(async () => {
  await browser?.close();
  if (server) await new Promise((resolve, reject) => server.httpServer.close(error => error ? reject(error) : resolve()));
});
test('all twelve examples share navigation and forecast mounts and cleans up', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${url}#category-forecast`);
    await page.getByText('Trail Footwear', { exact: true }).waitFor();
    const nav = page.getByRole('navigation', { name: 'Advanced RevoGrid examples' });
    assert.equal(await nav.getByRole('link').count(), 12);
    await nav.getByRole('link', { name: 'Service Reliability Dashboard' }).click();
    await page.getByRole('button', { name: 'Open Order journal durability' }).waitFor();
    await nav.getByRole('link', { name: 'Supplier Quality Dashboard' }).click();
    await page.getByRole('button', { name: 'Open Aster Circuit Works' }).waitFor();
    await nav.getByRole('link', { name: 'Venue Changeover Schedule' }).click();
    await page.getByRole('button', { name: 'Open Lantern Festival Setup' }).waitFor();
    assert.equal(await nav.getByRole('link', { name: 'Venue Changeover Schedule' }).getAttribute('aria-current'), 'page');
    await nav.getByRole('link', { name: 'Retail Demand Forecast' }).click();
    await page.getByText('Trail Footwear', { exact: true }).waitFor();
    assert.equal(await nav.getByRole('link', { name: 'Retail Demand Forecast' }).getAttribute('aria-current'), 'page');
    await nav.getByRole('link', { name: 'Marketing Campaign Analytics' }).click();
    await page.getByRole('button', { name: 'Open Community Plan Member Event' }).waitFor();
    assert.equal(await page.locator('.forecast').count(), 0);
    assert.equal(await page.locator('.workbench-grid').count(), 1);
    assert.equal(await page.locator('.forecast-grid').count(), 0);
    await nav.getByRole('link', { name: 'Retail Demand Forecast' }).click();
    await page.getByText('Trail Footwear', { exact: true }).waitFor();
    assert.equal(await page.locator('.forecast-grid').count(), 1);
    assert.equal(await page.locator('.workbench-grid').count(), 0);
    assert.equal(await page.locator('.workbench').count(), 0);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});


test('trial sparklines render unpinned cells in each trend view', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  await page.addInitScript(() => {
    const error = console.error.bind(console);
    Object.defineProperty(console, 'error', { get: () => error, set() {}, configurable: false });
  });
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  try {
    for (const id of ['campaign-performance', 'product-kpis', 'supplier-quality']) {
      await page.goto(`${url}#${id}`);
      await page.locator('.rgCol .rgCell').first().waitFor();
      await page.locator('.rgCol .rv-comparison-sparkline').first().waitFor();
    }
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('brand delivery calendar stays inside the editor and saves the selected day', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(`${url}#brand-scorecard`);
    await page.getByRole('button', { name: 'Add Brand' }).click();
    const dialog = page.getByRole('dialog').first();
    await dialog.getByLabel('Brand name').fill('Example Outdoor');
    await dialog.getByRole('button', { name: 'Choose First Delivery' }).click();
    const popup = page.getByRole('dialog', { name: 'Choose First Delivery' });
    const day = popup.locator('[data-calendar-date]:not([disabled])').first();
    const selected = await day.getAttribute('data-calendar-date');
    await day.click();
    await dialog.getByRole('button', { name: 'Create Brand' }).click();
    await dialog.getByRole('button', { name: 'Edit' }).click();
    assert.equal(await dialog.getByLabel('First Delivery', { exact: true }).inputValue(), selected);
  } finally { await page.close(); }
});

test('all advanced demo views use shared dropdowns instead of native selects', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    for (const id of ['campaign-performance', 'product-kpis', 'service-visits', 'job-schedule', 'supplier-quality', 'reliability-index', 'category-forecast', 'scale-up-index', 'sales-to-target', 'brand-scorecard', 'project-budget', 'patient-cohorts']) {
      await page.goto(`${url}#${id}`);
      await page.locator('revo-grid').first().waitFor();
      assert.equal(await page.locator('select').count(), 0, `${id} contains a native select`);
    }
  } finally { await page.close(); }
});

test('shared demo palette is available in every advanced view', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    for (const id of ['campaign-performance', 'product-kpis', 'service-visits', 'job-schedule', 'supplier-quality', 'reliability-index', 'category-forecast', 'scale-up-index', 'sales-to-target', 'brand-scorecard', 'project-budget', 'patient-cohorts']) {
      await page.goto(`${url}#${id}`);
      const view = page.locator('.workbench, .forecast').first();
      await view.waitFor();
      const palette = await view.evaluate(element => {
        const style = getComputedStyle(element);
        return [style.getPropertyValue('--demo-palette-hex-171717').trim(), style.getPropertyValue('--demo-color-teal').trim()];
      });
      assert.deepEqual(palette, ['#171717', '#00a58f'], id);
      if (id === 'scale-up-index') {
        const yes = page.locator('.screen-yes').first();
        const no = page.locator('.screen-no').first();
        await yes.waitFor();
        assert.equal(await yes.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(0, 165, 143)');
        assert.equal(await no.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(237, 61, 105)');
      }
      if (id === 'category-forecast' && process.env.PALETTE_SCREENSHOT_PATH) {
        await page.getByText('Coastal Walking Shoes', { exact: true }).waitFor();
        await page.screenshot({ path: process.env.PALETTE_SCREENSHOT_PATH, animations: 'disabled' });
      }
      if (id === 'scale-up-index' && process.env.PALETTE_SCALE_SCREENSHOT_PATH) {
        await page.getByText('North Holland', { exact: true }).first().waitFor();
        await page.screenshot({ path: process.env.PALETTE_SCALE_SCREENSHOT_PATH, animations: 'disabled' });
      }
    }
  } finally { await page.close(); }
});

test('forecast bullet markers stay circular and centered at different track heights', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    await page.goto(`${url}#category-forecast`);
    await page.getByText('Coastal Walking Shoes', { exact: true }).waitFor();
    const chart = page.locator('.forecast-grid .rv-bullet-chart').first();
    const measure = () => chart.evaluate(element => {
      const track = element.getBoundingClientRect();
      const marker = element.querySelector('.rv-bullet-chart__point').getBoundingClientRect();
      return { width: marker.width, height: marker.height, offset: marker.top + marker.height / 2 - (track.top + track.height / 2) };
    });
    for (const height of [10, 16]) {
      await chart.evaluate((element, value) => element.style.setProperty('--rv-bullet-height', `${value}px`), height);
      const marker = await measure();
      assert.ok(Math.abs(marker.width - marker.height) < 0.1, JSON.stringify(marker));
      assert.ok(Math.abs(marker.offset) < 0.1, JSON.stringify(marker));
    }
    await chart.evaluate(element => element.style.removeProperty('--rv-bullet-height'));
    if (process.env.FORECAST_SCREENSHOT_PATH) await page.screenshot({ path: process.env.FORECAST_SCREENSHOT_PATH, animations: 'disabled' });
  } finally { await page.close(); }
});

test('brand icons and section colors remain consistent across the scorecard', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    await page.goto(`${url}#brand-scorecard`);
    await page.locator('.brand-heading .brand-symbol').first().waitFor();
    const section = page.locator('.brand-section.sales');
    await section.locator('.brand-leaders > span').first().waitFor();
    const leader = section.locator('.brand-leaders > span').first();
    const name = await leader.locator('span').last().innerText();
    const header = page.locator('.brand-heading').filter({ has: page.getByRole('button', { name: `Open ${name}`, exact: true }) });
    const headerPath = await header.locator('svg path').getAttribute('d');
    assert.equal(await leader.locator('svg path').getAttribute('d'), headerPath);
    assert.equal(await leader.locator('svg').getAttribute('viewBox'), await header.locator('svg').getAttribute('viewBox'));
    const colors = await page.locator('.brand-section').evaluateAll(elements => elements.map(element => getComputedStyle(element).getPropertyValue('--brand-section-color').trim()));
    assert.equal(new Set(colors).size, 4);
    assert.equal(colors[0], '#a76106');
    if (process.env.BRAND_SCREENSHOT_PATH) await page.screenshot({ path: process.env.BRAND_SCREENSHOT_PATH, animations: 'disabled' });
    await header.getByRole('button', { name: `Open ${name}`, exact: true }).click();
    const detail = page.locator('.brand-profile__mark');
    await detail.waitFor();
    assert.equal(await detail.locator('path').getAttribute('d'), headerPath);
  } finally { await page.close(); }
});

test('demo headers open the shared column menu', async () => {
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  try {
    page.setDefaultTimeout(10000);
    const examples = [
      ['campaign-performance', 'Spend'], ['product-kpis', 'Product'],
      ['service-visits', 'Site'], ['project-budget', 'Budget'],
      ['patient-cohorts', 'Intake Signal'], ['sales-to-target', 'Actual'],
      ['scale-up-index', 'Province'], ['brand-scorecard', 'Portfolio'],
      ['job-schedule', 'Job'], ['category-forecast', 'Line'],
      ['supplier-quality', 'Supplier'], ['reliability-index', 'Owner'],
    ];
    for (const [id, label] of examples) {
      await page.goto(`${url}#${id}`);
      const header = page.locator('.rgHeaderCell').filter({ hasText: label }).first();
      await header.waitFor();
      const trigger = header.locator('[data-column-menu-trigger]');
      if (await trigger.count()) await trigger.click();
      else await header.click();
      const menu = page.locator('.rv-context-menu:visible');
      await menu.getByRole('menuitem', { name: 'Copy options' }).waitFor().catch(error => { throw new Error(`${id}: ${error.message}`); });
      for (const name of ['Grouping', 'Pin', 'Move', 'Size']) {
        assert.equal(await menu.getByRole('menuitem', { name, exact: true }).count(), 0, `${id}: ${name}`);
      }
      if (id === 'product-kpis' && process.env.DEMO_SCREENSHOT_PATH) await page.screenshot({ path: process.env.DEMO_SCREENSHOT_PATH, animations: 'disabled' });
      await page.keyboard.press('Escape');
    }
  } finally { await page.close(); }
});

test('cohort column menu sorts groups without mixing their rows', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(`${url}#patient-cohorts`);
    const trigger = page.getByRole('button', { name: 'Answers column menu' });
    const groups = () => page.locator('revo-grid').evaluate(grid => grid.source.filter(row => row.group).map(row => row.answers));
    await trigger.click();
    await page.locator('.rv-context-menu:visible').getByRole('menuitem', { name: 'Sort ascending', exact: true }).click();
    const ascending = await groups();
    assert.deepEqual(ascending, [...ascending].sort((a, b) => a - b));
    await trigger.focus();
    await page.keyboard.press('Enter');
    await page.locator('.rv-context-menu:visible').getByRole('menuitem', { name: 'Sort descending', exact: true }).click();
    assert.deepEqual(await groups(), [...ascending].reverse());
  } finally { await page.close(); }
});

test('group controls consistently show the icon for their current state', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    const examples = [
      ['scale-up-index', 'Expand South Holland', 'Collapse South Holland', false],
      ['project-budget', 'Collapse Design', 'Expand Design', true],
      ['patient-cohorts', 'Collapse Clinical Fit', 'Expand Clinical Fit', true],
      ['sales-to-target', 'Collapse Americas', 'Expand Americas', true],
      ['brand-scorecard', 'Collapse Sales', 'Expand Sales', true],
      ['category-forecast', 'Collapse department Footwear', 'Expand department Footwear', true],
    ];
    for (const [id, initial, after, expanded] of examples) {
      await page.goto(`${url}#${id}`);
      if (id === 'scale-up-index') {
        // The grid virtualizes rows, so filter to the province under test.
        await page.locator('.rv-search-action-bar').getByLabel('Filter', { exact: true }).click();
        await page.locator('.workbench-filter-panel').getByRole('combobox', { name: 'Province' }).click();
        await page.getByRole('option', { name: 'South Holland', exact: true }).click();
        await page.keyboard.press('Escape');
      }
      const control = page.getByRole('button', { name: initial, exact: true }).first();
      await control.waitFor();
      assert.equal(await control.locator(`.rv-expand-icon.is-${expanded ? 'collapse' : 'expand'}`).count(), 1, id);
      await control.click();
      const next = page.getByRole('button', { name: after, exact: true }).first();
      await next.waitFor();
      assert.equal(await next.locator(`.rv-expand-icon.is-${expanded ? 'expand' : 'collapse'}`).count(), 1, id);
    }
  } finally { await page.close(); }
});

test('embedded forecast uses the shared summary controls', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(`${url}#category-forecast`);
    await page.locator('.rv-dotted-comparison').first().waitFor();
    assert.equal(await page.locator('.rv-metric-tile--summary').count(), 3);
    assert.equal(await page.locator('.rv-dotted-comparison__column').count(), 12);
    assert.ok(await page.locator('.rv-stacked-dot-plot__point').count() > 0);
    await page.getByRole('button', { name: 'Dec 2025, every line in view' }).hover();
    await page.getByRole('tooltip').getByText('$7,956,200').waitFor();
  } finally { await page.close(); }
});

test('row action cells share the same accessible Font Awesome icon', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    for (const id of ['campaign-performance', 'product-kpis', 'service-visits', 'category-forecast', 'job-schedule', 'supplier-quality', 'scale-up-index', 'sales-to-target', 'project-budget']) {
      await page.goto(`${url}#${id}`);
      const grid = page.locator('revo-grid').first();
      await grid.waitFor();
      await page.waitForFunction(() => document.querySelector('revo-grid')?.columns?.some(column => column.prop === 'actions'));
      assert.equal(await grid.evaluate(element => element.columns.find(column => column.prop === 'actions').columnChooser), false, `${id} action column should be excluded from the chooser`);
      const selection = await grid.evaluate(element => element.columns.find(column => column.prop === 'selected'));
      if (selection) assert.equal(selection.columnChooser, false, `${id} selection column should be excluded from the chooser`);
      assert.equal(await grid.evaluate(element => element.columns.find(column => column.prop === 'actions').size), 45, `${id} should use the shared action column width`);
      await grid.evaluate(element => element.scrollToColumnProp('actions'));
      const action = page.locator('button.rv-cell-action').filter({ has: page.locator('.rv-cell-action__icon') }).first();
      await action.waitFor();
      assert.ok(await action.getAttribute('aria-label'), `${id} needs an accessible action label`);
      assert.equal(await action.locator('.rv-cell-action__icon[aria-hidden="true"] svg path').count(), 1, `${id} should use the shared SVG`);
      const cellWidth = await action.evaluate(element => element.closest('.rgCell').getBoundingClientRect().width);
      assert.ok(Math.abs(cellWidth - 45) <= 1, `${id} action cell should render at 45 px (got ${cellWidth})`);
      const size = await action.locator('svg').boundingBox();
      assert.equal(size.width, 14);
      assert.equal(size.height, 14);
    }
  } finally { await page.close(); }
});

test('product column chooser omits utility columns and uses the standard icon', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(`${url}#product-kpis`);
    const button = page.getByRole('button', { name: 'Columns', exact: true });
    await button.waitFor();
    assert.equal(await button.getAttribute('data-icon'), 'columns');
    assert.match(await button.evaluate(element => element.style.getPropertyValue('--glyph')), /data:image\/svg\+xml/);
    await button.click();
    const dialog = page.locator('.rv-column-dialog:visible');
    await dialog.waitFor();
    assert.equal(await dialog.getByText('selected', { exact: true }).count(), 0);
    assert.equal(await dialog.getByText('actions', { exact: true }).count(), 0);
    await dialog.getByText('Product', { exact: true }).waitFor();
    const selectAll = dialog.getByRole('checkbox', { name: 'Select all columns' });
    await selectAll.uncheck();
    await page.waitForFunction(() => document.querySelector('revo-grid')?.hideColumns?.includes('label'));
    const hidden = await page.locator('revo-grid').first().evaluate(element => element.hideColumns);
    assert.equal(hidden.includes('selected'), false);
    assert.equal(hidden.includes('actions'), false);
    await selectAll.check();
  } finally { await page.close(); }
});

test('campaign filter suggestions keep their styling after switching demos', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(`${url}#campaign-performance`);
    const checkSuggestions = async () => {
      await page.getByRole('button', { name: 'Filter', exact: true }).click();
      await page.getByRole('button', { name: 'Add condition' }).click();
      await page.getByRole('combobox', { name: 'Status filter operator' }).click();
      await page.getByRole('option', { name: 'is none of', exact: true }).click();
      await page.getByRole('combobox', { name: 'Add Status filter value' }).fill('a');
      const option = page.getByRole('listbox', { name: /Status/ }).getByRole('option', { name: 'Learning', exact: true });
      await option.waitFor();
      return option.evaluate(node => {
        const style = getComputedStyle(node);
        return { justify: style.justifyContent, textAlign: style.textAlign, border: style.borderTopWidth, padding: style.padding, radius: style.borderRadius, font: style.fontSize };
      });
    };
    const initial = await checkSuggestions();
    assert.equal(initial.justify, 'flex-start');
    assert.equal(initial.border, '0px');
    for (const id of ['product-kpis', 'service-visits', 'category-forecast', 'job-schedule', 'supplier-quality', 'reliability-index', 'scale-up-index', 'sales-to-target', 'brand-scorecard', 'project-budget', 'patient-cohorts']) {
      await page.evaluate(id => { location.hash = id; }, id);
      await page.waitForFunction(id => document.querySelector('.workbench-nav a[aria-current]')?.getAttribute('href') === `#${id}`, id);
      // Another demo can load the shared button stylesheet after the filter styles.
      if (id === 'category-forecast') {
        await page.addStyleTag({ content: '.rv-btn { display: inline-flex; justify-content: center; border: 1px solid; padding: 9px 16px; border-radius: 8px; font-weight: 600; }' });
        const hostButton = await page.evaluate(() => {
          const button = document.createElement('button');
          button.className = 'rv-btn';
          document.body.append(button);
          const style = getComputedStyle(button);
          const result = { border: style.borderTopWidth, justify: style.justifyContent };
          button.remove();
          return result;
        });
        assert.deepEqual(hostButton, { border: '1px', justify: 'center' }, 'unrelated shared buttons keep their styling');
      }
      await page.evaluate(() => { location.hash = 'campaign-performance'; });
      await page.waitForFunction(() => document.querySelector('.workbench-nav a[aria-current]')?.getAttribute('href') === '#campaign-performance');
      assert.deepEqual(await checkSuggestions(), initial, `filter suggestions changed after visiting ${id}`);
    }
    await page.getByRole('listbox', { name: /Status/ }).getByRole('option', { name: 'Learning', exact: true }).click();
    await page.getByRole('button', { name: 'Remove Learning' }).waitFor();
  } finally { await page.close(); }
});


test('action notifications are cleared when navigating between demos', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(`${url}#service-visits`);
    await page.getByRole('button', { name: /Book all .*unbooked visits/ }).click();
    await page.locator('.rv-toast').getByText(/visits booked/).waitFor();
    await page.getByRole('navigation', { name: 'Advanced RevoGrid examples' }).getByRole('link', { name: 'Marketing Campaign Analytics' }).click();
    await page.getByRole('button', { name: 'Open Community Plan Member Event' }).waitFor();
    assert.equal(await page.locator('.rv-toast').count(), 0);
  } finally { await page.close(); }
});


test('demo text emphasis uses medium weight across all examples', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  try {
    for (const id of ['campaign-performance', 'product-kpis', 'service-visits', 'category-forecast', 'job-schedule', 'supplier-quality', 'reliability-index', 'scale-up-index', 'sales-to-target', 'brand-scorecard', 'project-budget', 'patient-cohorts']) {
      await page.goto(`${url}#${id}`);
      await page.locator('.rgRow').first().waitFor();
      const heavy = await page.evaluate(() => Array.from(document.querySelectorAll('.workbench *, .forecast *'))
        .filter(node => node.children.length === 0 && node.textContent?.trim() && node.getBoundingClientRect().width && Number(getComputedStyle(node).fontWeight) > 500)
        .map(node => `${node.tagName}.${node.className}: ${getComputedStyle(node).fontWeight} ${node.textContent.trim().slice(0, 30)}`));
      assert.deepEqual(heavy, [], `${id} has text heavier than medium`);
    }
  } finally { await page.close(); }
});


test('all demos use the shared search and action bar', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    for (const id of ['campaign-performance', 'product-kpis', 'service-visits', 'category-forecast', 'job-schedule', 'supplier-quality', 'reliability-index', 'scale-up-index', 'sales-to-target', 'brand-scorecard', 'project-budget', 'patient-cohorts']) {
      await page.goto(`${url}#${id}`);
      const bar = page.locator('.rv-search-action-bar');
      await bar.waitFor();
      await bar.locator('.rv-search-input-icon svg').waitFor();
      assert.equal(await bar.getByRole('searchbox').count(), 1, `${id} needs a search field`);
      const search = await bar.getByRole('searchbox').boundingBox();
      assert.ok(search.width >= 100, `${id} search should not be clipped`);
    }
  } finally { await page.close(); }
});

test('service visit toolbar keeps search usable on mobile', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(`${url}#service-visits`);
    const bar = page.locator('.rv-search-action-bar');
    const input = bar.getByRole('searchbox');
    await input.waitFor();
    const box = await input.boundingBox();
    assert.ok(box.width >= 100, `mobile search width was ${box.width}`);
    await input.fill('Orchard');
    await page.getByRole('button', { name: 'Open Orchard Hearth' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Open Alder Table' }).count(), 0);
  } finally { await page.close(); }
});

test('search focus ring stays outside and supplier actions precede the dropdown', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(`${url}#supplier-quality`);
    const bar = page.locator('.rv-search-action-bar');
    const search = bar.getByRole('searchbox');
    await search.focus();
    const presentation = await search.evaluate(input => {
      const root = input.closest('.rv-search-action-bar');
      const icon = root.querySelector('.rv-search-input-icon');
      return { rootOutline: getComputedStyle(root).outlineStyle, offset: getComputedStyle(root).outlineOffset, inputOutline: getComputedStyle(input).outlineStyle, iconZ: getComputedStyle(icon).zIndex };
    });
    assert.equal(presentation.rootOutline, 'solid');
    assert.equal(presentation.offset, '2px');
    assert.equal(presentation.inputOutline, 'none');
    assert.equal(presentation.iconZ, '3');
    await bar.locator('.rv-search-input-icon svg').waitFor();
    const order = await bar.locator('.rv-search-action-bar__actions').evaluate(node => [...node.children].map(item => item.getAttribute('aria-label') || item.querySelector('[role=combobox]')?.getAttribute('aria-label')));
    assert.deepEqual(order.slice(0, 3), ['Columns', 'Export XLSX', 'Division']);
    await search.fill('Cobalt');
    await page.getByRole('button', { name: 'Open Aster Circuit Works' }).waitFor();
  } finally { await page.close(); }
});

test('toolbar filters and columns popups close when switching actions', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(`${url}#scale-up-index`);
    const bar = page.locator('.rv-search-action-bar');
    const filter = bar.getByLabel('Filter', { exact: true });
    const columns = bar.getByRole('button', { name: 'Columns' });
    const panel = page.locator('.workbench-filter-panel');
    await filter.click();
    await panel.waitFor({ state: 'visible' });
    await panel.getByRole('combobox', { name: 'Province' }).click();
    await page.getByRole('option', { name: 'Drenthe', exact: true }).click();
    assert.equal(await panel.isVisible(), true);
    await columns.focus();
    await page.keyboard.press('Enter');
    await page.getByPlaceholder('Search...').last().waitFor({ state: 'visible' });
    assert.equal(await panel.isVisible(), false);
    await filter.focus();
    await page.keyboard.press('Enter');
    await panel.waitFor({ state: 'visible' });
    assert.equal(await page.getByPlaceholder('Search...').last().isVisible(), false);
    await page.keyboard.press('Escape');
    await panel.waitFor({ state: 'hidden' });
    assert.equal(await filter.evaluate(el => document.activeElement === el), true);
  } finally { await page.close(); }
});


test('reliability table uses compact horizontal separators', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(`${url}#reliability-index`);
    const grid = page.locator('.workbench-grid');
    await page.getByRole('button', { name: 'Open Order journal durability' }).waitFor();
    assert.equal(await grid.getAttribute('theme'), 'compact');
    for (const selector of ['.rgCell', '.rgHeaderCell']) {
      const style = await grid.locator(selector).first().evaluate(el => ({ shadow: getComputedStyle(el).boxShadow, left: getComputedStyle(el).borderLeftWidth, right: getComputedStyle(el).borderRightWidth }));
      assert.match(style.shadow, /0px -1px/);
      assert.doesNotMatch(style.shadow, /-1px 0px 0px 0px inset/);
      assert.equal(style.left, '0px');
      assert.equal(style.right, '0px');
    }
  } finally { await page.close(); }
});

test('demo creation actions use the shared dark plus button', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    for (const [id, label] of [
      ['campaign-performance', 'New Campaign'], ['product-kpis', 'Add Product'],
      ['service-visits', 'Add Kitchen'], ['category-forecast', 'Add Line'],
      ['job-schedule', 'Add Job'], ['supplier-quality', 'Add Supplier'],
      ['reliability-index', 'New SLO'], ['scale-up-index', 'Add Company'],
      ['sales-to-target', 'Add Store'], ['brand-scorecard', 'Add Brand'],
      ['project-budget', 'Add Line'],
    ]) {
      await page.goto(`${url}#${id}`);
      const button = page.getByRole('button', { name: label, exact: true });
      await button.waitFor();
      assert.equal(await button.textContent(), '', `${id} has visible text`);
      assert.equal(await button.locator('svg').count(), 1, `${id} lacks its plus icon`);
      await button.evaluate(el => el.getAnimations().forEach(animation => animation.finish()));
      assert.equal(await button.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(23, 23, 23)', `${id} is not dark`);
    }
    const button = page.getByRole('button', { name: 'Add Line', exact: true });
    await button.click();
    await page.getByRole('dialog').getByText('Add Line', { exact: true }).first().waitFor();
  } finally { await page.close(); }
});

test('brand scorecard keeps chart and rank fills flush and section toggles on the rail', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    await page.goto(`${url}#brand-scorecard`);
    const toggle = page.getByRole('button', { name: 'Collapse Sales' });
    await toggle.waitFor();
    const placement = await toggle.evaluate(button => {
      const rail = button.closest('.brand-section').getBoundingClientRect();
      const icon = button.getBoundingClientRect();
      return { left: icon.left - rail.left, right: icon.right - rail.left };
    });
    assert.ok(placement.left >= -1 && placement.right <= 25, JSON.stringify(placement));
    const sort = page.getByRole('button', { name: /Rank brands by/ });
    assert.equal(await sort.locator('svg').count(), 1);
    for (const selector of ['.brand-range', '.brand-section', '.brand-overall-rank']) {
      const gaps = await page.locator(selector).evaluateAll(nodes => nodes.map(node => {
        const bounds = node.getBoundingClientRect(), cell = node.closest('.rgCell').getBoundingClientRect();
        return Math.max(Math.abs(bounds.left - cell.left), Math.abs(bounds.right - cell.right));
      }));
      assert.ok(gaps.length && gaps.every(gap => gap < 1), `${selector}: ${gaps}`);
    }
    await toggle.click();
    await page.getByRole('button', { name: 'Expand Sales' }).waitFor();
    await page.getByRole('button', { name: 'Expand Sales' }).click();
    await page.getByRole('button', { name: 'Collapse Sales' }).waitFor();
    const border = await page.locator('.workbench--brand-scorecard .demo-shell__body').evaluate(node => getComputedStyle(node).borderLeftWidth);
    assert.equal(border, '1px');
  } finally { await page.close(); }
});

test('colored visual cells fill the grid in sales targets and project budget', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    for (const demo of ['sales-to-target', 'project-budget']) {
      await page.goto(`${url}#${demo}`);
      const cells = page.locator('.rgCell > .sales-tile');
      await cells.first().waitFor();
      const gaps = await cells.evaluateAll(nodes => nodes.map(node => {
        const fill = node.getBoundingClientRect(), cell = node.parentElement.getBoundingClientRect();
        return Math.max(Math.abs(fill.left - cell.left), Math.abs(fill.right - cell.right));
      }));
      assert.ok(gaps.length && gaps.every(gap => gap < 1), `${demo}: ${gaps}`);
    }
  } finally { await page.close(); }
});

test('stretched demo columns leave room for vertical scrollbars', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  try {
    for (const demo of ['job-schedule', 'supplier-quality', 'scale-up-index', 'campaign-performance', 'product-kpis', 'service-visits']) {
      await page.goto(`${url}#${demo}`);
      await page.locator('revo-grid .rgCell').first().waitFor();
      await page.waitForFunction(() => {
        const grid = document.querySelector('revo-grid');
        const horizontal = grid.querySelector('revogr-scroll-virtual.horizontal');
        return horizontal && horizontal.scrollWidth <= horizontal.clientWidth;
      });
      assert.equal(await page.locator('revo-grid').first().evaluate(grid => { const bar = grid.querySelector('revogr-scroll-virtual.horizontal'); return bar.scrollWidth <= bar.clientWidth; }), true, demo);
    }
  } finally { await page.close(); }
});

test('supplier and job action columns scroll with aligned headers and cells', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  try {
    for (const demo of ['supplier-quality', 'job-schedule']) {
      await page.setViewportSize({ width: 1600, height: 900 });
      await page.goto(`${url}#${demo}`);
      const grid = page.locator('revo-grid.workbench-grid').first();
      await grid.locator('.rgCell').first().waitFor();
      await page.waitForFunction(async () => {
        const grid = document.querySelector('revo-grid.workbench-grid');
        const column = (await grid.getColumns()).find(item => item.prop === (location.hash.includes('supplier') ? 'division' : 'label'));
        return column?.size > (location.hash.includes('supplier') ? 170 : 230);
      });
      assert.equal(await grid.evaluate(async el => (await el.getColumns()).find(column => column.prop === 'actions').pin ?? null), null);
      for (const width of [1600, 1100]) {
        await page.setViewportSize({ width, height: 900 });
        const offsets = await grid.evaluate(el => {
          const headers = new Map([...el.querySelectorAll('.rgHeaderCell[aria-colindex]')].map(header => [header.getAttribute('aria-colindex'), header.getBoundingClientRect()]));
          return [...el.querySelectorAll('.rgCell[aria-colindex]')].flatMap(cell => {
            const header = headers.get(cell.getAttribute('aria-colindex'));
            if (!header) return [];
            const bounds = cell.getBoundingClientRect();
            return [Math.max(Math.abs(header.left - bounds.left), Math.abs(header.right - bounds.right))];
          });
        });
        assert.ok(offsets.length && offsets.every(offset => offset < 1), `${demo} at ${width}px: ${JSON.stringify(offsets)}`);
      }
    }
  } finally { await page.close(); }
});


test('patient cohort stretches the signal column inside a single frame', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  try {
    await page.goto(`${url}#patient-cohorts`);
    const grid = page.locator('revo-grid.workbench-grid');
    await grid.locator('.rgCell').first().waitFor();
    await page.waitForFunction(async () => (await document.querySelector('revo-grid').getColumns()).find(column => column.prop === 'label').size > 292);
    const layout = await page.locator('.workbench--patient-cohorts').evaluate(root => {
      const rect = selector => root.querySelector(selector).getBoundingClientRect();
      const frame = rect('.demo-shell__body'), tabs = rect('.cohort-tab-bar'), toolbar = rect('.workbench-toolbar'), grid = rect('.workbench-grid');
      const strip = root.querySelector('.cohort-tabs');
      return { frame: [frame.left, frame.right], tabs: [tabs.left, tabs.right], toolbar: [toolbar.left, toolbar.right], grid: [grid.left, grid.right], overflow: strip.scrollHeight - strip.clientHeight };
    });
    for (const area of ['tabs', 'toolbar', 'grid']) for (let index = 0; index < 2; index++) assert.ok(Math.abs(layout[area][index] - layout.frame[index]) <= 1.1, JSON.stringify(layout));
    assert.ok(layout.overflow <= 1, JSON.stringify(layout));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(async () => (await document.querySelector('revo-grid').getColumns()).find(column => column.prop === 'label').size === 260);
  } finally { await page.close(); }
});

test('column header toggles its menu and switches to another header', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.goto(`${url}#campaign-performance`);
    const grid = page.locator('revo-grid.workbench-grid');
    const spend = grid.locator('.rgHeaderCell').filter({ hasText: 'Spend' }).first();
    const conversions = grid.locator('.rgHeaderCell').filter({ hasText: 'Conversions' }).first();
    const menu = page.locator('.rv-context-menu:visible');
    await spend.click();
    await menu.getByRole('menuitem', { name: 'Copy options' }).waitFor();
    await spend.click();
    await page.waitForTimeout(200);
    assert.equal(await menu.count(), 0);
    await spend.click();
    await menu.waitFor({ state: 'visible' });
    await conversions.click();
    await menu.waitFor({ state: 'visible' });
    await conversions.click();
    await page.waitForTimeout(200);
    assert.equal(await menu.count(), 0);
  } finally { await page.close(); }
});

test('demo grids have white surfaces and a header divider', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    for (const id of ['campaign-performance', 'product-kpis', 'service-visits', 'category-forecast', 'job-schedule', 'supplier-quality', 'reliability-index', 'scale-up-index', 'sales-to-target', 'brand-scorecard', 'project-budget', 'patient-cohorts']) {
      await page.goto(`${url}#${id}`);
      const grid = page.locator('.demo-shell revo-grid').first();
      await grid.locator('.rgHeaderCell').first().waitFor();
      assert.equal(await grid.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)', id);
      assert.equal(await grid.locator('.rgHeaderCell').first().evaluate(el => getComputedStyle(el).borderBottomWidth), '1px', id);
    }
    await page.goto(`${url}#service-visits`);
    const marked = page.locator('.visit-cell--due').first();
    await marked.waitFor();
    assert.notEqual(await marked.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)');
  } finally { await page.close(); }
});

test('reliability names and avatars have larger readable sizes', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.goto(`${url}#reliability-index`);
    const name = page.getByRole('button', { name: 'Open Order journal durability' });
    await name.waitFor();
    assert.equal(await name.evaluate(el => getComputedStyle(el).fontSize), '14px');
    const avatar = page.locator('revo-grid .rgCell img').first();
    const size = await avatar.boundingBox();
    assert.ok(size.width >= 24 && size.height >= 24, JSON.stringify(size));
  } finally { await page.close(); }
});

test('province controls expand groups without a duplicate company expand icon', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.goto(`${url}#scale-up-index`);
    const summaries = page.locator('.scale-company--summary');
    await summaries.first().waitFor();
    assert.equal(await summaries.locator('.rv-expand-icon, button').count(), 0);
    const toggle = page.getByRole('button', { name: /^Expand Drenthe/ }).first();
    await toggle.click();
    await page.getByRole('button', { name: /^Collapse Drenthe/ }).first().waitFor();
  } finally { await page.close(); }
});


test('demo navigation scrolls without a visible scrollbar', async () => {
  const page = await browser.newPage({ viewport: { width: 800, height: 800 } });
  try {
    await page.goto(url);
    const nav = page.getByRole('navigation', { name: 'Advanced RevoGrid examples' });
    const state = await nav.evaluate(element => {
      element.scrollLeft = element.scrollWidth;
      return { scrollLeft: element.scrollLeft, scrollbar: getComputedStyle(element).scrollbarWidth };
    });
    assert.ok(state.scrollLeft > 0);
    assert.equal(state.scrollbar, 'none');
  } finally { await page.close(); }
});

test('demos fit the viewport and let the grid fill the available height', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    for (const size of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(size);
    for (const id of ['campaign-performance', 'product-kpis', 'service-visits', 'category-forecast', 'job-schedule', 'supplier-quality', 'reliability-index', 'scale-up-index', 'sales-to-target', 'brand-scorecard', 'project-budget', 'patient-cohorts']) {
      await page.goto(`${url}#${id}`);
      const grid = page.locator('revo-grid').first();
      await grid.waitFor();
      const sizes = await page.evaluate(() => {
        const grid = document.querySelector('revo-grid').getBoundingClientRect();
        const nav = document.querySelector('.workbench-nav').getBoundingClientRect();
        return { documentHeight: document.documentElement.scrollHeight, height: innerHeight, gridHeight: grid.height, gridBottom: grid.bottom, navTop: nav.top, navBottom: nav.bottom };
      });
      assert.ok(sizes.documentHeight <= sizes.height + 1, `${id}: ${JSON.stringify(sizes)}`);
      assert.ok(sizes.gridHeight >= 150 && sizes.gridBottom <= sizes.navTop + 1 && sizes.navBottom <= sizes.height + 1, `${id}: ${JSON.stringify(sizes)}`);
    }
    }
  } finally { await page.close(); }
});

test('all sales country labels and store counts fit within their cells', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.goto(`${url}#sales-to-target`);
    const grid = page.locator('revo-grid.workbench-grid');
    await page.getByRole('button', { name: 'Open Denver Union Station' }).waitFor();
    const countries = await grid.evaluate(async element => [...new Set((await element.getVisibleSource()).filter(row => row.countryHead).map(row => row.country))]);
    assert.ok(countries.length > 1);
    const search = page.getByRole('searchbox');
    for (const name of countries) {
      await search.fill(name);
      const country = page.locator('.sales-country').filter({ hasText: name }).first();
      await country.waitFor();
      const bounds = await country.evaluate(element => {
        const cell = element.closest('.rgCell').getBoundingClientRect();
        return [...element.querySelectorAll('strong, small')].map(text => {
          const rect = text.getBoundingClientRect();
          return { top: rect.top, bottom: rect.bottom, cellTop: cell.top, cellBottom: cell.bottom, text: text.textContent };
        });
      });
      assert.equal(bounds.length, 2, name);
      for (const line of bounds) assert.ok(line.top >= line.cellTop && line.bottom <= line.cellBottom, `${name}: ${JSON.stringify(line)}`);
    }
  } finally { await page.close(); }
});

test('brand scorecard view uses the standard segmented switch', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.goto(`${url}#brand-scorecard`);
    const group = page.getByRole('group', { name: 'Scorecard view' });
    await group.waitFor();
    assert.ok(await group.evaluate(element => element.classList.contains('rv-segmented-switch')));
    await group.getByRole('button', { name: 'Styles' }).click();
    await page.waitForFunction(() => document.querySelector('[aria-label="Scorecard view"] [aria-pressed="true"]')?.textContent === 'Styles');
    await page.getByText('Profit per Style', { exact: true }).first().waitFor();
  } finally { await page.close(); }
});

test('sales status filter uses the shared segmented switch and can be cleared', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.goto(`${url}#sales-to-target`);
    const scale = page.getByRole('img', { name: 'Target attainment from behind to ahead' });
    await scale.waitFor();
    assert.equal(await scale.locator('.rv-segmented-bar__part').count(), 5);
    const control = page.getByRole('group', { name: 'Store attainment' });
    const behind = control.getByRole('button', { name: /^Behind/ });
    await behind.waitFor();
    assert.ok(await control.evaluate(el => el.classList.contains('rv-segmented-switch') && !el.classList.contains('workbench-segments')));
    assert.equal(await behind.evaluate(el => getComputedStyle(el, '::before').content), '""');
    await behind.click();
    await page.waitForFunction(() => document.querySelector('[data-status="Behind"]')?.getAttribute('aria-pressed') === 'true');
    await behind.click();
    await page.waitForFunction(() => document.querySelector('[data-status="Behind"]')?.getAttribute('aria-pressed') === 'false');
  } finally { await page.close(); }
});


test('selection-enabled demos do not show checkboxes on total rows', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    for (const demo of ['project-budget', 'job-schedule']) {
      await page.goto(`${url}#${demo}`);
      const grid = page.locator('revo-grid.workbench-grid').first();
      const total = grid.locator('revogr-data[type="rowPinEnd"]');
      await total.locator('.rgCell').first().waitFor();
      assert.equal(await total.getByRole('checkbox').count(), 0, demo);
      await grid.locator('revogr-data[type="rgRow"]').getByRole('checkbox').first().waitFor();
    }
  } finally { await page.close(); }
});
