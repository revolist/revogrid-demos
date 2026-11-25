import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { after, before, test } from "node:test";
import { preview } from "vite";
import { chooseSelect } from "./select-helper.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");
let server, browser, url;
before(async () => {
  server = await preview({
    mode: "ts",
    build: { outDir: process.env.SUPPLIER_TEST_OUT_DIR ?? "dist/browser-test" },
    preview: { host: "127.0.0.1", port: 0, strictPort: false },
  });
  url = `${server.resolvedUrls.local[0]}#supplier-quality`;
  browser = await chromium.launch({ headless: true });
});
after(async () => {
  await browser?.close();
  if (server)
    await new Promise((resolve, reject) =>
      server.httpServer.close((error) => (error ? reject(error) : resolve())),
    );
});
test("supplier quality groups lots and supports expansion, period and search", async () => {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  try {
    page.setDefaultTimeout(8000);
    await page.goto(url);
    await page
      .getByRole("button", { name: "Open Cobalt Sole Studio" })
      .waitFor();
    await page.screenshot({
      path: "/private/tmp/supplier-quality-desktop.png",
    });
    assert.ok((await page.locator(".rv-group-summary.quality-rail").count()) > 0);
    assert.ok((await page.locator(".rv-strip-plot").count()) > 0);
    assert.ok((await page.locator(".rv-comparison-sparkline").count()) > 0);
    await page
      .getByRole("button", { name: "Collapse Footwear Strategic" })
      .click();
    assert.equal(
      await page
        .getByRole("button", { name: "Open Cobalt Sole Studio" })
        .count(),
      0,
    );
    await page
      .getByRole("button", { name: "Expand Footwear Strategic" })
      .click();
    await page
      .getByRole("button", { name: "Open Cobalt Sole Studio" })
      .waitFor();
    await chooseSelect(
      page.getByRole("combobox", { name: "Period" }),
      "Last 3 months",
    );
    await page.getByRole("searchbox").fill("Cobalt");
    await page
      .getByRole("button", { name: "Open Cobalt Sole Studio" })
      .waitFor();
    await page.getByRole("button", { name: "Open Juniper Form Co." }).waitFor({ state: "detached" });
    assert.equal(
      await page.getByRole("button", { name: "Open Juniper Form Co." }).count(),
      0,
    );
  } finally {
    await page.close();
  }
});
test("supplier quality creates and removes suppliers with undo", async () => {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  try {
    page.setDefaultTimeout(8000);
    await page.goto(url);
    await page
      .getByRole("button", { name: "Add Supplier", exact: true })
      .click();
    await page.getByLabel("Name", { exact: true }).fill("Example Supplier");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Create Supplier" })
      .click();
    await page.getByRole("searchbox").fill("Example Supplier");
    await page.getByRole("button", { name: "Open Example Supplier" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete supplier" })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await page.getByRole("button", { name: "Undo" }).click();
    await page.getByRole("button", { name: "Open Example Supplier" }).waitFor();
  } finally {
    await page.close();
  }
});
test("supplier quality works on a narrow viewport", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    page.setDefaultTimeout(8000);
    await page.goto(url);
    await page
      .getByRole("button", { name: "Open Cobalt Sole Studio" })
      .waitFor();
    await page.screenshot({ path: "/private/tmp/supplier-quality-mobile.png" });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      390,
    );
    await page.getByRole("button", { name: "Add Supplier" }).click();
    await page
      .getByRole("dialog")
      .getByText("No lots until its first inspection.")
      .waitFor();
  } finally {
    await page.close();
  }
});

