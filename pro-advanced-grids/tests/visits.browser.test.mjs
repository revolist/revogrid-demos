import { chooseSelect, selectValue } from './select-helper.mjs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';
import { preview } from 'vite';
const { chromium } = createRequire(import.meta.url)('playwright');
let server, browser, url;
before(async () => {
  server = await preview({ configFile: process.env.DEMO_TEST_CONFIG, mode: 'ts', build: { outDir: process.env.DEMO_REUSE_TEST_OUT_DIR ?? 'dist/browser-test' }, preview: { host: '127.0.0.1', port: 0 } });
  url = `${server.resolvedUrls.local[0]}#service-visits`;
  browser = await chromium.launch({ headless: true });
});
after(async () => { await browser?.close(); if (server) await new Promise((resolve, reject) => server.httpServer.close(error => error ? reject(error) : resolve())); });
test('grouped column chooser keeps top-level labels close and indents children', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Columns', exact: true }).click();
    const popup = page.locator('.rv-column-dialog--popover:visible');
    await popup.waitFor();
    const checkbox = popup.getByRole('checkbox', { name: 'Show Oct 12', exact: true });
    await checkbox.waitFor();
    const boxes = await popup.evaluate(root => {
      const position = name => {
        const input = root.querySelector(`input[aria-label="Show ${name}"]`);
        const row = input.closest('.rgRow');
        const cell = [...row.querySelectorAll('.rgCell')].find(item => item.textContent.includes(name));
        const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode()) && node.textContent.trim() !== name) {}
        const range = document.createRange();
        range.selectNodeContents(node);
        return { checkbox: input.getBoundingClientRect().right, label: range.getBoundingClientRect().left };
      };
      return { site: position('Site'), group: position('Oct 12 – Oct 18'), child: position('Oct 12') };
    });
    assert.ok(boxes.site.label - boxes.site.checkbox <= 12, `gap: ${boxes.site.label - boxes.site.checkbox}px`);
    assert.ok(boxes.child.label - boxes.group.label >= 8, 'child label should be indented relative to the group name');
    if (process.env.DEMO_SCREENSHOT_PATH) await page.screenshot({ path: process.env.DEMO_SCREENSHOT_PATH });
  } finally { await page.close(); }
});
test('booking previews technician conflicts before submission', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    await page.goto(url);
    await page.getByRole('searchbox').fill('Market Street Library');
    const due = page.getByRole('button', { name: /Market Street Library.*Water Quality.*Due/ });
    await due.click();
    const dialog = page.getByRole('dialog');
    const availability = dialog.locator('.visit-book-availability');
    await chooseSelect(dialog.getByRole('combobox', { name: 'Time', exact: true }), 'afternoon');
    await chooseSelect(dialog.getByRole('combobox', { name: 'Technician' }), 'Samir Shah');
    await availability.getByText(/already booked at Westfield Community Pool/).waitFor();
    await chooseSelect(dialog.getByRole('combobox', { name: 'Time', exact: true }), 'opening');
    await availability.getByText(/available/).waitFor();
    await dialog.getByRole('button', { name: 'Book Visit', exact: true }).click();
    await page.getByRole('button', { name: /Market Street Library.*Water Quality.*Awaiting/ }).waitFor();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await due.waitFor();
  } finally { await page.close(); }
});
test('service schedule, service filtering and booking remain in sync', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    await page.goto(url);
    await page.getByRole('searchbox').fill('Market Street Library');
    const due = page.getByRole('button', { name: /Market Street Library.*Water Quality.*Due/ });
    await due.waitFor();
    const weeks = () => page.locator('revo-grid').evaluate(grid => grid.columns.filter(column => column.children).map(column => column.name));
    assert.deepEqual(await weeks(), ['Oct 12 – Oct 18', 'Oct 19 – Oct 25', 'Oct 26 – Nov 1']);
    const rows = () => page.locator('revo-grid').evaluate(grid => grid.getVisibleSource());
    await due.click();
    const dialog = page.getByRole('dialog');
    assert.equal(await dialog.getByRole('button', { name: 'Visit date' }).innerText(), 'Oct 29');
    assert.equal(await selectValue(dialog.getByLabel('Service')), 'water');
    await dialog.getByRole('button', { name: 'Book Visit' }).click();
    await page.getByRole('button', { name: /Market Street Library.*Water Quality.*Awaiting/ }).waitFor();
    await chooseSelect(page.getByLabel('Service', { exact: true }), 'Water Quality');
    assert.ok((await rows()).every(row => row.coverage.total === 1));
    await chooseSelect(page.getByLabel('Service', { exact: true }), 'All Services');
    await page.getByRole('button', { name: 'Next week' }).click();
    assert.equal(await page.getByRole('button', { name: 'Start date' }).getAttribute('title'), 'Start date: 2026-10-19');
    assert.deepEqual(await weeks(), ['Oct 19 – Oct 25', 'Oct 26 – Nov 1', 'Nov 2 – Nov 8']);
  } finally { await page.close(); }
});

test('status filter handles booked visits without a shortcut row', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    for (const name of ['Missed visits:', 'Ready to book:', 'Awaiting confirmation:', 'Booked visits:']) {
      assert.equal(await page.getByRole('button', { name: new RegExp(name) }).count(), 0);
    }
    await page.getByRole('button', { name: 'Open Market Street Library' }).waitFor();
    if (process.env.DEMO_SCREENSHOT_PATH) await page.screenshot({ path: process.env.DEMO_SCREENSHOT_PATH });
    const status = page.getByRole('combobox', { name: 'Status' });
    await status.click();
    await page.getByRole('option', { name: /Confirmed/ }).click();
    await page.waitForFunction(async () => {
      const rows = await document.querySelector('revo-grid').getVisibleSource();
      return rows.length > 0 && rows.every(row => row.visits.some(visit => visit.status === 'Booked'));
    });
  } finally { await page.close(); }
});

