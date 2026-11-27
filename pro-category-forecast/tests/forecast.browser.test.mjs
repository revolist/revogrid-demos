import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';
import { preview } from 'vite';

const { chromium } = createRequire(import.meta.url)('playwright');
let server, browser, url;
before(async () => {
  server = await preview({ configFile: process.env.FORECAST_TEST_CONFIG, mode: 'ts', build: { outDir: process.env.FORECAST_TEST_OUT_DIR ?? 'dist/browser-test' }, preview: { host: '127.0.0.1', port: 0, strictPort: false } });
  url = server.resolvedUrls.local[0];
  browser = await chromium.launch({ headless: true });
});
after(async () => {
  await browser?.close();
  if (server) await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()));
});

test('department planner portraits load from local demo assets', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    const portrait = page.locator('img[src*="portrait-"]').first();
    await portrait.waitFor();
    await portrait.evaluate(image => image.decode());
    assert.ok(await portrait.evaluate(image => image.naturalWidth > 0));
  } finally { await page.close(); }
});

test('line details show the assigned planner', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Workshop Safety Shoes', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('heading', { name: /Workshop Safety Shoes/ }).waitFor();
    assert.match(await dialog.innerText(), /Keira Voss/);
    if (process.env.DEMO_SCREENSHOT_PATH) await page.screenshot({ path: process.env.DEMO_SCREENSHOT_PATH });
  } finally { await page.close(); }
});

test('shared search shortcut focuses forecast search', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.locator('.rv-search-action-bar').waitFor();
    await page.keyboard.press('/');
    assert.equal(await page.getByRole('searchbox').evaluate(node => node === document.activeElement), true);
    await page.keyboard.type('Folding Stools');
    await page.getByRole('button', { name: 'Edit line · Folding Stools' }).waitFor();
  } finally { await page.close(); }
});

test('department rails fill their cells when expanded and collapsed', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.getByText('Coastal Walking Shoes', { exact: true }).waitFor();
    const assertRailFits = async () => {
      const edges = await page.locator('.forecast-department-card').first().evaluate(rail => {
        const cell = rail.closest('.rgCell').getBoundingClientRect();
        const bounds = rail.getBoundingClientRect();
        return { left: bounds.left - cell.left, right: cell.right - bounds.right };
      });
      assert.ok(Math.abs(edges.left) < 1 && Math.abs(edges.right) < 1, `rail gaps: ${JSON.stringify(edges)}`);
    };
    await assertRailFits();
    await page.getByRole('button', { name: 'Collapse department Footwear' }).click();
    await page.getByText('Coastal Walking Shoes', { exact: true }).waitFor({ state: 'hidden' });
    await assertRailFits();
  } finally { await page.close(); }
});

test('department and group cells retain their boundary lines', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    await page.goto(url);
    for (const selector of ['.forecast-department-card', '.forecast-name--group']) {
      const cell = page.locator(selector).first().locator('..');
      await cell.waitFor();
      assert.deepEqual(await cell.evaluate(element => {
        const style = getComputedStyle(element, '::after');
        return [style.borderRightWidth, style.borderBottomWidth, style.pointerEvents];
      }), ['1px', '1px', 'none']);
    }
    if (process.env.DEMO_SCREENSHOT_PATH) await page.screenshot({ path: process.env.DEMO_SCREENSHOT_PATH });
  } finally { await page.close(); }
});