test('division and tier toggles use the shared state-aware icons', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    const division = page.getByRole('button', { name: 'Footwear, fold its tiers' });
    await division.waitFor();
    assert.equal(await division.locator('.rv-expand-icon.is-collapse').count(), 1);
    const tier = page.getByRole('button', { name: 'Collapse Footwear Strategic' });
    assert.equal(await tier.locator('.rv-expand-icon.is-collapse.rv-expand-icon--chevron').count(), 1);
    assert.equal(await tier.locator('path').getAttribute('d'), 'M2.5 4.5 6 8 9.5 4.5');
    const subgroupCell = page.locator('.rgRow.quality-subgroup .rgCell:not(:has(.quality-rail))').first();
    const supplierCell = page.getByRole('button', { name: 'Open Cobalt Sole Studio' }).locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " rgCell ")][1]');
    assert.notEqual(await subgroupCell.evaluate(el => getComputedStyle(el).backgroundColor), await supplierCell.evaluate(el => getComputedStyle(el).backgroundColor));
    await tier.click();
    const expandTier = page.getByRole('button', { name: 'Expand Footwear Strategic' });
    await expandTier.waitFor();
    assert.equal(await expandTier.locator('.rv-expand-icon.is-expand.rv-expand-icon--chevron').count(), 1);
    assert.equal(await expandTier.locator('path').getAttribute('d'), 'M4.5 2.5 8 6 4.5 9.5');
    await division.click();
    const expandDivision = page.getByRole('button', { name: 'Footwear, expand its tiers' });
    await expandDivision.waitFor();
    assert.equal(await expandDivision.locator('.rv-expand-icon.is-expand').count(), 1);
    await expandDivision.click();
    await division.waitFor();
  } finally { await page.close(); }
});

test('summary and score distributions follow the selected lot window and row level', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Cobalt Sole Studio' }).waitFor();
    const summary = page.getByRole('button', { name: /Lots 338, sort by it/ });
    await summary.waitFor();
    const grid = page.locator('revo-grid').first();
    const source = () => grid.evaluate(element => element.source);
    let rows = await source();
    const supplier = rows.find(row => row.label === 'Cobalt Sole Studio');
    assert.equal(supplier.reading.lots.length, 27);
    assert.equal(supplier.reading.rejected, 0);
    assert.ok(await page.locator('.quality-range__band').count() > 0);
    assert.ok(await page.locator('.rv-strip-plot__point').count() > 0);
    await chooseSelect(page.getByRole('combobox', { name: 'Period' }), 'Last 3 months');
    rows = await source();
    assert.equal(rows.find(row => row.label === 'Cobalt Sole Studio').reading.lots.length, 9);
    assert.notEqual(await page.locator('.quality-summary__item--lots strong').innerText(), '338');
    await chooseSelect(page.getByRole('combobox', { name: 'Rows' }), 'Divisions');
    rows = await source();
    assert.equal(rows.length, 4);
    assert.equal(rows.some(row => row.supplier), false);
    assert.equal(rows[0].reading.lots.length, 30);
  } finally { await page.close(); }
});

test('tier inline creation retains its selected division and tier', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    const add = page.getByRole('button', { name: 'Add Core supplier in Footwear' });
    await add.hover();
    assert.notEqual(await add.evaluate(element => getComputedStyle(element).backgroundColor), 'rgba(0, 0, 0, 0)');
    await add.focus();
    assert.equal(await add.evaluate(element => getComputedStyle(element).outlineStyle), 'solid');
    await add.click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Name', { exact: true }).fill('New Components');
    await dialog.getByRole('button', { name: 'Create Supplier' }).click();
    await page.getByRole('searchbox').fill('New Components');
    await page.getByRole('button', { name: 'Open New Components' }).waitFor();
    const supplier = await page.locator('revo-grid').first().evaluate(grid => grid.source.find(row => row.label === 'New Components').supplier);
    assert.equal(supplier.division, 'Footwear');
    assert.equal(supplier.tier, 'Core');
    assert.equal(supplier.lots.length, 0);
  } finally { await page.close(); }
});

test('disposition highlighting is exposed and changes the plotted marks', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Cobalt Sole Studio' }).waitFor();
    const rejected = page.getByRole('button', { name: 'Rejected', exact: true });
    await rejected.click();
    await page.getByRole('button', { name: 'Rejected', exact: true, pressed: true }).waitFor();
    assert.ok(await page.locator('.rv-strip-plot__point[style*="229, 229, 229"]').count() > 0);
    await rejected.click();
    await page.getByRole('button', { name: 'Rejected', exact: true, pressed: false }).waitFor();
  } finally { await page.close(); }
});