test('grouped toolbar keeps status count within its height', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    const bar = page.locator('.rv-search-action-bar');
    const status = bar.getByRole('combobox', { name: 'Status' });
    await status.waitFor();
    const before = await bar.boundingBox();
    assert.equal(await status.evaluate(el => getComputedStyle(el).borderTopWidth), '0px');
    assert.equal(await status.evaluate(el => getComputedStyle(el).borderTopLeftRadius), '0px');
    await status.click();
    await page.getByRole('option', { name: /Awaiting/ }).click();
    assert.equal(await status.locator('.selected-count-value').textContent(), 'Status1');
    assert.equal(await status.locator('.selected-tag').count(), 0);
    const after = await bar.boundingBox();
    const selected = await status.boundingBox();
    assert.ok(Math.abs(after.width - before.width) < 1, `toolbar grew from ${before.width} to ${after.width}`);
    assert.ok(selected.height <= after.height, `selected tags grew to ${selected.height}`);
    assert.equal(await page.getByRole('button', { name: 'Show All' }).count(), 0);
    const label = await status.locator('.selected-count-value > span').first().boundingBox();
    const badge = await status.locator('.selected-count-badge').boundingBox();
    const caret = await status.locator('.dropdown-arrow').boundingBox();
    assert.ok(label.x + label.width <= badge.x && badge.x + badge.width < caret.x, JSON.stringify({ label, badge, caret }));
    await page.getByRole('option', { name: /Awaiting/ }).click();
    assert.equal(await status.locator('.selected-count-badge').count(), 0);
  } finally { await page.close(); }
});

test('status choices combine and header sorts apply across pages', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    page.setDefaultTimeout(10000);
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Market Street Library' }).waitFor();
    const rows = () => page.locator('revo-grid').evaluate(grid => grid.getVisibleSource());
    const coverage = page.locator('.rgHeaderCell').filter({ hasText: 'Coverage' }).first();
    const kitchen = page.locator('.rgHeaderCell').filter({ hasText: 'Site' }).first();
    assert.equal(await coverage.evaluate(el => el.classList.contains('asc')), true);
    await kitchen.click();
    await page.locator('.rv-context-menu:visible').getByRole('menuitem', { name: 'Sort ascending', exact: true }).click();
    await page.waitForFunction(async () => (await document.querySelector('revo-grid').getVisibleSource())[0]?.label === 'Brookside Workshop');
    await page.locator('.rv-pagination-panel').getByRole('button', { name: 'Page 2', exact: true }).click();
    await page.waitForFunction(async () => (await document.querySelector('revo-grid').getVisibleSource())[0]?.label === 'Westfield Community Pool');
    await kitchen.click();
    await page.locator('.rv-context-menu:visible').getByRole('menuitem', { name: 'Sort descending', exact: true }).click();
    await page.waitForFunction(async () => (await document.querySelector('revo-grid').getVisibleSource())[0]?.label === 'Willow Public Library');
    await page.getByRole('combobox', { name: 'Status', exact: true }).click();
    const panel = page.getByRole('listbox');
    await panel.locator('.visit-status-count').first().waitFor();
    assert.deepEqual(await panel.locator('.visit-status-count').allTextContents(), ['4','20','2','6','0']);
    assert.equal(await panel.locator('.visit-status-count.rv-badge--neutral.rv-badge--pill').count(), 5);
    const missed = panel.getByRole('option', { name: /Missed/ });
    const awaiting = panel.getByRole('option', { name: /Awaiting/ });
    await missed.click();
    await page.waitForFunction(async () => (await document.querySelector('revo-grid').getVisibleSource()).length === 4);
    assert.ok((await rows()).every(row => row.visits.some(visit => visit.status === 'Missed')));
    await awaiting.click();
    await page.waitForFunction(async () => (await document.querySelector('revo-grid').getVisibleSource()).some(row => row.visits.some(visit => visit.status === 'Awaiting')));
    await missed.click();
    await awaiting.click();
    await page.waitForFunction(async () => (await document.querySelector('revo-grid').getVisibleSource()).length === 10);
    assert.equal((await rows())[0].label, 'Willow Public Library');
  } finally { await page.close(); }
});