test('forecast figures, growth controls, rail and missing plan follow the sample', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    page.setDefaultTimeout(10000);
    await page.goto(url);
    await page.getByText('Coastal Walking Shoes', { exact: true }).waitFor();
    assert.match(await page.locator('.summary-group--actual').innerText(), /\$31\.6M\s*\+11\.7% on FY25/);
    assert.match(await page.locator('.summary-group--projected').innerText(), /\$14\.5M\s*\+10\.5% on FY25/);
    assert.match(await page.locator('.summary-group--outlook').innerText(), /97\.8%\s*−\$1\.0M/);
    assert.equal(await page.locator('.rv-metric-tile--summary').count(), 3);
    assert.equal(await page.locator('.rv-dotted-comparison__column').count(), 12);
    assert.equal(await page.locator('.rv-dotted-comparison__marker').count(), 12);
    assert.ok(await page.locator('.rv-stacked-dot-plot__point').count() > 0);
    const card = page.locator('.forecast-department-card').first();
    const label = card.locator('.forecast-rail-label');
    assert.equal(await label.evaluate(node => getComputedStyle(node).writingMode), 'horizontal-tb');
    assert.deepEqual(await card.locator('dt').allTextContents(), ['Forecast', 'Outlook', 'Plan']);
    assert.match(await card.locator('.forecast-ledger-outlook').innerText(), /\$11.9M\s*[-−]1.5%/);
    assert.ok(await card.locator('.forecast-planner').evaluate(node =>
      node.getBoundingClientRect().bottom <= node.parentElement.querySelector('.forecast-growth').getBoundingClientRect().top));
    assert.equal(await page.locator('.rv-bullet-chart__empty').first().innerText(), 'No plan');
    assert.match(await page.locator('.rv-bullet-chart__empty').first().locator('..').evaluate((cell) => getComputedStyle(cell).backgroundImage), /repeating-linear-gradient/);
    const slider = page.getByRole('slider', { name: 'Footwear Growth assumption' });
    const scenario = page.getByRole('group', { name: 'Scenario impact' });
    assert.match(await scenario.innerText(), /0 affected lines/);
    assert.equal(await slider.getAttribute('min'), '-20');
    assert.equal(await slider.getAttribute('max'), '20');
    await slider.fill('20');
    await page.waitForFunction(() => document.querySelector('.summary-group--projected strong')?.textContent !== '$14.5M');
    await page.waitForFunction(() => !document.querySelector('.forecast-scenario')?.textContent?.includes('0 affected lines'));
    await page.getByRole('button', { name: 'Save Footwear Growth assumption' }).click();
    await page.getByText('0 affected lines', { exact: true }).waitFor();
    assert.notEqual((await page.locator('.summary-group--projected strong').innerText()), '$14.5M');
    assert.equal(await page.getByRole('button', { name: 'Collapse department Footwear' }).locator('.rv-expand-icon.is-collapse').count(), 1);
    await page.getByRole('button', { name: 'Collapse department Footwear' }).click();
    await page.getByText('Coastal Walking Shoes', { exact: true }).waitFor({ state: 'hidden' });
    assert.equal(await page.getByRole('button', { name: 'Expand department Footwear' }).locator('.rv-expand-icon.is-expand').count(), 1);
    await page.getByRole('button', { name: 'Expand department Footwear' }).click();
    await page.getByText('Coastal Walking Shoes', { exact: true }).waitFor();
    await page.getByRole('searchbox').fill('Folding Stools');
    const action = page.getByRole('button', { name: 'Edit line · Folding Stools' });
    assert.equal(await action.locator('svg path').count(), 1);
    assert.equal(await action.locator('svg').evaluate(node => node.closest('[aria-hidden]')?.getAttribute('aria-hidden')), 'true');
    await action.click();
    const dialog = page.getByRole('dialog');
    assert.equal(await dialog.getByRole('combobox', { name: 'Last Month' }).getAttribute('data-value'), '9');
    await dialog.getByRole('combobox', { name: 'Last Month' }).click();
    await page.locator('[role=option][data-value="8"]:visible').click();
    await dialog.getByRole('button', { name: 'Save' }).click();
    const chair = await page.locator('revo-grid').evaluate((grid) => grid.source.find((row) => row.label === 'Folding Stools'));
    assert.equal(chair.Jul, 92000);
    assert.equal(chair.Aug, 0);
  } finally {
    await page.close();
  }
});

