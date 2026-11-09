import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { inflateRawSync } from 'node:zlib';

/** Read the generated workbook with built-in Node APIs, independently of its writer. */
function workbookEntries(archive: Buffer) {
  let end = archive.length - 22;
  while (end >= 0 && archive.readUInt32LE(end) !== 0x06054b50) end--;
  expect(end).toBeGreaterThanOrEqual(0);
  const entries = new Map<string, string>();
  let offset = archive.readUInt32LE(end + 16);
  const count = archive.readUInt16LE(end + 10);
  for (let index = 0; index < count; index++) {
    expect(archive.readUInt32LE(offset)).toBe(0x02014b50);
    const compression = archive.readUInt16LE(offset + 10);
    const size = archive.readUInt32LE(offset + 20);
    const nameLength = archive.readUInt16LE(offset + 28);
    const extraLength = archive.readUInt16LE(offset + 30);
    const commentLength = archive.readUInt16LE(offset + 32);
    const localOffset = archive.readUInt32LE(offset + 42);
    const name = archive.subarray(offset + 46, offset + 46 + nameLength).toString();
    const start = localOffset + 30 + archive.readUInt16LE(localOffset + 26) + archive.readUInt16LE(localOffset + 28);
    const compressed = archive.subarray(start, start + size);
    expect([0, 8]).toContain(compression);
    entries.set(name, (compression === 0 ? compressed : inflateRawSync(compressed)).toString());
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

const rowsIn = (sheet: string) => [...sheet.matchAll(/<row\b[^>]*>[\s\S]*?<\/row>/g)].map(match => match[0]);

async function downloadWorkbook(page: import('@playwright/test').Page) {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('customer-analytics.xlsx');
  expect(await download.failure()).toBeNull();
  return workbookEntries(await readFile((await download.path())!));
}

test('ecommerce exports a formatted workbook including every offscreen customer', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.analytics-avatar-select').first()).toBeVisible();
  const workbook = await downloadWorkbook(page);
  const sheet = workbook.get('xl/worksheets/sheet1.xml')!;
  const rows = rowsIn(sheet);
  expect(rows.length).toBeGreaterThanOrEqual(1001);
  // Export all data-source rows, including those that never entered the viewport.
  expect(rows.at(-1)).toMatch(/r="100[12]"/);
  expect([...workbook.values()].join('\n')).toContain('李明');
  expect([...workbook.values()].join('\n')).toContain('Fiona Nguyen');
  expect(sheet).toMatch(/<v>0<\/v>/);
  expect(sheet).toMatch(/<v>-45<\/v>/);
  expect(sheet).not.toMatch(/NaN|Infinity/);
  expect(sheet).toMatch(/<col\b[^>]*width="/);
  expect(workbook.get('xl/styles.xml')).toMatch(/<b\s*\/?\s*>/);
  expect(errors).toEqual([]);
});

test('ecommerce exports only the currently filtered customers', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.analytics-avatar-select').first()).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search customers' }).fill('Fiona');
  await expect.poll(() => page.locator('.analytics-avatar-select').count()).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(async () => (await document.querySelector('revo-grid')!.getVisibleSource()).length)).toBe(153);
  const workbook = await downloadWorkbook(page);
  const sheet = workbook.get('xl/worksheets/sheet1.xml')!;
  // Overview has one header row; full dataset includes a grouped header row.
  expect([154, 155]).toContain(rowsIn(sheet).length);
  expect([...workbook.values()].join('\n')).toContain('Fiona Nguyen');
  expect([...workbook.values()].join('\n')).not.toContain('Marco Lee');
  expect(errors).toEqual([]);
});

test('ecommerce exports all fields with grouped headers and blank nullable values', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.analytics-avatar-select').first()).toBeVisible();
  await page.getByRole('combobox', { name: 'Column view' }).click();
  await page.getByRole('option', { name: 'All fields', exact: true }).click();
  await expect.poll(() => page.evaluate(() => {
    const columns = document.querySelector('revo-grid')!.columns;
    return columns.some(column => 'children' in column);
  })).toBe(true);
  const workbook = await downloadWorkbook(page);
  const sheet = workbook.get('xl/worksheets/sheet1.xml')!;
  const content = [...workbook.values()].join('\n');
  expect(rowsIn(sheet)).toHaveLength(1002);
  expect(sheet).toContain('<mergeCells');
  expect(content).toContain('Personal');
  expect(content).toContain('CUS-1000');
  expect(content).toContain('李明');
  expect(content).not.toMatch(/>(?:null|undefined|NaN|Infinity)</);
  // The first customer's nullable City and Rating produce blank cells, not text.
  const firstCustomer = rowsIn(sheet)[2];
  expect(firstCustomer).toMatch(/<c r="G3"[^>]*\/>/);
  expect(firstCustomer).toMatch(/<c r="I3"[^>]*\/>/);
  expect(errors).toEqual([]);
});