test('pagination dropdown changes pages and stays synchronized with buttons', async () => {
  for (const width of [390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    try {
      page.setDefaultTimeout(10000);
      await page.goto(url);
      const panel = page.locator('.rv-pagination-panel');
      await panel.getByText('1-10 of 12 sites').waitFor();
      assert.equal(await page.getByRole('combobox', { name: 'Rows per page' }).count(), 0);
      const picker = panel.getByRole('combobox', { name: 'Page', exact: true });
      await picker.waitFor();
      assert.equal(await picker.getAttribute('data-value'), '0');
      await picker.focus();
      await page.keyboard.press('Enter');
      await page.getByRole('option', { name: '2', exact: true }).waitFor();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await panel.getByText('11-12 of 12 sites').waitFor();
      await page.waitForFunction(async () => (await document.querySelector('revo-grid').getVisibleSource()).length === 2);
      await page.waitForFunction(() => document.querySelector('.rv-pagination-selector [role="combobox"]')?.getAttribute('data-value') === '1');
      await panel.getByRole('button', { name: 'Previous page' }).click();
      await panel.getByText('1-10 of 12 sites').waitFor();
      await page.waitForFunction(() => document.querySelector('.rv-pagination-selector [role="combobox"]')?.getAttribute('data-value') === '0');
    } finally { await page.close(); }
  }
});

test('pagination is left-aligned and fits desktop and mobile widths', async () => {
  for (const width of [320, 390, 650, 651, 768, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    try {
      page.setDefaultTimeout(10000);
      await page.goto(url);
      const panel = page.locator('.rv-pagination-panel');
      await panel.getByText('1-10 of 12 sites').waitFor();
      const dropdown = panel.getByRole('combobox', { name: 'Page', exact: true });
      await dropdown.waitFor();
      const [panelBox, buttons, range] = await Promise.all([
        panel.boundingBox(), panel.locator('> span:first-child').boundingBox(), panel.locator('> span:last-child').boundingBox(),
      ]);
      assert.ok(panelBox && buttons && range, `pagination should be visible at ${width}px`);
      assert.ok(buttons.x - panelBox.x < 25, `pagination is not on the left at ${width}px`);
      const overlap = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
      assert.equal(overlap(buttons, range), false, `pagination and range overlap at ${width}px`);
      for (const box of [buttons, range, await dropdown.boundingBox()]) {
        assert.ok(box && box.x >= 0 && box.x + box.width <= width, `pagination content overflows at ${width}px`);
      }
    } finally { await page.close(); }
  }
});

test('booking validates collisions and bulk booking is awaiting and undoable', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    page.setDefaultTimeout(10000);
    await page.goto(url);
    await page.getByRole('searchbox').fill('Market Street Library');
    await page.getByRole('button', { name: 'Open Market Street Library' }).waitFor();
    await page.getByRole('button', { name: 'Book Visit', exact: true }).click();
    const dialog = page.getByRole('dialog');
    assert.equal(await dialog.getByText('One visit a day per site.').isVisible(), true);
    assert.equal(await dialog.getByLabel('Service').isDisabled(), true);
    await chooseSelect(dialog.getByLabel('Site'), { label: 'Market Street Library' });
    await chooseSelect(dialog.getByLabel('Service'), { label: 'Water Quality' });
    await dialog.getByRole('button', { name: 'Visit date' }).click();
    const picker = page.getByRole('dialog', { name: 'Choose visit date' });
    const conflict = picker.locator('[data-calendar-date="2026-10-23"]'); await conflict.waitFor();
    assert.equal(await conflict.isDisabled(), true);
    await picker.locator('[data-calendar-date="2026-10-29"]').click();
    await dialog.getByRole('button', { name: 'Book Visit' }).click();
    await page.getByRole('button', { name: /Market Street Library.*Water Quality.*Awaiting/ }).waitFor();
    await page.getByRole('button', { name: 'Undo' }).click();
    await page.getByRole('button', { name: /Market Street Library.*Water Quality.*Due/ }).waitFor();
    await page.getByRole('button', { name: /Book all .*unbooked visits/ }).click();
    await page.locator('.rv-toast').getByText("1 visit booked. Each one awaits its vendor's confirmation.").waitFor();
    assert.equal(await page.locator('.workbench-notice').count(), 0);
    assert.equal(await page.locator('.rv-toast[data-tone=success]').count(), 1);
    await page.getByRole('button', { name: /Market Street Library.*Water Quality.*Awaiting/ }).waitFor();
    await page.getByRole('button', { name: 'Undo' }).click();
    await page.getByRole('button', { name: /Market Street Library.*Water Quality.*Due/ }).waitFor();
  } finally { await page.close(); }
});

test('shared form inputs show only their original focus indicator', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Add Site', exact: true }).click();
    const field = page.getByRole('dialog').getByLabel('Site name');
    await field.focus();
    const focused = await field.evaluate(input => ({
      className: input.className,
      outline: getComputedStyle(input).outlineStyle,
      shadow: getComputedStyle(input).boxShadow,
    }));
    assert.match(focused.className, /\brv-control\b/);
    assert.equal(focused.outline, 'none');
    assert.notEqual(focused.shadow, 'none');
  } finally { await page.close(); }
});

test('site contracts drive due dates and can cancel or restore open visits', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    page.setDefaultTimeout(10000);
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Market Street Library' }).waitFor();
    await page.getByRole('button', { name: 'Add Site', exact: true }).click();
    let dialog = page.getByRole('dialog');
    await dialog.getByLabel('Site name').fill('New Test Site');
    await dialog.getByLabel('Address').fill('123 Main Street');
    await chooseSelect(dialog.getByLabel('Area Manager'), 'Inez Ward');
    for (const service of ['Air Handling', 'Water Quality', 'Electrical Safety', 'Heating and Cooling', 'Fire Systems']) await dialog.getByLabel(service, { exact: true }).uncheck();
    await dialog.getByLabel('Lift Inspection last done', { exact: true }).fill('2026-07-24');
    await dialog.getByRole('button', { name: 'Add Site' }).click();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('searchbox').fill('New Test Site');
    await page.getByRole('button', { name: 'Open New Test Site' }).waitFor();
    let rows = await page.locator('revo-grid.workbench-grid').evaluate(grid => grid.getVisibleSource());
    assert.equal(rows[0].coverage.total, 1);
    assert.equal(rows[0].coverage.important.due, 10);
    assert.equal(rows[0].coverage.important.state, 'gap');
    await page.getByRole('searchbox').fill('Market Street Library');
    await page.getByRole('button', { name: 'Open Market Street Library' }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Edit', exact: true }).click();
    await dialog.getByLabel('Air Handling', { exact: true }).uncheck();
    await dialog.getByRole('button', { name: 'Save Changes' }).click();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await page.locator('.rv-toast').getByText('Site updated. 1 open visit cancelled.').waitFor();
    await page.getByRole('button', { name: /Market Street Library.*Air Handling.*Booked/ }).waitFor({ state: 'detached' });
    await page.locator('.rv-toast').filter({ hasText: 'Site updated. 1 open visit cancelled.' }).getByRole('button', { name: 'Undo' }).click();
    await page.getByRole('button', { name: /Market Street Library.*Air Handling.*Booked/ }).waitFor();
    await page.getByRole('button', { name: 'Open Market Street Library' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete site' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Remove Site' }).click();
    await page.locator('.rv-toast').getByText(/Site removed. Market Street Library/).waitFor();
    await page.getByRole('button', { name: 'Open Market Street Library' }).waitFor({ state: 'detached' });
    await page.locator('.rv-toast').filter({ hasText: 'Site removed. Market Street Library' }).getByRole('button', { name: 'Undo' }).click();
    await page.getByRole('button', { name: /Market Street Library.*Air Handling.*Booked/ }).waitFor();
  } finally { await page.close(); }
});

