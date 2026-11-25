import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { after, before, test } from "node:test";
import { preview } from "vite";
const { chromium } = createRequire(import.meta.url)("playwright");
let server, browser, url;
before(async () => {
  server = await preview({
    mode: "ts",
    build: { outDir: process.env.DEMO_REUSE_TEST_OUT_DIR ?? "dist/browser-test" },
    preview: { host: "127.0.0.1", port: 0, strictPort: false },
  });
  url = `${server.resolvedUrls.local[0]}#job-schedule`;
  browser = await chromium.launch({ headless: true });
});
after(async () => {
  await browser?.close();
  if (server)
    await new Promise((resolve, reject) =>
      server.httpServer.close((error) => (error ? reject(error) : resolve())),
    );
});
test("job schedule renders shared grid cells and navigates weeks", async () => {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  try {
    page.on("pageerror", (error) => console.error(error));
    await page.goto(url);
    await page.getByRole("button", { name: "Open Willow House Exterior" }).waitFor();
    const generatedDates = () => page.locator("revo-grid").first().evaluate(async grid =>
      (await grid.getColumns()).filter(column => column.dateSlot).map(column => column.dateSlot.date),
    );
    assert.deepEqual(await generatedDates(), [
      "2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23",
      "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30",
      "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06",
      "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13",
    ]);
    await page.screenshot({ path: "/private/tmp/job-schedule-desktop.png" });
    assert.ok((await page.locator(".rv-identity-cell").count()) > 0);
    assert.ok((await page.locator(".rv-status-action").count()) > 0);
    assert.match(
      await page.locator(".workbench-heading").innerText(),
      /Oct 19 to Nov 13/,
    );
    await page.getByRole("button", { name: "Later week" }).click();
    await page.waitForFunction(async () => {
      const columns = await document.querySelector("revo-grid").getColumns();
      return columns.filter(column => column.dateSlot)[0]?.dateSlot.date === "2026-10-26";
    });
    const shiftedDates = await generatedDates();
    assert.equal(shiftedDates.length, 20);
    assert.equal(shiftedDates[0], "2026-10-26");
    assert.equal(shiftedDates[19], "2026-11-20");
    assert.match(
      await page.locator(".workbench-heading").innerText(),
      /Oct 26 to Nov 20/,
    );
    await page.getByRole("button", { name: "Today", exact: true }).click();
    assert.match(
      await page.locator(".workbench-heading").innerText(),
      /Oct 19 to Nov 13/,
    );
    await page.getByRole("searchbox").fill("Maple");
    await page.getByRole("button", { name: "Open Maple Court Kitchen" }).waitFor();
    await page.getByRole("button", { name: "Open Willow House Exterior" }).waitFor({ state: "detached" });
    assert.equal(
      await page.getByRole("button", { name: "Open Willow House Exterior" }).count(),
      0,
    );
  } finally {
    await page.close();
  }
});
test("crew day and job creation update in-memory schedule", async () => {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  try {
    await page.goto(url);
    await page.getByRole("button", { name: "Open Willow House Exterior" }).waitFor();
    await page
      .getByRole("button", { name: "Add crew day, Willow House Exterior, Oct 27" })
      .click();
    await page.getByLabel("Crew hours").fill("6");
    await page
      .getByRole("button", { name: "Add crew day", exact: true })
      .click();
    await page
      .getByRole("button", { name: /Willow House Exterior, Oct 27, planned, 6h/ })
      .waitFor();
    await page.getByRole("button", { name: "Add Job", exact: true }).click();
    await page.getByLabel("Client", { exact: true }).fill("Newman");
    await page.getByLabel("Street", { exact: true }).fill("12 Elm");
    await page.getByLabel("Town", { exact: true }).fill("Lisbon");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Add Job" })
      .click();
    await page.getByRole("searchbox").fill("Newman");
    await page.getByRole("button", { name: "Open Newman Kitchen" }).waitFor();
    const created = await page
      .locator("revo-grid")
      .evaluate((grid) =>
        grid.source.find((row) => row.label === "Newman Kitchen"),
      );
    assert.equal(Object.keys(created.days).length, 5);
    assert.equal(created.finish, "Nov 2");
  } finally {
    await page.close();
  }
});
test("job schedule remains usable on mobile", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(url);
    await page.getByRole("button", { name: "Open Willow House Exterior" }).waitFor();
    await page.screenshot({ path: "/private/tmp/job-schedule-mobile.png" });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      390,
    );
    await page.getByRole("button", { name: "Add Job", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByText("Crew days are planned from the job type.")
      .waitFor();
  } finally {
    await page.close();
  }
});