test('line profile follows forecast state, supports navigation, month detail and editing', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Coastal Walking Shoes', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('heading', { name: /Coastal Walking Shoes/ }).waitFor();
    assert.match(await dialog.innerText(), /99\.5%[\s\S]*\$2,017,200[\s\S]*\$9,800/);
    const navigation = dialog.getByRole('group', { name: '1 of 22' });
    assert.equal(await navigation.getByRole('button').count(), 2);
    const geometry = await navigation.evaluate(root => {
      const bounds = root.getBoundingClientRect();
      return [...root.children].map(child => {
        const rect = child.getBoundingClientRect();
        return { top: rect.top - bounds.top, bottom: bounds.bottom - rect.bottom, border: getComputedStyle(child).borderTopWidth };
      });
    });
    for (const part of geometry) {
      assert.ok(Math.abs(part.top - 1) < 1 && Math.abs(part.bottom - 1) < 1, JSON.stringify(geometry));
      assert.equal(part.border, '0px');
    }
    assert.equal(await navigation.getByRole('button', { name: 'Previous line' }).isDisabled(), true);
    await dialog.getByRole('tab', { name: 'By Month' }).click();
    assert.match(await dialog.getByRole('table').innerText(), /Jul 2026 Forecast[\s\S]*\+5\.0%/);
    await dialog.getByRole('button', { name: 'Next line' }).click();
    assert.match(await dialog.innerText(), /2 of 22/);
    await dialog.getByRole('button', { name: 'Previous line' }).click();
    await dialog.getByRole('button', { name: 'Edit', exact: true }).click();
    await dialog.getByLabel('Line name').fill('Updated Boots');
    await dialog.getByRole('button', { name: 'Save Changes', exact: true }).click();
    assert.match(await dialog.innerText(), /Updated Boots/);
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  } finally {
    await page.close();
  }
});

test('line details describe new, unplanned and exiting forecasts accurately', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    const dialog = page.getByRole('dialog');
    await page.getByRole('button', { name: 'Junior Rain Boots', exact: true }).click();
    assert.match(await dialog.innerText(), /RDF-0005[\s\S]*Short of plan[\s\S]*FY25\s+None[\s\S]*Short by\s+\$103,900[\s\S]*Average month to date[\s\S]*None, no FY25 base/);
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Cycling Jerseys', exact: true }).click();
    assert.match(await dialog.innerText(), /No FY26 plan set yet\./);
    await dialog.getByRole('button', { name: 'Set Plan' }).click();
    assert.equal(await dialog.getByLabel('FY26 sales plan').inputValue(), '0');
    assert.equal(await dialog.getByLabel('FY26 sales plan').evaluate(node => node.classList.contains('rv-control')), true);
    assert.equal(await dialog.getByLabel('Line name').evaluate(node => node.classList.contains('rv-control')), true);
    await dialog.getByRole('button', { name: 'Back', exact: true }).click();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Folding Stools', exact: true }).click();
    assert.match(await dialog.innerText(), /RDF-0016[\s\S]*Last month\s+Aug 2026/);
  } finally {
    await page.close();
  }
});

test('forecast controls use shared dropdowns and release menus when closed', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(url);
    await page.getByText('Coastal Walking Shoes', { exact: true }).waitFor();
    assert.equal(await page.locator('.forecast select').count(), 0);
    await page.getByRole('button', { name: 'Coastal Walking Shoes', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Edit', exact: true }).click();
    assert.equal(await dialog.locator('select').count(), 0);
    await dialog.getByRole('combobox', { name: 'Status' }).click();
    await page.getByRole('option', { name: 'Exit', exact: true }).click();
    await dialog.getByRole('combobox', { name: 'Last Month' }).waitFor();
    await dialog.getByRole('combobox', { name: 'Planner' }).click();
    await page.getByRole('listbox').waitFor();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(await page.getByRole('listbox').count(), 0);
  } finally { await page.close(); }
});