test('visit cards confirm, sign off and reschedule with undo', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    page.setDefaultTimeout(10000);
    await page.goto(url);
    await page.getByRole('searchbox').fill('Hilltop Sports Centre');
    const awaiting = page.getByRole('button', { name: /Hilltop Sports Centre.*Water Quality.*Awaiting/ });
    await awaiting.waitFor(); await awaiting.click();
    let card = page.getByRole('dialog', { name: 'Water Quality' });
    await card.getByText('Clearwater Testing').waitFor();
    await card.getByRole('button', { name: 'Confirm', exact: true }).click();
    await page.getByRole('button', { name: /Hilltop Sports Centre.*Water Quality.*Booked/ }).waitFor();
    await page.getByRole('button', { name: 'Undo' }).click(); await awaiting.waitFor();
    await page.getByRole('searchbox').fill('Northside Pool');
    const missed = page.getByRole('button', { name: /Northside Pool.*Electrical Safety.*Missed/ });
    await missed.click(); card = page.getByRole('dialog', { name: 'Electrical Safety' });
    await card.getByRole('button', { name: 'Mark Done' }).click();
    const signoff = page.getByRole('dialog', { name: 'Sign Off Visit' });
    await signoff.getByLabel('Report No.').fill('QA-42');
    await signoff.getByRole('button', { name: 'Sign Off', exact: true }).click();
    const completed = page.getByRole('button', { name: /Northside Pool.*Electrical Safety.*Completed/ });
    await completed.waitFor(); await completed.click();
    await page.getByRole('dialog', { name: 'Electrical Safety' }).getByText('QA-42').waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Undo' }).click(); await missed.waitFor();
    await page.getByRole('searchbox').fill('Market Street Library');
    const booked = page.getByRole('button', { name: /Market Street Library.*Oct 23.*Air Handling.*Booked/ });
    await booked.click(); card = page.getByRole('dialog', { name: 'Air Handling' });
    await card.getByRole('button', { name: 'Reschedule' }).click();
    const move = page.getByRole('dialog', { name: 'Move Visit' });
    await move.getByRole('gridcell', { name: /October 24, 2026/ }).click();
    await page.getByRole('button', { name: /Market Street Library.*Oct 24.*Air Handling.*Awaiting/ }).waitFor();
    await page.getByRole('button', { name: 'Undo' }).click(); await booked.waitFor();
    await booked.click(); await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog', { name: 'Air Handling' }).count(), 0);
    await booked.click();
    card = page.getByRole('dialog', { name: 'Air Handling' });
    await card.getByRole('button', { name: 'Reschedule' }).click();
    await page.getByRole('dialog', { name: 'Move Visit' }).getByRole('button', { name: 'Back' }).click();
    const menuTrigger = card.getByRole('button', { name: 'More visit actions' });
    assert.equal(await menuTrigger.evaluate(node => node.classList.contains('rv-disclosure-summary')), true);
    await menuTrigger.click();
    await card.getByRole('menuitem', { name: 'Edit Visit' }).focus();
    await page.keyboard.press('Escape');
    assert.equal(await menuTrigger.evaluate(node => node.parentElement.open), false);
    assert.equal(await menuTrigger.evaluate(node => node === document.activeElement), true);
    await menuTrigger.click();
    await card.getByRole('menuitem', { name: 'Edit Visit' }).click();
    const edit = page.getByRole('dialog');
    await edit.getByRole('button', { name: 'Visit date' }).click();
    const picker = page.getByRole('dialog', { name: 'Choose visit date' });
    const conflict = picker.locator('[data-calendar-date="2026-10-15"]'); await conflict.waitFor();
    assert.equal(await conflict.isDisabled(), true);
    await picker.locator('[data-calendar-date="2026-10-24"]').click();
    await edit.getByRole('button', { name: 'Save Changes' }).click();
    await page.getByRole('button', { name: /Market Street Library.*Oct 24.*Air Handling.*Booked/ }).waitFor();
    await page.getByRole('button', { name: 'Undo' }).click(); await booked.waitFor();
  } finally { await page.close(); }
});