test("schedule omits attention cards and pagination keeps jobs reachable", async () => {
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole("button", { name: "Open Willow House Exterior" }).waitFor();
    assert.equal(await page.locator('.job-schedule__attention').count(), 0);
    await page.locator('.rv-pagination-panel').getByRole('button', { name: 'Page 2', exact: true }).click();
    await page.getByRole('button', { name: 'Open Ash Kitchen' }).waitFor();
  } finally { await page.close(); }
});

test('job selection is named and follows rows across pages', async () => {
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  try {
    await page.goto(url);
    const selected = page.getByRole('checkbox', { name: 'Select Willow House Exterior' });
    await selected.focus();
    await page.keyboard.press('Space');
    assert.equal(await selected.isChecked(), true);
    await page.locator('.rv-pagination-panel').getByRole('button', { name: 'Page 2', exact: true }).click();
    await page.getByRole('button', { name: 'Open Ash Kitchen' }).waitFor();
    await page.locator('.rv-pagination-panel').getByRole('button', { name: 'Page 1', exact: true }).click();
    await selected.waitFor();
    assert.equal(await selected.isChecked(), true);
  } finally { await page.close(); }
});

test('booking capacity chart shows its current totals on hover and focus', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    await page.goto(url);
    const chart = page.locator('.rv-capacity-dots').first();
    await chart.waitFor();
    const label = await chart.getAttribute('aria-label');
    const match = label.match(/(\d+) of 10 crew booked, (\d+)h/);
    assert.ok(match, label);
    assert.equal(await chart.locator('.rv-capacity-dots__dots i').count(), 10);
    assert.equal(await chart.locator('.rv-capacity-dots__dots .is-filled').count(), Math.min(10, Number(match[1])));
    assert.equal(await chart.locator('.rv-capacity-dots__text').innerText(), `${match[2]}h`);
    await chart.hover();
    const tooltip = page.getByRole('tooltip');
    await tooltip.waitFor();
    assert.match(await tooltip.innerText(), new RegExp(`${match[1]} of 10 crew booked, ${match[2]}h`));
    await page.mouse.move(0, 0);
    await chart.focus();
    await tooltip.waitFor();
    await page.keyboard.press('Escape');
    await tooltip.waitFor({ state: 'hidden' });
  } finally { await page.close(); }
});

test('schedule icons expose their description on hover and focus', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    await page.goto(url);
    const icon = page.locator('.job-schedule__slot--delivery button[data-tooltip]').first();
    await icon.waitFor();
    const description = await icon.getAttribute('data-tooltip');
    assert.ok(description);
    assert.match(await icon.getAttribute('aria-label'), new RegExp(description));
    await icon.hover();
    const tooltip = page.getByRole('tooltip');
    await tooltip.waitFor();
    assert.equal(await tooltip.innerText(), description);
    await page.mouse.move(0, 0);
    await icon.focus();
    await tooltip.waitFor();
    await page.keyboard.press('Escape');
    await tooltip.waitFor({ state: 'hidden' });
    await icon.click();
    await page.getByRole('dialog').waitFor();
  } finally { await page.close(); }
});

test('schedule tooltips use a brief delay and respect reduced motion', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, reducedMotion: 'reduce' });
  try {
    await page.goto(url);
    const chart = page.locator('.rv-capacity-dots').first();
    await chart.waitFor();
    await chart.hover();
    const tooltip = page.getByRole('tooltip');
    assert.equal(await tooltip.isVisible(), false);
    await tooltip.waitFor();
    assert.equal(await tooltip.evaluate(el => getComputedStyle(el).transitionDuration), '0s');
    assert.equal(await tooltip.evaluate(el => el.classList.contains('grid-tooltip--animated')), true);
  } finally { await page.close(); }
});

