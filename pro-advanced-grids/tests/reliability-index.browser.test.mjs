import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { after, before, test } from "node:test";
import { preview } from "vite";
import { chooseSelect } from "./select-helper.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");
let server, browser, url;
before(async () => {
  server = await preview({
    configFile: process.env.DEMO_TEST_CONFIG,
    mode: "ts",
    build: {
      outDir: process.env.RELIABILITY_TEST_OUT_DIR ?? "dist/browser-test",
    },
    preview: { host: "127.0.0.1", port: 0, strictPort: false },
  });
  url = `${server.resolvedUrls.local[0]}#reliability-index`;
  browser = await chromium.launch({ headless: true });
});
after(async () => {
  await browser?.close();
  if (server)
    await new Promise((resolve, reject) =>
      server.httpServer.close((error) => (error ? reject(error) : resolve())),
    );
});
test('service owner portraits load from local demo assets', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    await page.goto(url);
    const image = page.locator('revo-grid img[src*="portrait-"]').first();
    await image.waitFor();
    await image.evaluate(element => element.decode());
    assert.ok(await image.evaluate(element => element.naturalWidth > 0));
  } finally { await page.close(); }
});

test('selected service history and comparison are both available', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    await page.goto(url);
    await page.getByRole('group', { name: 'Budget left for 18 SLOs' }).locator('[data-pivot-chart-lollipop]').first().waitFor();
    if (process.env.DEMO_SCREENSHOT_PATH) await page.screenshot({ path: process.env.DEMO_SCREENSHOT_PATH });
    await page.getByRole('group', { name: 'Chart view' }).getByRole('button', { name: 'History' }).click();
    await page.getByRole('group', { name: 'Order journal durability sample budget history over 30 days' }).locator('svg').waitFor({ state: 'attached' });
    await page.getByRole('button', { name: 'Open Mobile alert delivery' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('group', { name: 'Mobile alert delivery sample budget history over 30 days' }).waitFor();
    await page.getByRole('group', { name: 'Chart view' }).getByRole('button', { name: 'Compare' }).click();
    await page.getByRole('group', { name: 'Budget left for 18 SLOs' }).locator('[data-pivot-chart-lollipop]').first().waitFor();
  } finally { await page.close(); }
});
test("triage starts with paging services and keeps manual sorting available", async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.locator(".reliability-name").first().waitFor();
    const grid = page.locator("revo-grid").first();
    const initial = await grid.evaluate(element => element.getVisibleSource());
    assert.equal(initial[0].alert, "Paging");
    assert.match(await page.locator(".reliability-chart__head").innerText(), new RegExp(initial[0].name));
    await page.getByRole("button", { name: "Sort SLO" }).click();
    await page.waitForFunction(async () => {
      const rows = await document.querySelector("revo-grid").getVisibleSource();
      const names = rows.map(row => row.name);
      return names.every((name, index) => index === 0 || names[index - 1].localeCompare(name) <= 0);
    });
  } finally {
    await page.close();
  }
});
test("row and chart hover follow stable SLO identities in both directions", async () => {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  try {
    page.setDefaultTimeout(8000);
    await page.goto(url);
    await page.getByRole("group", { name: "Chart view" }).getByRole("button", { name: "Compare" }).click();
    await page
      .getByRole("button", { name: "Open Order journal durability" })
      .waitFor();
    const chart = page.getByRole("group", { name: "Budget left for 18 SLOs" });
    await chart.locator("[data-pivot-chart-lollipop]").first().waitFor();
    await page.screenshot({
      path: "/private/tmp/reliability-index-desktop.png",
    });
    const row = page
      .locator(".rgRow")
      .filter({
        has: page.getByRole("button", { name: "Open Catalog search freshness" }),
      });
    await row.hover();
    await chart
      .locator("[data-chart-peer-hover] line")
      .first()
      .waitFor({ state: "attached" });
    await chart.locator("[data-chart-peer-hover-marker]").waitFor({ state: "attached" });
    assert.equal(await row.getAttribute("data-row-chart-active"), "true");
    const peerLine = chart.locator("[data-chart-peer-hover] line").first();
    assert.equal(await peerLine.evaluate((line) => getComputedStyle(line).strokeWidth), "20px");
    await page.screenshot({ path: "/private/tmp/reliability-index-row-hover.png" });
    const rows = await page.locator("revo-grid").first().evaluate(grid => grid.getVisibleSource());
    const settlementIndex = rows.findIndex(item => item.name === "Settlement batch timeliness");
    assert.notEqual(settlementIndex, -1);
    await chart.locator("[data-pivot-chart-lollipop]").nth(settlementIndex).hover();
    await page.waitForFunction(() =>
      [
        ...document.querySelectorAll('.rgRow[data-row-chart-active="true"]'),
      ].some((row) => row.textContent.includes("Settlement batch timeliness")),
    );
    const tooltip = page.locator(".reliability-chart-tooltip[data-visible]");
    await tooltip.waitFor();
    assert.match(await tooltip.textContent(), /-12\.7%.*Settlement batch timeliness/);
    await page.screenshot({ path: "/private/tmp/reliability-index-chart-hover.png" });
    await page.mouse.move(10, 10);
    await page.waitForFunction(
      () => !document.querySelector('.rgRow[data-row-chart-active="true"]'),
    );
  } finally {
    await page.close();
  }
});
test("filters, windows, search and details operate on the same SLO set", async () => {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  try {
    page.setDefaultTimeout(8000);
    await page.goto(url);
    await page.getByRole("group", { name: "Chart view" }).getByRole("button", { name: "Compare" }).click();
    await page
      .getByRole("button", { name: "Open Order journal durability" })
      .waitFor();
    await page.getByRole("tab", { name: "Exhausted 5" }).click();
    await page.getByRole("group", { name: "Budget left for 5 SLOs" }).waitFor();
    await page.getByRole("tab", { name: "All 18" }).click();
    await page.getByRole("searchbox").fill("Event");
    await page.getByRole("group", { name: "Budget left for 2 SLOs" }).waitFor();
    await page
      .getByRole("button", { name: "Open Event delivery success" })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("group", { name: "Event delivery success budget left over 30 days" }).locator("svg").waitFor({ state: "attached" });
    await dialog.getByRole("group", { name: "Reliability details" }).getByRole("button", { name: "Burn Rate" }).click();
    await dialog.getByRole("heading", { name: "Burn Rate" }).waitFor();
    await dialog.getByRole("group", { name: "Event delivery success burn rate over 30 days" }).locator("svg").waitFor({ state: "attached" });
    assert.equal(await dialog.getByRole("group", { name: "Event delivery success budget left over 30 days" }).count(), 0);
    await dialog.getByRole("group", { name: "Reliability details" }).getByRole("button", { name: "Settings" }).click();
    await dialog.getByRole("button", { name: "Edit SLO" }).waitFor();
  } finally {
    await page.close();
  }
});
test("reliability index remains usable on mobile", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    page.setDefaultTimeout(8000);
    await page.goto(url);
    await page
      .getByRole("button", { name: "Open Order journal durability" })
      .waitFor();
    await page.screenshot({
      path: "/private/tmp/reliability-index-mobile.png",
    });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      390,
    );
    await page.getByRole("button", { name: "New SLO" }).click();
    await page
      .getByRole("dialog")
      .getByLabel("Name", { exact: true })
      .fill("Checkout SLO");
    await page
      .getByRole("dialog")
      .getByLabel("Service", { exact: true })
      .fill("checkout");
    await page.getByRole("button", { name: "Create SLO" }).click();
    await page.getByRole("searchbox").fill("Checkout SLO");
    await page.getByRole("button", { name: "Open Checkout SLO" }).waitFor();
  } finally {
    await page.close();
  }
});