test('selected sites retain identity across pages and scope bulk actions', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    page.setDefaultTimeout(10000);
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Market Street Library' }).waitFor();
    await page.locator('.rgHeaderCell').filter({ hasText: 'Site' }).first().click();
    await page.locator('.rv-context-menu:visible').getByRole('menuitem', { name: 'Sort ascending', exact: true }).click();
    const row = label => page.locator('.rgRow').filter({ has: page.getByRole('button', { name: `Open ${label}` }) });
    await row('Market Street Library').getByRole('checkbox', { name: 'Select Market Street Library' }).click();
    const selected = page.getByRole('region', { name: 'Selected sites' });
    await selected.getByText(/1 site selected.*0 awaiting.*1 unbooked/).waitFor();
    await selected.getByRole('button', { name: 'Book All' }).click();
    await page.locator('.rv-toast').getByText("1 visit booked. Each one awaits its vendor's confirmation.").waitFor();
    await selected.getByText(/1 site selected.*1 awaiting.*0 unbooked/).waitFor();
    await selected.getByRole('button', { name: 'Confirm All' }).click();
    await page.locator('.rv-toast').getByText('1 visit confirmed.').waitFor();
    await page.locator('.rv-toast').filter({ hasText: '1 visit confirmed.' }).getByRole('button', { name: 'Undo' }).click();
    await selected.getByText(/1 awaiting/).waitFor();
    await page.locator('.rv-pagination-panel').getByRole('button', { name: 'Page 2', exact: true }).click();
    await page.getByRole('button', { name: 'Open Westfield Community Pool' }).waitFor();
    assert.equal(await page.locator('.rgRow input[type=checkbox]:checked').count(), 0);
    await row('Westfield Community Pool').getByRole('checkbox').click();
    await selected.getByText(/2 sites selected/).waitFor();
    await page.locator('.rv-pagination-panel').getByRole('button', { name: 'Page 1', exact: true }).click();
    await row('Market Street Library').getByRole('checkbox').waitFor();
    assert.equal(await row('Market Street Library').getByRole('checkbox').isChecked(), true);
    await selected.getByRole('button', { name: 'Remove', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Remove Sites' }).click();
    await page.locator('.rv-toast').getByText('2 sites removed.').waitFor();
    await page.locator('.rv-toast').filter({ hasText: '2 sites removed.' }).getByRole('button', { name: 'Undo' }).click();
    await page.getByRole('button', { name: 'Open Market Street Library' }).waitFor();
    assert.equal(await page.getByRole('region', { name: 'Selected sites' }).count(), 0);
  } finally { await page.close(); }
});

test('page select-all and date navigation reset current site identities', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    page.setDefaultTimeout(10000);
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Willow Public Library' }).waitFor();
    await page.getByRole('checkbox', { name: 'Select all sites' }).click();
    const panel = page.getByRole('region', { name: 'Selected sites' });
    await panel.getByText(/10 sites selected/).waitFor();
    await panel.getByRole('button', { name: 'Clear', exact: true }).click();
    await panel.waitFor({ state: 'hidden' });
    await page.getByRole('checkbox', { name: 'Select all sites' }).click();
    await panel.getByText(/10 sites selected/).waitFor();
    await page.getByRole('button', { name: 'Next week' }).click();
    await panel.waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'Open Willow Public Library' }).waitFor();
    const row = page.locator('.rgRow').filter({ has: page.getByRole('button', { name: 'Open Willow Public Library' }) });
    await page.waitForFunction(() => { const button = document.querySelector('button[aria-label="Open Willow Public Library"]'); const checkbox = button?.closest('.rgRow')?.querySelector('input[type=checkbox]'); return checkbox instanceof HTMLInputElement && !checkbox.checked; });
    assert.equal(await row.getByRole('checkbox').isChecked(), false);
  } finally { await page.close(); }
});

test('site selection is named and works from the keyboard', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    const checkbox = page.getByRole('checkbox', { name: 'Select Willow Public Library' });
    await checkbox.focus(); await page.keyboard.press('Space');
    const selected = page.getByRole('region', { name: 'Selected sites' });
    await selected.getByText(/1 site selected/).waitFor();
    await selected.getByRole('button', { name: 'Clear', exact: true }).click();
    await selected.waitFor({ state: 'hidden' });
  } finally { await page.close(); }
});

test('selection stays on the same site when the remote sort changes', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole('checkbox', { name: 'Select Willow Public Library' }).click();
    await page.getByRole('region', { name: 'Selected sites' }).getByText(/1 site selected/).waitFor();
    await page.locator('.rgHeaderCell').filter({ hasText: 'Site' }).first().click();
    await page.locator('.rv-context-menu:visible').getByRole('menuitem', { name: 'Sort ascending', exact: true }).click();
    await page.waitForFunction(async () => (await document.querySelector('revo-grid').getVisibleSource())[0]?.label === 'Brookside Workshop');
    await page.getByRole('region', { name: 'Selected sites' }).getByText(/1 site selected/).waitFor();
    await page.locator('.rv-pagination-panel').getByRole('button', { name: 'Page 2', exact: true }).click();
    const checkbox = page.getByRole('checkbox', { name: 'Select Willow Public Library' });
    await checkbox.waitFor();
    assert.equal(await checkbox.isChecked(), true);
  } finally { await page.close(); }
});