test('fiscal months are generated in order and survive period changes', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  try {
    await page.goto(url);
    await page.getByText('Coastal Walking Shoes', { exact: true }).waitFor();
    const expected = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
    const generated = async () => (await page.locator('revo-grid').evaluate(grid => grid.getColumns())).filter(column => expected.includes(column.prop)).map(column => column.prop);
    assert.deepEqual(await generated(), expected);
    const columns = await page.locator('revo-grid').evaluate(grid => grid.getColumns());
    assert.equal(columns.find(column => column.prop === 'Nov').dateSlot.date, '2025-11-01');
    assert.equal(columns.find(column => column.prop === 'Oct').dateSlot.date, '2026-10-01');
    await page.locator('.forecast-month-header[aria-label="Jun: Actual"]').waitFor({ state: 'attached' });
    await page.locator('.forecast-month-header[aria-label="Jul: Forecast"]').waitFor({ state: 'attached' });
    await page.getByRole('combobox', { name: 'Actuals through' }).click();
    await page.getByRole('option', { name: 'May 2026', exact: true }).click();
    await page.getByText(/actuals to May/i).first().waitFor();
    await page.locator('.forecast-month-header[aria-label="May: Actual"]').waitFor({ state: 'attached' });
    await page.locator('.forecast-month-header[aria-label="Jun: Forecast"]').waitFor({ state: 'attached' });
    assert.deepEqual(await generated(), expected);
  } finally { await page.close(); }
});

test('merged department content scrolls continuously through virtual row boundaries', async () => {
  const page = await browser.newPage({ viewport: { width: 760, height: 900 } });
  try {
    await page.goto(url);
    await page.getByText('Coastal Walking Shoes', { exact: true }).waitFor();
    const grid = page.locator('.forecast-grid');
    const box = await grid.boundingBox();
    await page.mouse.move(box.x + 300, box.y + 300);
    const offsets = async () => page.locator('.forecast-department-card').first().evaluate(card => {
      const data = card.closest('revogr-data');
      const rail = card.querySelector('.forecast-rail-content');
      return {
        card: card.getBoundingClientRect().top - data.getBoundingClientRect().top,
        rail: rail.getBoundingClientRect().top - card.getBoundingClientRect().top,
      };
    });
    const initial = await offsets();
    for (const direction of [1, -1]) {
      for (let i = 0; i < 5; i++) {
        await page.mouse.wheel(0, direction * 30);
        await page.waitForTimeout(100);
        const current = await offsets();
        assert.ok(Math.abs(current.card - initial.card) < 1, 'merged cell should not jump at a virtual row boundary');
        assert.ok(Math.abs(current.rail - initial.rail) < 1, 'department label should not jump at a virtual row boundary');
      }
    }
  } finally { await page.close(); }
});

test('heatmap highlights generated month cells and updates the domain', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    const heat = page.locator('.forecast-heat').first();
    await heat.waitFor();
    const colors = () => page.locator('.forecast-heat').evaluateAll(nodes => nodes.map(node => node.closest('.rgCell').style.backgroundColor));
    await page.waitForFunction(() => !!document.querySelector('.forecast-heat')?.closest('.rgCell')?.style.backgroundColor, null, { timeout: 5000 });
    const allColors = await colors();
    assert.ok(allColors.every(color => /color-mix|oklab|rgba|rgb/.test(color)));
    assert.equal(await page.locator('.forecast-share').first().evaluate(node => node.closest('.rgCell').style.backgroundColor), '');
    assert.equal(await page.locator('.forecast-missing').first().evaluate(node => node.closest('.rgCell').style.backgroundColor), '');
    await page.getByRole('combobox', { name: 'Heat scale' }).click();
    await page.getByRole('option', { name: 'Within Department', exact: true }).click();
    await page.waitForFunction(previous => [...document.querySelectorAll('.forecast-heat')].some((node, index) => node.closest('.rgCell').style.backgroundColor !== previous[index]), allColors);
    assert.notDeepEqual(await colors(), allColors);
  } finally { await page.close(); }
});