test("chart keyboard inspection and filtering keep the matching row active", async () => {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  try {
    page.setDefaultTimeout(8000);
    await page.goto(url);
    await page.getByRole("group", { name: "Chart view" }).getByRole("button", { name: "Compare" }).click();
    await page
      .getByRole("button", { name: "Open Order journal durability" })
      .waitFor();
    await page.getByRole("searchbox").fill("journal");
    const chart = page.getByRole("group", { name: "Budget left for 2 SLOs" });
    const marks = chart.locator("[data-pivot-chart-lollipop]");
    await marks.first().waitFor();
    await marks.first().focus();
    await page.waitForFunction(() =>
      [
        ...document.querySelectorAll('.rgRow[data-row-chart-active="true"]'),
      ].some((row) => row.textContent.includes("Order journal durability")),
    );
    await page.keyboard.press("ArrowRight");
    await page.waitForFunction(() =>
      [
        ...document.querySelectorAll('.rgRow[data-row-chart-active="true"]'),
      ].some((row) => row.textContent.includes("Transaction journal freshness")),
    );
  } finally {
    await page.close();
  }
});

test('sorting keeps chart points linked to their source rows', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    page.setDefaultTimeout(8000);
    await page.goto(url);
    await page.getByRole("group", { name: "Chart view" }).getByRole("button", { name: "Compare" }).click();
    await page.getByRole('button', { name: 'Open Order journal durability' }).waitFor();
    const grid = page.locator('revo-grid.workbench-grid');
    const before = await grid.evaluate(el => el.getVisibleSource().then(rows => rows.map(row => row.id)));
    await page.getByRole('button', {name: 'Sort Budget Left'}).click();
    const after = await grid.evaluate(el => el.getVisibleSource().then(rows => rows.map(row => row.id)));
    assert.notDeepEqual(after, before);
    const row = page.locator('.rgRow').filter({ has: page.getByRole('button', { name: /^Open / }) }).first();
    await row.hover();
    await page.getByRole('group', { name: 'Budget left for 18 SLOs' }).locator('[data-chart-peer-hover-marker]').waitFor({ state: 'attached' });
    assert.equal(await row.getAttribute('data-row-chart-active'), 'true');
  } finally { await page.close(); }
});