test('site details show the live service plan, signed-off history and export', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    page.setDefaultTimeout(10000);
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Market Street Library' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByText('8 Market Street').waitFor();
    await dialog.getByText('Water due Oct 29').waitFor();
    const plan = dialog.locator('revo-grid');
    await plan.getByRole('button', { name: 'Book Water Quality' }).waitFor();
    await plan.getByRole('button', { name: 'Air Handling, Confirmed, Oct 23' }).click();
    await page.getByRole('dialog', { name: 'Air Handling' }).getByText('North Air Services').waitFor();
    await page.keyboard.press('Escape');
    const rows = await plan.evaluate(grid => grid.getVisibleSource());
    assert.equal(rows.length, 5);
    assert.deepEqual(rows.map(row => [row.service, row.due]), [['air',-6],['water',17],['electrical',30],['lift',124],['climate',46]]);
    await plan.getByRole('button', { name: 'Book Water Quality' }).click();
    assert.equal(await selectValue(dialog.getByLabel('Site')), '5');
    assert.equal(await selectValue(dialog.getByLabel('Service')), 'water');
    assert.equal(await dialog.getByRole('button', { name: 'Visit date' }).innerText(), 'Oct 29');
    await dialog.getByRole('button', { name: 'Back', exact: true }).click();
    await dialog.getByRole('tab', { name: /History/ }).click();
    assert.equal(await dialog.getByText('Air Handling done').count(), 1);
    await dialog.getByText('Report FM-2105', { exact: false }).waitFor();
    const download = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Export CSV' }).click();
    const file = await download;
    assert.equal(file.suggestedFilename(), 'market-street-library-history.csv');
    let csv = ''; for await (const chunk of await file.createReadStream()) csv += chunk.toString();
    assert.match(csv, /"2026-09-19","Air Handling","Ada Ortiz","FM-2105"/);
    await dialog.getByRole('tab', { name: /Plan/ }).click();
    await dialog.getByRole('button', { name: 'Edit', exact: true }).click();
    assert.equal(await dialog.getByLabel('Address').inputValue(), '8 Market Street');
  } finally { await page.close(); }
});

test('site history includes booking activity and removes it on undo', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    page.setDefaultTimeout(10000);
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Market Street Library' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Book Water Quality' }).click();
    await dialog.getByRole('button', { name: 'Book Visit', exact: true }).click();
    await dialog.getByRole('tab', { name: /History 2/ }).click();
    await dialog.getByText('Water Quality booked').waitFor();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Undo' }).click();
    await page.getByRole('button', { name: 'Open Market Street Library' }).click();
    await dialog.getByRole('tab', { name: /History 1/ }).click();
    assert.equal(await dialog.getByText('Water Quality booked').count(), 0);
  } finally { await page.close(); }
});

test('visit calendar disables conflicts and supports month and keyboard navigation', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    page.setDefaultTimeout(5000);
    await page.goto(url);
    await page.getByRole('searchbox').fill('Northside Pool');
    await page.getByRole('button', { name: /Northside Pool.*Electrical Safety.*Missed/ }).click();
    await page.getByRole('dialog', { name: 'Electrical Safety' }).getByRole('button', { name: 'Reschedule' }).click();
    const calendar = page.getByRole('dialog', { name: 'Move Visit' });
    const today = calendar.getByRole('gridcell', { name: 'Friday, October 16, 2026' });
    await today.waitFor();
    assert.equal(await calendar.getByRole('gridcell', { name: 'Thursday, October 22, 2026' }).isDisabled(), false);
    assert.equal(await calendar.getByRole('gridcell', { name: 'Thursday, October 15, 2026' }).isDisabled(), true);
    await today.focus(); await page.keyboard.press('ArrowRight');
    assert.equal(await calendar.getByRole('gridcell', { name: 'Saturday, October 17, 2026' }).evaluate(el => el === document.activeElement), true);
    await calendar.getByRole('button', { name: 'Next month' }).click();
    await calendar.getByRole('grid', { name: 'November 2026 Calendar' }).waitFor();
    await calendar.getByRole('button', { name: 'Previous month' }).click();
    await calendar.getByRole('gridcell', { name: 'Saturday, October 24, 2026' }).click();
    await page.locator('.rv-toast').getByText(/Visit moved/).waitFor();
    await page.getByRole('button', { name: 'Undo' }).click();
    await page.getByRole('button', { name: /Northside Pool.*Electrical Safety.*Missed/ }).waitFor();
  } finally { await page.close(); }
});

test('sign-off calendar saves the chosen completion day and preserves undo', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    page.setDefaultTimeout(5000);
    await page.goto(url);
    await page.getByRole('searchbox').fill('Northside Pool');
    const missed = page.getByRole('button', { name: /Northside Pool.*Electrical Safety.*Missed/ });
    await missed.click();
    await page.getByRole('dialog', { name: 'Electrical Safety' }).getByRole('button', { name: 'Mark Done' }).click();
    const calendar = page.getByRole('dialog', { name: 'Sign Off Visit' });
    const blocked = calendar.getByRole('gridcell', { name: 'Saturday, October 17, 2026' });
    await blocked.waitFor(); assert.equal(await blocked.isDisabled(), true);
    await calendar.getByRole('gridcell', { name: 'Thursday, October 15, 2026' }).click();
    await calendar.getByLabel('Report No.').fill('DONE-15');
    await calendar.getByRole('button', { name: 'Sign Off', exact: true }).click();
    const completed = page.getByRole('button', { name: /Northside Pool.*Oct 15.*Electrical Safety.*Completed/ });
    await completed.waitFor(); await completed.click();
    await page.getByRole('dialog', { name: 'Electrical Safety' }).getByText('DONE-15').waitFor();
    await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Undo' }).click();
    await missed.waitFor();
  } finally { await page.close(); }
});