test('editing a created job retains its town, phone and due date', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    page.setDefaultTimeout(8000);
    await page.goto(url);
    await page.getByRole('button', { name: 'Add Job', exact: true }).click();
    await page.getByLabel('Client', { exact: true }).fill('Molina');
    await page.getByLabel('Phone', { exact: true }).fill('123456789');
    await page.getByLabel('Street', { exact: true }).fill('12 Elm');
    await page.getByLabel('Town', { exact: true }).fill('Lisbon');
    await page.getByLabel('Due Date', { exact: true }).fill('2026-11-06');
    await page.getByRole('dialog').getByRole('button', { name: 'Add Job', exact: true }).click();
    await page.getByRole('searchbox').fill('Molina');
    await page.getByRole('button', { name: 'Open Molina Kitchen' }).click();
    await page.getByRole('button', { name: 'Edit Job' }).click();
    assert.equal(await page.getByLabel('Phone', { exact: true }).inputValue(), '123456789');
    assert.equal(await page.getByLabel('Town', { exact: true }).inputValue(), 'Lisbon');
    assert.equal(await page.getByLabel('Due Date', { exact: true }).inputValue(), '2026-11-06');
    await page.getByLabel('Due Date', { exact: true }).fill('2026-11-10');
    await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByRole('button', { name: 'Open Molina Kitchen' }).click();
    await page.getByRole('button', { name: 'Edit Job' }).click();
    assert.equal(await page.getByLabel('Due Date', { exact: true }).inputValue(), '2026-11-10');
    assert.equal(await page.getByLabel('Start', { exact: true }).count(), 0);
    await page.getByLabel('Due Date', { exact: true }).fill('');
    await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByRole('button', { name: 'Open Molina Kitchen' }).click();
    assert.match(await page.getByRole('dialog').innerText(), /Finish Nov 2 · Due Nov 2/);
    await page.getByRole('button', { name: 'Edit Job' }).click();
    assert.equal(await page.getByLabel('Due Date', { exact: true }).inputValue(), '');
  } finally { await page.close(); }
});

test('updating crew time preserves an existing delivery and its details', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    page.setDefaultTimeout(8000);
    await page.goto(url);
    await page.getByRole('button', { name: /Maple Court Kitchen, Oct 27, delivery, Quartz slab/ }).click();
    await page.getByLabel('Crew hours').fill('3');
    await page.getByRole('button', { name: 'Update crew day' }).click();
    const job = await page.locator('revo-grid').first().evaluate(grid => grid.source.find(row => row.label === 'Maple Court Kitchen'));
    assert.deepEqual(job.days[15], { kind: 'delivery', note: 'Quartz slab, 2 pieces', hours: 3 });
  } finally { await page.close(); }
});

test('editing a fixture job preserves its existing due date when the date field is untouched', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Willow House Exterior' }).click();
    assert.match(await page.getByRole('dialog').innerText(), /Due Nov 16/);
    await page.getByRole('button', { name: 'Edit Job' }).click();
    assert.equal(await page.getByLabel('Start', { exact: true }).count(), 0);
    assert.equal(await page.getByLabel('Due Date', { exact: true }).inputValue(), '');
    await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByRole('button', { name: 'Open Willow House Exterior' }).click();
    assert.match(await page.getByRole('dialog').innerText(), /Due Nov 16/);
  } finally { await page.close(); }
});

test('shared job action bar slides selected schedules and supports undo', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    const checkbox = page.getByRole('checkbox', { name: 'Select Willow House Exterior' });
    await checkbox.check();
    const bar = page.getByRole('toolbar', { name: 'Selected jobs' });
    await bar.getByText(/1 job selected.*50h of crew time ahead/).waitFor();
    assert.equal(await page.locator('.workbench-toolbar').isVisible(), false);
    const original = await page.locator('revo-grid').evaluate(grid => structuredClone(grid.source.find(row => row.label === 'Willow House Exterior').days));
    await bar.getByRole('button', { name: 'Slide' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Slide jobs' }).click();
    await bar.waitFor({ state: 'hidden' });
    const moved = await page.locator('revo-grid').evaluate(grid => grid.source.find(row => row.label === 'Willow House Exterior').days);
    assert.deepEqual(moved['22'], original['21']);
    assert.equal(moved['21'], undefined);
    await page.locator('.rv-toast').getByRole('button', { name: 'Undo' }).click();
    const restored = await page.locator('revo-grid').evaluate(grid => grid.source.find(row => row.label === 'Willow House Exterior').days);
    assert.deepEqual(restored, original);
    await checkbox.check();
    await bar.getByRole('button', { name: 'Clear' }).click();
    await bar.waitFor({ state: 'hidden' });
    await page.waitForFunction(() => !document.querySelector('revo-grid .row-select-checkbox[aria-label="Select Willow House Exterior"]')?.checked);
  } finally { await page.close(); }
});