test('lot points and group summaries reveal their own data on hover and focus', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    page.setDefaultTimeout(8000);
    await page.goto(url);
    const points = page.locator('button.rv-strip-plot__point');
    await points.first().scrollIntoViewIfNeeded();
    await points.first().hover();
    const tip = page.getByRole('tooltip');
    await tip.getByText('Major Defects', { exact: true }).waitFor();
    assert.match(await tip.textContent(), /LOT-/);
    await page.screenshot({ path: '/private/tmp/supplier-quality-lot-tooltip.png' });
    const first = await tip.textContent();
    await points.nth(1).focus();
    await page.waitForFunction((text) => document.querySelector('[role="tooltip"]')?.textContent !== text, first);
    assert.match(await tip.textContent(), /Score|Against the Bar/);
    const summary = page.locator('.rv-timeline-container[data-tooltip]').first();
    await summary.scrollIntoViewIfNeeded();
    await summary.focus();
    await tip.getByText('Middle 80% of Lots', { exact: true }).waitFor();
    assert.match(await tip.textContent(), /Lowest Lot|Highest Lot/);
    assert.match(await tip.textContent(), /rejected.*rework/);
    await page.screenshot({ path: '/private/tmp/supplier-quality-summary-tooltip.png' });
    const spendPoint = page.locator('.quality-spend .rv-comparison-sparkline__target').first();
    await spendPoint.scrollIntoViewIfNeeded();
    await spendPoint.focus();
    await tip.getByText(/Period \d+:/).waitFor();
  } finally { await page.close(); }
});

test('recent lot tooltips show dates consistent with the selected reporting window', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    page.setDefaultTimeout(8000);
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Cobalt Sole Studio' }).waitFor();
    await chooseSelect(page.getByRole('combobox', { name: 'Period' }), 'Last 3 months');
    const firstLot = page.locator('button.rv-strip-plot__point').first();
    await firstLot.scrollIntoViewIfNeeded();
    await firstLot.focus();
    const tip = page.getByRole('tooltip');
    await tip.getByText('Major Defects', { exact: true }).waitFor();
    assert.match(await tip.textContent(), /Sep 1, 2026/);
  } finally { await page.close(); }
});

test('empty supplier results do not describe zero activity as new growth', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Cobalt Sole Studio' }).waitFor();
    await page.getByRole('searchbox').fill('no-such-supplier');
    await page.getByRole('button', { name: 'Spend $0, sort by it' }).waitFor();
    assert.equal(await page.locator('.quality-summary__item--spend small').textContent(), '—');
    assert.equal(await page.locator('.quality-summary__item--lots small').textContent(), '—');
  } finally { await page.close(); }
});

test('score column aligns ticks, points and ranges and highlights hovered lots', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Cobalt Sole Studio' }).waitFor();
    const grid = page.locator('revo-grid.workbench-grid').first();
    assert.equal(await grid.evaluate(el => el.columns.find(column => column.prop === 'plot')?.columnType), 'qualityScorePlot');
    const rail = page.locator('.quality-rail').first();
    assert.notEqual(await rail.evaluate(el => getComputedStyle(el).boxShadow), 'none');
    const scale = page.locator('.rv-scaled-plot-header__scale');
    const tick = scale.locator('[data-scale-value="7"]');
    const point = page.locator('button.rv-strip-plot__point').first();
    await tick.waitFor(); await point.waitFor();
    const headerBox = await page.locator('.rv-scaled-plot-header').boundingBox();
    const tickBox = await tick.boundingBox();
    assert.ok(tickBox.y >= headerBox.y && tickBox.y + tickBox.height <= headerBox.y + headerBox.height, 'scale labels must remain visible inside the header');
    const pointPercent = await point.evaluate(el => parseFloat(el.style.left));
    const geometry = async () => {
      const axis = await scale.boundingBox(); const dot = await point.boundingBox();
      return { expected: axis.x + pointPercent / 100 * axis.width, actual: dot.x + dot.width / 2 };
    };
    let position = await geometry();
    assert.ok(Math.abs(position.expected - position.actual) <= 2, JSON.stringify(position));
    const marker = page.locator('.rv-timeline-marker.quality-range__mean').first();
    const axisBox = await scale.boundingBox();
    const markerBox = await marker.boundingBox();
    const markerPercent = parseFloat(await marker.evaluate(el => el.style.left));
    assert.ok(Math.abs(markerBox.x - (axisBox.x + axisBox.width * markerPercent / 100)) <= 2);
    await point.hover();
    await page.getByRole('tooltip').waitFor();
    assert.ok(await point.evaluate(el => new DOMMatrix(getComputedStyle(el).transform).a > 1.1), 'hovered lot should grow');
    await grid.evaluate(el => { el.columns = el.columns.map(column => column.prop === 'plot' ? { ...column, size: 460 } : column); });
    await page.waitForFunction(() => document.querySelector('.rv-scaled-plot-header')?.getBoundingClientRect().width > 400);
    await page.setViewportSize({ width: 1280, height: 900 });
    position = await geometry();
    assert.ok(Math.abs(position.expected - position.actual) <= 2, JSON.stringify(position));
  } finally { await page.close(); }
});