test('visit calendar stays inside a short viewport as its month changes', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 600 } });
  try {
    page.setDefaultTimeout(5000);
    await page.goto(url);
    await page.getByRole('searchbox').fill('Northside Pool');
    await page.getByRole('button', { name: /Northside Pool.*Electrical Safety.*Missed/ }).click();
    await page.getByRole('dialog', { name: 'Electrical Safety' }).getByRole('button', { name: 'Reschedule' }).click();
    const dialog = page.getByRole('dialog', { name: 'Move Visit' });
    await dialog.getByRole('grid', { name: 'October 2026 Calendar' }).waitFor();
    await dialog.getByRole('button', { name: 'Next month' }).click();
    await dialog.getByRole('grid', { name: 'November 2026 Calendar' }).waitFor();
    await page.waitForFunction(() => { const panel = document.querySelector('.visit-popover:not([hidden])'); if (!panel) return false; const box = panel.getBoundingClientRect(); return box.top >= 0 && box.bottom <= innerHeight && box.left >= 0 && box.right <= innerWidth; });
  } finally { await page.close(); }
});

test('booking date picker restores focus and requires an available date', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Book Visit', exact: true }).click();
    const drawer = page.getByRole('dialog').first();
    await chooseSelect(drawer.getByLabel('Site'), { label: 'Market Street Library' });
    await chooseSelect(drawer.getByLabel('Service'), { label: 'Water Quality' });
    await drawer.getByRole('button', { name: 'Book Visit', exact: true }).click();
    await drawer.getByRole('alert').getByText('Pick today or a later day.').waitFor();
    const trigger = drawer.getByRole('button', { name: 'Visit date' });
    await trigger.click();
    const picker = page.getByRole('dialog', { name: 'Choose visit date' });
    const unavailable = picker.locator('[data-calendar-date="2026-10-23"]'); await unavailable.waitFor();
    assert.equal(await unavailable.isDisabled(), true);
    await page.keyboard.press('Escape');
    assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
    await trigger.click();
    await page.getByRole('dialog', { name: 'Choose visit date' }).locator('[data-calendar-date="2026-10-29"]').click();
    assert.equal(await trigger.innerText(), 'Oct 29');
    assert.equal(await trigger.getAttribute('aria-describedby'), 'visit-date-description');
    assert.equal(await drawer.locator('#visit-date-description').innerText(), 'Selected Oct 29');
  } finally { await page.close(); }
});


test('service date navigator uses the shared calendar and shifts the schedule', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Market Street Library' }).waitFor();
    const trigger = page.getByRole('button', { name: 'Start date' });
    await trigger.click();
    const popup = page.getByRole('dialog', { name: 'Choose start date' });
    assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
    const selected = popup.locator('[data-calendar-date="2026-10-12"]');
    assert.equal(await selected.evaluate(node => {
      const probe = document.createElement('span');
      probe.style.background = 'color-mix(in srgb, var(--rv-ui-text-muted) 20%, var(--rv-ui-surface))';
      node.parentElement.append(probe);
      const matches = getComputedStyle(node).backgroundColor === getComputedStyle(probe).backgroundColor;
      probe.remove();
      return matches;
    }), true, 'selected day uses the shared calendar selection color');
    await popup.locator('[data-calendar-date="2026-10-19"]').click();
    assert.equal(await trigger.getAttribute('title'), 'Start date: 2026-10-19');
    assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
    await trigger.click();
    await page.keyboard.press('Escape');
    assert.equal(await popup.isVisible(), false);
    await trigger.focus();
    assert.equal(await trigger.evaluate(node => document.activeElement === node), true);
  } finally { await page.close(); }
});


test('site dialog scrolls its content without scrolling the page behind it', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 500 } });
  try {
    await page.goto(url);
    await page.evaluate(() => { document.body.style.minHeight = '2400px'; });
    await page.getByRole('button', { name: 'Add Site' }).click();
    const dialog = page.getByRole('dialog').first();
    const editor = dialog.locator('.visit-kitchen-editor');
    const box = await editor.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 300);
    await page.waitForFunction(() => document.querySelector('.visit-kitchen-editor')?.scrollTop > 0);
    assert.equal(await page.evaluate(() => window.scrollY), 0);
    await editor.evaluate(el => { el.scrollTop = el.scrollHeight; });
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => window.scrollY), 0);
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await page.mouse.move(5, 5);
    await page.mouse.wheel(0, 300);
    await page.waitForFunction(() => window.scrollY > 0);
  } finally { await page.close(); }
});

test('site last-done date uses the shared calendar and enforces its maximum', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Add Site' }).click();
    const dialog = page.getByRole('dialog').first();
    const trigger = dialog.getByRole('button', { name: 'Choose Lift Inspection last done' });
    const field = trigger.locator('..');
    const dateInput = field.locator('input[type=date]');
    const inputBox = await dateInput.boundingBox();
    assert.ok(inputBox.width >= 105, `date input should fit a full date, got ${inputBox.width}px`);
    assert.equal(await field.locator('button').count(), 1);
    await trigger.click();
    const popup = page.getByRole('dialog', { name: 'Choose Lift Inspection last done' });
    assert.equal(await popup.evaluate(node => node.classList.contains('rv-popover')), true);
    const calendar = popup.locator('.revo-calendar');
    await page.waitForFunction(() => {
      const node = document.querySelector('[aria-label="Choose Lift Inspection last done"].rv-popover .revo-calendar');
      return node && node.getBoundingClientRect().width >= 220 && node.getBoundingClientRect().height < 350;
    });
    if (process.env.DEMO_SCREENSHOT_PATH) {
      await popup.evaluate(node => node.getAnimations({ subtree: true }).forEach(animation => animation.finish()));
      await page.screenshot({ path: process.env.DEMO_SCREENSHOT_PATH });
    }
    const calendarBox = await calendar.boundingBox();
    assert.ok(calendarBox.height < 350, `calendar should be compact, got ${calendarBox.height}px`);
    const firstDay = popup.locator('.revo-calendar__day').first();
    assert.equal(await firstDay.evaluate(node => getComputedStyle(node).borderTopWidth), '0px');
    const invalid = popup.locator('[data-calendar-date="2026-10-17"]');
    assert.equal(await invalid.isDisabled(), true);
    await popup.locator('[data-calendar-date="2026-10-15"]').click();
    assert.equal(await dialog.getByLabel('Lift Inspection last done', { exact: true }).inputValue(), '2026-10-15');
  } finally { await page.close(); }
});