test('chart guide moves between points and respects reduced motion', async () => {
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion });
    try {
      await page.addInitScript(() => {
        window.guideAnimations = 0;
        const animate = Element.prototype.animate;
        Element.prototype.animate = function (...args) {
          if (this.parentElement?.hasAttribute('data-chart-peer-hover')) window.guideAnimations++;
          return animate.apply(this, args);
        };
      });
      await page.goto(url);
    await page.getByRole("group", { name: "Chart view" }).getByRole("button", { name: "Compare" }).click();
      const marks = page.getByRole('group', { name: 'Budget left for 18 SLOs' }).locator('[data-pivot-chart-lollipop]');
      await marks.first().waitFor();
      await marks.nth(1).hover();
      await page.locator('[data-chart-peer-hover]').waitFor({ state: 'attached' });
      await marks.nth(3).hover();
      if (reducedMotion === 'no-preference') await page.waitForFunction(() => window.guideAnimations > 0, { timeout: 2000 });
      else await page.waitForTimeout(200);
      const animations = await page.evaluate(() => window.guideAnimations);
      assert.equal(animations > 0, reducedMotion === 'no-preference');
    } finally { await page.close(); }
  }
});


test('incident dips use the shared threshold-colored sparkline', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    const row = page.locator('.rgRow').filter({ has: page.getByRole('button', { name: 'Open Checkout API latency' }) });
    const dip = row.locator('[data-sparkline-below-threshold]');
    await dip.waitFor({ state: 'attached' });
    await row.screenshot({ path: '/private/tmp/reliability-sparkline-spike.png' });
    assert.equal(await dip.getAttribute('stroke'), '#ed3d69');
    assert.match(await dip.getAttribute('clip-path'), /^url\(#.+-below\)$/);
  } finally { await page.close(); }
});