test('spend cells show real period changes and varied monthly trends', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Cobalt Sole Studio' }).waitFor();
    const source = await page.locator('revo-grid.workbench-grid').first().evaluate(grid => grid.getVisibleSource());
    const first = source[0];
    const delta = first.reading.spend - first.previous.spend;
    const expected = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: Math.abs(delta) >= 1e6 ? 2 : 1 }).format(Math.abs(delta));
    const card = page.locator('.quality-spend').first();
    assert.equal((await card.locator('.rv-metric-stack__detail').textContent()).trim(), expected);
    assert.match(await card.locator('.rv-metric-stack__detail').getAttribute('aria-label'), /above|below/);
    assert.ok(new Set(first.reading.trend.map(value => Math.round(value))).size > 3);
    const tones = await page.locator('.rv-metric-stack__detail').evaluateAll(nodes => nodes.map(node => node.className));
    assert.ok(tones.some(value => value.includes('is-positive')));
    assert.ok(tones.some(value => value.includes('is-negative')));
    const endpoint = card.locator('.rv-comparison-sparkline__endpoint');
    const box = await endpoint.boundingBox();
    assert.ok(Math.abs(box.width - box.height) < 0.1 && box.width >= 7, `endpoint should be a circle: ${JSON.stringify(box)}`);
    assert.equal(await endpoint.evaluate(el => getComputedStyle(el).borderRadius), '50%');
    const alignment = await card.evaluate(el => {
      const svg = el.querySelector('.rv-comparison-sparkline svg');
      const line = svg.querySelector('polyline');
      const last = line.getAttribute('points').trim().split(/\s+/).at(-1).split(',').map(Number);
      const chart = svg.getBoundingClientRect();
      const dot = el.querySelector('.rv-comparison-sparkline__endpoint').getBoundingClientRect();
      return { dx: dot.x + dot.width / 2 - (chart.x + chart.width * last[0] / 100), dy: dot.y + dot.height / 2 - (chart.y + chart.height * last[1] / 20) };
    });
    assert.ok(Math.abs(alignment.dx) < 1 && Math.abs(alignment.dy) < 1, JSON.stringify(alignment));
  } finally { await page.close(); }
});


test('supplier summary has one frame and grid headers have separators', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    await page.goto(url);
    const summary = page.locator('.quality-summary');
    await summary.waitFor();
    const border = await summary.evaluate(el => ({ left: getComputedStyle(el).borderLeftWidth, right: getComputedStyle(el).borderRightWidth, bottom: getComputedStyle(el).borderBottomWidth, outer: getComputedStyle(el.parentElement).borderLeftWidth }));
    assert.deepEqual(border, { left: '0px', right: '0px', bottom: '1px', outer: '1px' });
    const header = page.locator('revogr-header .rgHeaderCell').first();
    assert.equal((await header.evaluate(el => getComputedStyle(el).boxShadow)).match(/inset/g)?.length, 2);
    const heading = page.locator('.rv-scaled-plot-header__heading');
    assert.equal(await heading.evaluate(el => getComputedStyle(el, '::after').height), '1px');
  } finally { await page.close(); }
});