test('collapsed departments keep names and growth fully visible', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.getByText('Coastal Walking Shoes', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Collapse all', exact: true }).click();
    const cards = page.locator('.forecast-department-card.is-collapsed');
    await page.waitForFunction(() => document.querySelectorAll('.forecast-department-card.is-collapsed').length === 4);
    assert.equal(await cards.count(), 4);
    for (const card of await cards.all()) {
      const geometry = await card.evaluate(node => {
        const box = node.getBoundingClientRect();
        const label = node.querySelector('.forecast-rail-label').getBoundingClientRect();
        const growth = node.querySelector('.forecast-growth-number').getBoundingClientRect();
        return { box: { top: box.top, bottom: box.bottom }, label: { top: label.top, bottom: label.bottom }, growth: { top: growth.top, bottom: growth.bottom } };
      });
      assert.ok(geometry.label.top >= geometry.box.top && geometry.label.bottom <= geometry.box.bottom, 'department name fits inside its row');
      assert.ok(geometry.growth.top >= geometry.box.top && geometry.growth.bottom <= geometry.box.bottom, 'growth value fits inside its row');
      assert.ok(Math.abs((geometry.label.top + geometry.label.bottom) - (geometry.growth.top + geometry.growth.bottom)) < 2, 'name and growth share a vertical center');
    }
    await page.getByRole('button', { name: 'Expand department Footwear' }).click();
    await page.getByText('Coastal Walking Shoes', { exact: true }).waitFor();
  } finally { await page.close(); }
});


test('live growth slider supports dragging, keyboard, save and revert', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.getByText('Coastal Walking Shoes', { exact: true }).waitFor();
    const slider = page.getByRole('slider', { name: 'Footwear Growth assumption' });
    const before = await page.locator('.summary-group--projected strong').innerText();
    const box = await slider.boundingBox(), y = box.y + box.height / 2;
    await page.mouse.move(box.x + box.width * .625, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * .9, y, { steps: 8 });
    await page.waitForFunction(initial => document.querySelector('.summary-group--projected strong')?.textContent !== initial, before);
    await page.mouse.up();
    assert.ok(Number(await slider.inputValue()) > 5);
    for (const name of ['Save Footwear Growth assumption', 'Revert Footwear Growth assumption']) {
      const control = page.getByRole('button', { name });
      assert.equal(await control.evaluate(node => node.classList.contains('rv-btn')), true);
      assert.ok(await control.evaluate(node => parseFloat(getComputedStyle(node).borderRadius)) > 0);
    }
    await page.getByRole('button', { name: 'Revert Footwear Growth assumption' }).click();
    await page.waitForFunction(() => document.querySelector('input[aria-label="Footwear Growth assumption"]')?.value === '5');
    assert.equal(await page.locator('.summary-group--projected strong').innerText(), before);
    await slider.focus();
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
    assert.equal(await slider.inputValue(), '8');
    assert.equal(await slider.evaluate(node => node === document.activeElement), true);
    await page.getByRole('button', { name: 'Save Footwear Growth assumption' }).click();
    await page.getByRole('button', { name: 'Revert Footwear Growth assumption' }).waitFor({ state: 'hidden' });
    assert.equal(await page.getByRole('button', { name: 'Revert Footwear Growth assumption' }).count(), 0);
    assert.equal(await slider.inputValue(), '8');
  } finally { await page.close(); }
});

