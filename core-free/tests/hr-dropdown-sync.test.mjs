import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { transformWithEsbuild } from 'vite';

const hrDataSource = await readFile(new URL('../src/sys-data/hr.data.ts', import.meta.url), 'utf8');
const { code: hrDataCode } = await transformWithEsbuild(hrDataSource, 'hr.data.ts', {
  format: 'esm',
  loader: 'ts',
  target: 'esnext',
});
const hrDataUrl = `data:text/javascript;base64,${Buffer.from(hrDataCode).toString('base64')}`;
const columnsSource = (await readFile(new URL('../src/sys-data/hr.columns.ts', import.meta.url), 'utf8'))
  .replace("'./hr.data'", `'${hrDataUrl}'`);
const { code } = await transformWithEsbuild(columnsSource, 'hr.columns.ts', {
  format: 'esm',
  loader: 'ts',
  target: 'esnext',
});
const columnsUrl = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
const { getBaseHRColumns, getExtraHRColumns } = await import(columnsUrl);
const rendererSource = (await readFile(new URL('../src/hr-company-avatar.ts', import.meta.url), 'utf8'))
  .replace("'./sys-data/hr.data'", `'${hrDataUrl}'`);
const { code: rendererCode } = await transformWithEsbuild(rendererSource, 'hr-company-avatar.ts', {
  format: 'esm',
  loader: 'ts',
  target: 'esnext',
});
const { renderHrCompanyCell } = await import(
  `data:text/javascript;base64,${Buffer.from(rendererCode).toString('base64')}`
);
const ageRendererSource = (await readFile(new URL('../src/hr-age-indicator.ts', import.meta.url), 'utf8'))
  .replace("'./sys-data/hr.columns'", `'${columnsUrl}'`);
const { code: ageRendererCode } = await transformWithEsbuild(ageRendererSource, 'hr-age-indicator.ts', {
  format: 'esm',
  loader: 'ts',
  target: 'esnext',
});
const { renderHrAgeCell } = await import(
  `data:text/javascript;base64,${Buffer.from(ageRendererCode).toString('base64')}`
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
    const source = await readFile(new URL(`../src/${variant}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /createHRColorSelectColumnType/);
    assert.match(source, /colorSelect:\s*new SelectCol(?:\.default)?\(/);
  }
});

test('all framework variants render company-owned avatar data', async () => {
  assert.match(hrDataSource, /companyAvatar/);
  assert.match(rendererSource, /getHRCompanyOption\(value\)/);

  for (const variant of variants) {
    const source = await readFile(new URL(`../src/${variant}`, import.meta.url), 'utf8');
    assert.match(source, /renderHrCompanyCell/);
    assert.doesNotMatch(source, /props\.model\.avatar/);
  }
});

test('all framework variants use the shared age indicator renderer', async () => {
  for (const variant of variants) {
    const source = await readFile(new URL(`../src/${variant}`, import.meta.url), 'utf8');
    assert.match(source, /import \{ renderHrAgeCell \} from '\.\/hr-age-indicator';/);
    assert.match(source, /ageCol\.cellTemplate = renderHrAgeCell;/);
  }
});

test('clearing an age value removes its status dot', () => {
  const h = (tag, props, children) => ({ tag, props, children });

  for (const value of ['', '   ', null, undefined]) {
    assert.deepEqual(renderHrAgeCell(h, { model: { age: value }, value }), []);
  }

  const zeroAge = renderHrAgeCell(h, { model: { age: 0 }, value: 0 });
  assert.equal(zeroAge.length, 2);
  assert.equal(zeroAge[0].props.class, 'hr-circle');
  assert.equal(zeroAge[1], '0');
});

test('clearing a company value removes its stale row avatar', () => {
  const h = (tag, props, children) => ({ tag, props, children });
  const cell = renderHrCompanyCell(h, {
    model: {
      company: '',
      companyAvatar: { initials: 'IN', color: '#9333ea' },
    },
    value: '',
  });

  assert.deepEqual(cell.children, []);
});