test('division summaries show section separators and a group divider', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    await page.goto(url);
    const rail = page.locator('.quality-rail').first();
    await rail.waitFor();
    for (const selector of ['.quality-rail__heading', '.quality-rail__score']) {
      assert.equal(await rail.locator(selector).evaluate(el => getComputedStyle(el).borderBottomStyle), 'dashed');
    }
    assert.equal((await rail.evaluate(el => getComputedStyle(el).boxShadow)).match(/inset/g)?.length, 2);
    const heading = rail.locator('.quality-rail__heading');
    const title = await heading.locator('span').first().boundingBox();
    const icon = await heading.locator('.rv-expand-icon').boundingBox();
    assert.ok(icon.x + icon.width <= title.x, 'division control sits before the name');
  } finally { await page.close(); }
});

test('collapsed division summaries fit within one row and expand again', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Footwear, fold its tiers' }).click();
    const toggle = page.getByRole('button', { name: 'Footwear, expand its tiers' });
    await toggle.waitFor();
    const rail = toggle.locator('..');
    await rail.locator('.quality-rail__score').waitFor({ state: 'hidden' });
    const bounds = await rail.evaluate(node => {
      const heading = node.querySelector('button').getBoundingClientRect();
      const cell = node.closest('.rgCell').getBoundingClientRect();
      return { headingTop: heading.top, headingBottom: heading.bottom, top: cell.top, bottom: cell.bottom };
    });
    assert.ok(bounds.headingTop >= bounds.top && bounds.headingBottom <= bounds.bottom);
    await toggle.click();
    await page.getByRole('button', { name: 'Footwear, fold its tiers' }).waitFor();
    assert.equal(await page.locator('.quality-rail__score').first().isVisible(), true);
  } finally { await page.close(); }
});


test('division fills available width and places its toggle before the name', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  try {
    await page.goto(url);
    const toggle = page.getByRole('button', { name: 'Footwear, fold its tiers' });
    await toggle.waitFor();
    await page.waitForFunction(async () => [...document.querySelectorAll('revo-grid .rgHeaderCell')].find(cell => cell.textContent.trim().startsWith('Division'))?.getBoundingClientRect().width > 170);
    const positions = await toggle.evaluate(node => ({ icon: node.querySelector('svg').getBoundingClientRect().left, label: node.querySelector('span').getBoundingClientRect().left }));
    assert.ok(positions.icon < positions.label);
    const gap = await toggle.locator('..').evaluate(node => {
      const rail = node.getBoundingClientRect();
      const cell = node.closest('.rgCell').getBoundingClientRect();
      return Math.abs(cell.right - rail.right);
    });
    assert.ok(gap < 1, `division edge gap: ${gap}`);
    await toggle.click();
    const collapsed = page.getByRole('button', { name: 'Footwear, expand its tiers' });
    await collapsed.waitFor();
    assert.ok(await collapsed.evaluate(node => node.querySelector('svg').getBoundingClientRect().left < node.querySelector('span').getBoundingClientRect().left));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(async () => [...document.querySelectorAll('revo-grid .rgHeaderCell')].find(cell => cell.textContent.trim().startsWith('Division'))?.getBoundingClientRect().width === 170);
  } finally { await page.close(); }
});

test('supplier headers expose the shared column menu trigger', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    await page.goto(url);
    for (const name of ['Division', 'Supplier', 'Accepted', 'Spend', 'Lots', 'Lot Scores']) {
      const trigger = page.getByRole('button', { name: `${name} column menu` });
      await trigger.waitFor();
      assert.equal(await trigger.locator('svg').count(), 1);
      await trigger.click();
      const menu = page.locator('.rv-context-menu:visible');
      await menu.getByRole('menuitem', { name: 'Copy options' }).waitFor();
      await trigger.click();
      await page.waitForTimeout(150);
      assert.equal(await menu.count(), 0);
    }
    assert.equal(await page.locator('.rv-scaled-plot-header__tick').count(), 7);
    assert.equal(await page.locator('.quality-legend').count(), 3);
  } finally { await page.close(); }
});