test('add actions insert and focus editable rows in the right department', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url); await page.getByText('Coastal Walking Shoes', { exact: true }).waitFor();
    const grid = page.locator('revo-grid').first();
    await page.getByRole('button', { name: 'Collapse department Camp' }).click();
    const add = page.locator('.forecast-name--group').getByRole('button', { name: 'Add Line · Camp' });
    await add.hover();
    await add.evaluate(element => element.getAnimations().forEach(animation => animation.finish()));
    assert.notEqual(await add.evaluate(element => getComputedStyle(element).backgroundColor), 'rgba(0, 0, 0, 0)');
    await add.click();
    const input = page.getByRole('textbox', { name: 'Line name' });
    await input.waitFor();
    await page.waitForFunction(() => document.activeElement?.classList.contains('forecast-line-input'));
    assert.equal(await input.evaluate(node => node.selectionStart === 0 && node.selectionEnd === node.value.length), true);
    assert.equal(await grid.evaluate(node => node.source.find(row => row.line?.name === 'New Line')?.department), 'Camp');
    await input.fill('Field Test'); await input.press('Enter');
    await page.getByRole('button', { name: 'Field Test', exact: true }).waitFor();
    assert.equal(await grid.evaluate(node => node.source.find(row => row.label === 'Field Test')?.line?.department), 'Camp');
    const toast = page.locator('.rv-toast').filter({ hasText: 'Field Test added.' });
    await toast.waitFor();
    assert.equal(await page.locator('.forecast-notice').count(), 0);
    await toast.getByRole('button', { name: 'Undo' }).click();
    await page.waitForFunction(() => !document.querySelector('revo-grid').source.some(row => row.label === 'Field Test'));
    await page.getByRole('button', { name: 'Add Line', exact: true }).click();
    const next = page.getByRole('textbox', { name: 'Line name' }); await next.waitFor();
    await next.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.forecast-line-input'));
    assert.equal(await grid.evaluate(node => node.source.some(row => row.label === 'New Line')), false);
    const search = page.getByRole('searchbox');
    await search.fill('Folding Stools');
    await page.locator('.forecast-name--group').getByRole('button', { name: 'Add Line · Camp' }).click();
    const filteredDraft = page.getByRole('textbox', { name: 'Line name' });
    await filteredDraft.waitFor();
    assert.equal(await search.inputValue(), '');
    await filteredDraft.press('Escape');
  } finally { await page.close(); }
});

test('compact growth slider previews changes and cancel restores them', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(url); await page.getByText('Coastal Walking Shoes', { exact: true }).waitFor();
    const grid = page.locator('revo-grid').first();
    const value = () => grid.evaluate(node => node.source.find(row => row.label === 'Coastal Walking Shoes').reading.forecast);
    const initial = await value();
    await page.getByRole('button', { name: 'Footwear Growth assumption' }).click();
    const dialog = page.getByRole('dialog');
    const growthSlider = dialog.getByRole('slider', { name: 'Growth assumption' });
    assert.equal(await growthSlider.evaluate(node => node.classList.contains('rv-native-slider')), true);
    await growthSlider.fill('20');
    await page.waitForFunction(original => document.querySelector('revo-grid')?.source.find(row => row.label === 'Coastal Walking Shoes')?.reading.forecast !== original, initial);
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.waitForFunction(original => document.querySelector('revo-grid')?.source.find(row => row.label === 'Coastal Walking Shoes')?.reading.forecast === original, initial);
    assert.equal(await value(), initial);
    await page.getByRole('button', { name: 'Add Line', exact: true }).click();
    const input = page.getByRole('textbox', { name: 'Line name' });
    await input.waitFor();
    await page.waitForFunction(() => document.activeElement?.classList.contains('forecast-line-input'));
    await input.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.forecast-line-input'));
  } finally { await page.close(); }
});

test('forecast headers open the shared column menu', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    await page.locator('.rgHeaderCell').filter({ hasText: 'Line' }).first().click();
    await page.locator('.rv-context-menu:visible').getByRole('menuitem', { name: 'Copy options' }).waitFor();
  } finally { await page.close(); }
});

