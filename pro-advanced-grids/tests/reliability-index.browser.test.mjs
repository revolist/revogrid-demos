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
test("row and chart hover follow stable SLO identities in both directions", async () => {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  try {
    page.setDefaultTimeout(8000);
    await page.goto(url);
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
    await chart.locator("[data-pivot-chart-lollipop]").nth(3).hover();
    await page.waitForFunction(() =>
      [
        ...document.querySelectorAll('.rgRow[data-row-chart-active="true"]'),
      ].some((row) => row.textContent.includes("Settlement batch timeliness")),
    );
    const tooltip = page.locator(".reliability-chart-tooltip[data-visible]");
    await tooltip.waitFor();
    assert.match(await tooltip.textContent(), /-14\.2%.*Settlement batch timeliness/);
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
    await dialog.getByRole("tab", { name: "Burn Rate" }).click();
    await dialog.getByRole("heading", { name: "Burn Rate" }).waitFor();
    await dialog.getByRole("group", { name: "Event delivery success burn rate over 30 days" }).locator("svg").waitFor({ state: "attached" });
    assert.equal(await dialog.getByRole("group", { name: "Event delivery success budget left over 30 days" }).count(), 0);
    await dialog.getByRole("tab", { name: "Settings" }).click();
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
    await page.getByRole('button', { name: 'Open Order journal durability' }).waitFor();
    await page.getByRole('button', {name: 'Sort Budget Left'}).click();
    await page.getByRole('button', { name: 'Open Risk model availability' }).waitFor();
    const row = page.locator('.rgRow').filter({ has: page.getByRole('button', { name: 'Open Risk model availability' }) });
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

test('status tabs keep the shared underline visible without an extra divider', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    const tabs = page.getByRole('tablist', { name: 'Reliability status' });
    await tabs.waitFor();
    const geometry = await tabs.evaluate(element => ({
      height: element.clientHeight,
      scrollHeight: element.scrollHeight,
      borderBottom: getComputedStyle(element).borderBottomWidth,
      childBottom: element.querySelector('[aria-selected="true"]').getBoundingClientRect().bottom - element.getBoundingClientRect().bottom,
    }));
    assert.ok(geometry.scrollHeight <= geometry.height, `tabs should not scroll vertically: ${JSON.stringify(geometry)}`);
    assert.equal(geometry.borderBottom, '0px');
    assert.ok(geometry.childBottom <= 1, 'selected underline should fit in the tab strip');
    assert.deepEqual(await tabs.locator('.rv-segmented-switch-count.rv-badge--neutral.rv-badge--pill').allTextContents(), ['18', '5', '3', '10']);
    await tabs.getByRole('tab', { name: 'Exhausted 5' }).click();
    await page.getByRole('group', { name: 'Budget left for 5 SLOs' }).waitFor();
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