test('job bulk deletion includes selections across pages and can be undone', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole('checkbox', { name: 'Select Willow House Exterior' }).check();
    await page.locator('.rv-pagination-panel').getByRole('button', { name: 'Page 2', exact: true }).click();
    await page.getByRole('checkbox', { name: 'Select Ash Kitchen' }).check();
    const bar = page.getByRole('toolbar', { name: 'Selected jobs' });
    await bar.getByText(/2 jobs selected/).waitFor();
    await bar.getByRole('button', { name: 'Delete' }).click();
    await page.locator('.rv-toast').getByText('2 jobs deleted.').waitFor();
    await page.locator('.rv-toast').getByRole('button', { name: 'Undo' }).click();
    await page.locator('.rv-pagination-panel').getByRole('button', { name: 'Page 1', exact: true }).click();
    await page.getByRole('button', { name: 'Open Willow House Exterior' }).waitFor();
    await page.locator('.rv-pagination-panel').getByRole('button', { name: 'Page 2', exact: true }).click();
    await page.getByRole('button', { name: 'Open Ash Kitchen' }).waitFor();
  } finally { await page.close(); }
});


test('job action menu uses shared menu and opens the workday slide dialog', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Actions for Willow House Exterior' }).click();
    const menu = page.getByRole('menu', { name: 'Actions for Willow House Exterior' });
    const items = menu.getByRole('menuitem');
    assert.equal(await items.count(), 6);
    assert.equal(await items.locator('svg').count(), 6);
    const styles = await menu.evaluate(element => ({
      border: getComputedStyle(element).borderTopWidth,
      alignment: getComputedStyle(element.querySelector('[role=menuitem]')).justifyContent,
    }));
    assert.equal(styles.border, '0px');
    assert.equal(styles.alignment, 'flex-start');
    await menu.getByRole('menuitem', { name: 'Slide Schedule' }).click();
    const dialog = page.getByRole('dialog', { name: 'Slide Schedule' });
    await dialog.getByRole('spinbutton', { name: 'Workdays' }).fill('-1');
    assert.match(await dialog.innerText(), /What moves[\s\S]*Willow House Exterior/);
    await dialog.getByRole('button', { name: 'Slide jobs' }).click();
    await page.locator('.rv-toast').getByText('1 job rescheduled.').waitFor();
    await page.locator('.rv-toast').getByRole('button', { name: 'Undo' }).click();
    await page.getByRole('button', { name: 'Actions for Willow House Exterior' }).click();
    await page.getByRole('menuitem', { name: 'Edit Job' }).click();
    await page.getByRole('dialog', { name: 'Edit Job' }).waitFor();
  } finally { await page.close(); }
});


test('job column fills spare grid width and retains its minimum on mobile', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Willow House Exterior' }).waitFor();
    await page.waitForFunction(async () => [...document.querySelectorAll('revo-grid .rgHeaderCell')].find(cell => cell.textContent.trim().startsWith('Job'))?.getBoundingClientRect().width > 230);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(async () => [...document.querySelectorAll('revo-grid .rgHeaderCell')].find(cell => cell.textContent.trim().startsWith('Job'))?.getBoundingClientRect().width === 230);
  } finally { await page.close(); }
});

test('job row action icons stay centered in their cells', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Actions for Willow House Exterior' }).waitFor();
    for (const pageNumber of [1, 2]) {
      if (pageNumber === 2) {
        await page.locator('.rv-pagination-panel').getByRole('button', { name: 'Page 2', exact: true }).click();
        await page.getByRole('button', { name: 'Actions for Ash Kitchen' }).waitFor();
      }
      const offsets = await page.locator('.workbench--job-schedule .rv-cell-action').evaluateAll(buttons => buttons.map(button => {
        const cell = button.closest('.rgCell').getBoundingClientRect();
        const icon = button.querySelector('svg').getBoundingClientRect();
        return { x: Math.abs((cell.left + cell.right - icon.left - icon.right) / 2), y: Math.abs((cell.top + cell.bottom - icon.top - icon.bottom) / 2) };
      }));
      assert.ok(offsets.length > 0);
      assert.ok(offsets.every(offset => offset.x < 1 && offset.y < 1), JSON.stringify(offsets));
    }
  } finally { await page.close(); }
});