test('site date field and calendar fit a narrow screen', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Add Site' }).click();
    const dialog = page.getByRole('dialog').first();
    const trigger = dialog.getByRole('button', { name: 'Choose Air Handling last done' });
    const field = trigger.locator('..');
    assert.ok((await field.locator('input[type=date]').boundingBox()).width >= 105);
    assert.equal(await field.locator('button').count(), 1);
    await trigger.click();
    const popup = page.getByRole('dialog', { name: 'Choose Air Handling last done' });
    const box = await popup.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 390, `calendar should fit viewport: ${JSON.stringify(box)}`);
    assert.ok(box.height < 350, `calendar should not stretch: ${box.height}px`);
    await popup.locator('[data-calendar-date="2026-10-15"]').click();
    assert.equal(await dialog.getByLabel('Air Handling last done', { exact: true }).inputValue(), '2026-10-15');
  } finally { await page.close(); }
});

test('booking dropdowns expose required fields and validate empty selections', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Book Visit', exact: true }).click();
    const dialog = page.getByRole('dialog');
    for (const name of ['Site', 'Service', 'Technician']) {
      assert.equal(await dialog.getByRole('combobox', { name, exact: true }).getAttribute('aria-required'), 'true');
    }
    await dialog.getByRole('button', { name: 'Book Visit', exact: true }).click();
    await dialog.getByRole('alert').getByText('Pick the site to visit.').waitFor();
    assert.equal(await dialog.locator('select').count(), 0);
  } finally { await page.close(); }
});

test('generated date columns follow the selected schedule window', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Market Street Library' }).waitFor();
    const columns = () => page.locator('revo-grid').first().evaluate(grid => grid.getColumns());
    let days = (await columns()).filter(column => String(column.prop).startsWith('day-'));
    assert.equal(days.length, 21);
    assert.deepEqual(days.map(column => column.prop), Array.from({ length: 21 }, (_, index) => `day-${index}`));
    assert.equal(days[0].dateSlot.date, '2026-10-12');
    assert.equal(days[20].dateSlot.date, '2026-11-01');
    await page.getByRole('button', { name: 'Next week' }).click();
    days = (await columns()).filter(column => String(column.prop).startsWith('day-'));
    assert.equal(days.length, 21);
    assert.equal(days[0].prop, 'day-7');
    assert.equal(days[20].prop, 'day-27');
    await page.waitForFunction(() => document.querySelector('.visit-day')?.getAttribute('title') === 'Oct 19');
    assert.equal(await page.locator('.visit-day').first().getAttribute('title'), 'Oct 19');
  } finally { await page.close(); }
});

test('date headers are vertically centered in their cells', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    const header = page.locator('.visit-day').first();
    await header.waitFor();
    const offset = await header.evaluate(node => {
      const cell = node.closest('.rgHeaderCell').getBoundingClientRect();
      const day = node.querySelector('strong').getBoundingClientRect();
      const weekday = node.querySelector('small').getBoundingClientRect();
      return Math.abs((day.top + weekday.bottom) / 2 - (cell.top + cell.bottom) / 2);
    });
    assert.ok(offset < 1, `date label is ${offset}px from the cell center`);
  } finally { await page.close(); }
});


test('site column fills spare grid width and keeps a narrow-screen minimum', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Market Street Library' }).waitFor();
    const size = () => page.getByRole('columnheader', { name: 'Site', exact: true }).evaluate(node => node.getBoundingClientRect().width);
    await page.waitForFunction(async () => [...document.querySelectorAll('revo-grid .rgHeaderCell')].find(cell => cell.textContent.trim().startsWith('Site'))?.getBoundingClientRect().width > 165);
    const wide = await size();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(async () => [...document.querySelectorAll('revo-grid .rgHeaderCell')].find(cell => cell.textContent.trim().startsWith('Site'))?.getBoundingClientRect().width === 152);
    assert.ok(wide > 165);
    assert.equal(await size(), 152);
  } finally { await page.close(); }
});

test('site actions use the shared menu and restore focus on Escape', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Open Market Street Library' }).click();
    const dialog = page.getByRole('dialog');
    const trigger = dialog.getByRole('button', { name: 'More actions' });
    assert.equal(await trigger.evaluate(node => node.classList.contains('rv-disclosure-summary')), true);
    await trigger.click();
    const menu = dialog.getByRole('menu', { name: 'Site actions' });
    await menu.getByRole('menuitem', { name: 'Edit Site' }).focus();
    await page.keyboard.press('Escape');
    assert.equal(await trigger.evaluate(node => node.parentElement.open), false);
    assert.equal(await trigger.evaluate(node => node === document.activeElement), true);
    await trigger.click();
    await menu.getByRole('menuitem', { name: 'Edit Site' }).click();
    await page.getByRole('dialog', { name: 'Edit Site' }).waitFor();
  } finally { await page.close(); }
});
