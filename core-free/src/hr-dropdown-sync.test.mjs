import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { transformWithEsbuild } from 'vite';

const hrDataSource = await readFile(new URL('./sys-data/hr.data.ts', import.meta.url), 'utf8');
const { code: hrDataCode } = await transformWithEsbuild(hrDataSource, 'hr.data.ts', {
  format: 'esm',
  loader: 'ts',
  target: 'esnext',
});
const hrDataUrl = `data:text/javascript;base64,${Buffer.from(hrDataCode).toString('base64')}`;
const columnsSource = (await readFile(new URL('./sys-data/hr.columns.ts', import.meta.url), 'utf8'))
  .replace("'./hr.data'", `'${hrDataUrl}'`);
const { code } = await transformWithEsbuild(columnsSource, 'hr.columns.ts', {
  format: 'esm',
  loader: 'ts',
  target: 'esnext',
});
const { getBaseHRColumns, getExtraHRColumns } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
);

const variants = ['hr.ts', 'hr.react.tsx', 'hr.vue', 'hr.angular.ts'];

test('dropdown-backed HR columns synchronize their cell templates', () => {
  const companies = [
    { label: 'Acme', value: 'Acme', companyAvatar: { initials: 'AC', color: '#0891b2' } },
    { label: 'Globex', value: 'Globex', companyAvatar: { initials: 'GL', color: '#f59e0b' } },
  ];
  const columns = getBaseHRColumns(companies);
  const company = columns[0].children[1];
  const eyeColor = columns[1].children[2];

  assert.equal(company.syncCellTemplate, true);
  assert.equal(company.labelKey, 'label');
  assert.equal(company.valueKey, 'value');
  assert.deepEqual(company.source, companies);
  assert.equal(eyeColor.syncCellTemplate, true);
});

test('large datasets use a grouped monthly column range', () => {
  const [range] = getExtraHRColumns(993);

  assert.equal(range.name, 'Monthly hours');
  assert.equal(range.children.length, 993);
  assert.equal(range.children[0].name, 'Jan 2026');
  assert.equal(range.children.at(-1).name, 'Sep 2108');
  assert.ok(range.children.every(column => column.columnType === 'number'));
  assert.deepEqual(getExtraHRColumns(0), []);
});

test('all framework variants use the stock select editor for color dropdowns', async () => {
  for (const variant of variants) {
    const source = await readFile(new URL(variant, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /createHRColorSelectColumnType/);
    assert.match(source, /colorSelect:\s*new SelectCol(?:\.default)?\(/);
  }
});

test('all framework variants render company-owned avatar data', async () => {
  const rendererSource = await readFile(new URL('./hr-company-avatar.ts', import.meta.url), 'utf8');
  assert.match(hrDataSource, /companyAvatar/);
  assert.match(rendererSource, /getHRCompanyOption\(value\)/);

  for (const variant of variants) {
    const source = await readFile(new URL(variant, import.meta.url), 'utf8');
    assert.match(source, /renderHrCompanyCell/);
    assert.doesNotMatch(source, /props\.model\.avatar/);
  }
});