test('summary charts show current overall and prior-year values on hover and focus', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    for (const kind of ['actual', 'projected']) {
      const group = page.locator(`.summary-group--${kind}`);
      const colors = await group.evaluate(element => ({
        label: getComputedStyle(element.querySelector('.rv-metric-tile__label'), '::before').backgroundColor,
        bar: getComputedStyle(element.querySelector('.rv-dotted-comparison__bar')).backgroundImage,
        reference: getComputedStyle(element.querySelector('.rv-dotted-comparison__marker')).backgroundColor,
      }));
      assert.ok(colors.bar.includes(colors.label), `${kind} dots should match their summary marker`);
      assert.equal(colors.reference, 'rgb(115, 115, 115)', 'prior-year line should match the neutral legend');
    }
    const december = page.getByRole('button', { name: 'Dec 2025, every line in view' });
    await december.waitFor();
    await december.hover();
    const tooltip = page.getByRole('tooltip');
    await tooltip.waitFor();
    assert.match(await tooltip.innerText(), /Dec 2025, every line in view[\s\S]*Actual[\s\S]*FY26\s+\$4,353,200[\s\S]*FY25\s+\$3,764,700[\s\S]*vs last year\s+\+15\.6%/);
    await page.mouse.move(1, 1);
    await tooltip.waitFor({ state: 'hidden' });
    await december.focus();
    await tooltip.waitFor({ state: 'visible' });
    await page.keyboard.press('Escape');
    await tooltip.waitFor({ state: 'hidden' });
    const july = page.getByRole('button', { name: 'Jul 2026, every line in view' });
    await july.hover();
    await tooltip.waitFor({ state: 'visible' });
    assert.match(await tooltip.innerText(), /Jul 2026[\s\S]*Forecast[\s\S]*FY26[\s\S]*FY25/);
    await page.mouse.move(1, 1);
    await tooltip.waitFor({ state: 'hidden' });
    const overall = page.locator('.rv-stacked-dot-plot');
    await overall.focus();
    await tooltip.waitFor({ state: 'visible' });
    assert.match(await tooltip.innerText(), /Outlook vs Plan[\s\S]*Planned outlook[\s\S]*Plan[\s\S]*On plan/);
    await page.keyboard.press('Escape');
    await page.getByRole('searchbox').fill('Folding Stools');
    await page.getByRole('button', { name: 'Edit line · Folding Stools' }).waitFor();
    await december.hover();
    await tooltip.waitFor({ state: 'visible' });
    assert.doesNotMatch(await tooltip.innerText(), /\$4,353,200/);
  } finally { await page.close(); }
});

test('forecast outlook dots show individual line details on hover and focus', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    await page.goto(url);
    const plot = page.locator('.rv-stacked-dot-plot');
    const dot = plot.getByRole('button', { name: /^Coastal Walking Shoes, Footwear,/ });
    await dot.scrollIntoViewIfNeeded();
    await dot.hover();
    const tip = page.getByRole('tooltip');
    await tip.getByText('Coastal Walking Shoes', { exact: true }).waitFor();
    assert.equal(await tip.getByText('Coastal Walking Shoes', { exact: true }).evaluate(el => getComputedStyle(el).fontWeight), '500');
    assert.match(await tip.innerText(), /Footwear[\s\S]*Outlook\s*\$2,017,200[\s\S]*Plan\s*\$2,027,000[\s\S]*Attainment\s*99\.5%/);
    await dot.evaluate(el => el.getAnimations().forEach(animation => animation.finish()));
    assert.match(await dot.evaluate(el => getComputedStyle(el).transform), /^matrix\(2,/);
    assert.equal(await dot.evaluate(el => getComputedStyle(el).boxShadow), 'none');
    await page.mouse.move(0, 0);
    await tip.waitFor({ state: 'hidden' });
    await dot.focus();
    await tip.getByText('Coastal Walking Shoes', { exact: true }).waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('searchbox').fill('Folding Stools');
    const filtered = plot.getByRole('button', { name: /^Folding Stools, Camp,/ });
    await filtered.focus();
    await tip.getByText('Folding Stools', { exact: true }).waitFor();
    assert.equal(await plot.locator('button[data-point-index]').count(), 1);
  } finally { await page.close(); }
});