test('strict objective keeps exhausted SLO markers inside the chart', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    page.setDefaultTimeout(8000);
    await page.goto(url);
    await page.getByRole("group", { name: "Chart view" }).getByRole("button", { name: "Compare" }).click();
    await page.getByRole('button', { name: 'Open Order journal durability' }).waitFor();
    await chooseSelect(page.getByRole('combobox', { name: 'Measure at objective' }), '99.99%');
    const chart = page.getByRole('group', { name: 'Budget left for 18 SLOs' });
    await chart.locator('[data-pivot-chart-lollipop]').first().waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll('.reliability-chart__plot svg text')].some(label => label.textContent === '-500%'));
    const points = await chart.locator('svg').evaluate(svg => {
      const [, , , height] = svg.getAttribute('viewBox').split(/\s+/).map(Number);
      return [...svg.querySelectorAll('[data-pivot-chart-lollipop]')].map(mark => ({ y: Number(mark.getAttribute('cy')), height }));
    });
    assert.ok(points.every(({ y, height }) => y >= 0 && y <= height));
  } finally { await page.close(); }
});

test('status tabs use shared underline and badge styles without clipping', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole("group", { name: "Chart view" }).getByRole("button", { name: "Compare" }).click();
    const tabs = page.getByRole('tablist', { name: 'Reliability status' });
    await tabs.waitFor();
    assert.equal(await tabs.getByRole('tab', { selected: true }).evaluate(node => {
      const probe = document.createElement('span');
      probe.style.borderBottomColor = 'var(--rv-ui-accent)';
      node.parentElement.append(probe);
      const matches = getComputedStyle(node).borderBottomColor === getComputedStyle(probe).borderBottomColor;
      probe.remove();
      return matches;
    }), true, 'selected underline uses the UI accent');
    const geometry = await tabs.evaluate(element => ({
      height: element.clientHeight,
      scrollHeight: element.scrollHeight,
      borderBottom: getComputedStyle(element).borderBottomWidth,
      childBottom: element.querySelector('[aria-selected="true"]').getBoundingClientRect().bottom - element.getBoundingClientRect().bottom,
    }));
    assert.ok(geometry.scrollHeight <= geometry.height, `tabs should not scroll vertically: ${JSON.stringify(geometry)}`);
    assert.equal(geometry.borderBottom, '1px');
    assert.ok(geometry.childBottom <= 1, 'selected underline should fit in the tab strip');
    assert.equal(await tabs.evaluate(element => {
      const items = [...element.querySelectorAll('[role="tab"]')];
      const first = items[0].getBoundingClientRect(), last = items.at(-1).getBoundingClientRect();
      return last.right - first.left < element.clientWidth / 2;
    }), true, 'tabs stay grouped at the start of the strip');
    assert.equal(await tabs.locator('.rv-segmented-switch-count.rv-badge--neutral.rv-badge--pill').count(), 4);
    const exhausted = tabs.getByRole('tab', { name: /^Exhausted/ });
    await exhausted.click();
    await page.getByRole('group', { name: /^Budget left for \d+ SLOs$/ }).waitFor();
    if (process.env.DEMO_SCREENSHOT_PATH) await page.screenshot({ path: process.env.DEMO_SCREENSHOT_PATH });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await exhausted.getAttribute('aria-selected'), 'true');
    assert.equal(await tabs.evaluate(element => element.scrollHeight <= element.clientHeight), true);
    assert.equal(await tabs.getByRole('tab').evaluateAll(items => items.every(item => item.scrollWidth <= item.clientWidth)), true);
  } finally { await page.close(); }
});


test('rolling window uses the standard segmented switch', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    const group = page.getByRole('group', { name: 'Rolling window' });
    await group.waitFor();
    assert.ok(await group.evaluate(element => element.classList.contains('rv-segmented-switch')));
    await group.getByRole('button', { name: '7D' }).click();
    await page.waitForFunction(() => document.querySelector('[aria-label="Rolling window"] [aria-pressed="true"]')?.textContent === '7D');
  } finally { await page.close(); }
});