test('grid outlook tooltip shows current row figures on hover and focus', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    await page.goto(url);
    const chart = page.locator('[data-tooltip*="Coastal Walking Shoes, FY26 outlook"]').first();
    await chart.hover();
    const tooltip = page.getByRole('tooltip');
    await tooltip.waitFor();
    const content = await tooltip.innerText();
    assert.match(content, /Coastal Walking Shoes, FY26 outlook/);
    assert.match(content, /Actual to Jun, then the forecast/);
    assert.match(content, /Plan\s*\$2,027,000/);
    assert.match(content, /Actual\s*\$1\.38M, 68%/);
    assert.match(content, /Outlook\s*\$2M, 99\.5%/);
    assert.match(content, /FY25\s*\$1\.89M, 93%/);
    await page.mouse.move(0, 0);
    await chart.focus();
    await tooltip.waitFor();
    await page.keyboard.press('Escape');
    await tooltip.waitFor({ state: 'hidden' });
  } finally {
    await page.close();
  }
});

test('columns open as an anchored popup without a modal backdrop', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url);
    const button = page.getByRole('button', { name: 'Columns', exact: true });
    await button.click();
    const popup = page.locator('.rv-column-dialog--popover:visible');
    await popup.waitFor();
    assert.equal(await page.locator('dialog.rv-column-dialog[open]').count(), 0);
    const trigger = await button.boundingBox();
    const box = await popup.boundingBox();
    assert.ok(Math.abs(box.y - (trigger.y + trigger.height)) < 30);
    await page.keyboard.press('Escape');
    await popup.waitFor({ state: 'hidden' });
  } finally { await page.close(); }
});


test('line column uses spare width and stays aligned with the forecast summary', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  try {
    await page.goto(url);
    await page.getByText('Coastal Walking Shoes', { exact: true }).waitFor();
    await page.waitForFunction(async () => [...document.querySelectorAll('revo-grid .rgHeaderCell')].find(cell => cell.textContent.trim() === 'Line')?.getBoundingClientRect().width > 156);
    const measure = async () => page.evaluate(() => {
      const legend = document.querySelector('.forecast-legend').getBoundingClientRect();
      const month = document.querySelector('.rgHeaderCell .forecast-month-header[aria-label^="Nov:"]').closest('.rgHeaderCell').getBoundingClientRect();
      return Math.abs(legend.right - month.left);
    });
    assert.ok(await measure() < 2, 'summary starts at the first month');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(async () => [...document.querySelectorAll('revo-grid .rgHeaderCell')].find(cell => cell.textContent.trim() === 'Line')?.getBoundingClientRect().width === 183);
    assert.ok(await measure() < 2, 'summary remains aligned on mobile');
  } finally { await page.close(); }
});

test('stretched forecast leaves room for the vertical scrollbar', async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  try {
    await page.goto(url);
    await page.getByText('Coastal Walking Shoes', { exact: true }).waitFor();
    await page.waitForFunction(async () => {
      const grid = document.querySelector('revo-grid');
      const bar = grid.querySelector('revogr-scroll-virtual.horizontal');
      return bar && bar.scrollWidth <= bar.clientWidth;
    });
    const horizontal = page.locator('revo-grid revogr-scroll-virtual.horizontal');
    assert.equal(await horizontal.evaluate(node => node.scrollWidth <= node.clientWidth), true);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => { const node = document.querySelector('revo-grid revogr-scroll-virtual.horizontal'); return node.scrollWidth > node.clientWidth; });
  } finally { await page.close(); }
});
