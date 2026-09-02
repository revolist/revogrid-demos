import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { afterEach, test } from 'node:test';
import { transformWithEsbuild } from 'vite';

globalThis.window = {
  setTimeout: globalThis.setTimeout.bind(globalThis),
};

const source = await readFile(new URL('../src/sys-data/hr.data.ts', import.meta.url), 'utf8');
const { code } = await transformWithEsbuild(source, 'hr.data.ts', {
  format: 'esm',
  loader: 'ts',
  target: 'esnext',
});
const {
  getHRColumnsCount,
  getHRCompanyOption,
  getHRData,
  getHRMonthColumns,
  getHRVisibleColumnsCount,
  HR_COMPANY_OPTIONS,
  HR_OPTIONS,
  resetHRDataCache,
} = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
);

afterEach(() => resetHRDataCache());

test('generated rows reuse company avatar metadata from dropdown options', async () => {
  const rows = await getHRData(HR_COMPANY_OPTIONS.length);

  for (const [index, option] of HR_COMPANY_OPTIONS.entries()) {
    assert.equal(rows[index].company, option.value);
    assert.deepEqual(rows[index].companyAvatar, option.companyAvatar);
  }
});

test('company avatar metadata follows an edited company value', () => {
  const previousRow = {
    company: 'Northstar',
    companyAvatar: getHRCompanyOption('Northstar').companyAvatar,
  };
  const editedCompany = 'Acme';

  assert.notDeepEqual(previousRow.companyAvatar, getHRCompanyOption(editedCompany).companyAvatar);
  assert.deepEqual(
    getHRCompanyOption(editedCompany).companyAvatar,
    HR_COMPANY_OPTIONS.find(option => option.value === editedCompany).companyAvatar,
  );
});

test('data source options expose the requested row and total-column dimensions', () => {
  assert.deepEqual(HR_OPTIONS.map(option => option.label), [
    '100 rows × 1,000 columns',
    '1,000 rows × 100 columns',
    '10,000 rows × 100 columns',
    '100,000 rows × 100 columns',
    '1,000,000 rows × 10 columns',
  ]);
  assert.deepEqual(HR_OPTIONS.map(option => getHRVisibleColumnsCount(option.value)), [
    1_000, 100, 100, 100, 10,
  ]);
  assert.deepEqual(HR_OPTIONS.map(option => getHRColumnsCount(option.value)), [
    993, 93, 93, 93, 3,
  ]);
});

test('generated rows expose the selected monthly range instead of synthetic metrics', async () => {
  const [row] = await getHRData(1);
  const monthColumns = getHRMonthColumns(getHRColumnsCount(1));

  assert.equal(monthColumns.length, 993);
  assert.equal(monthColumns[0].label, 'Jan 2026');
  assert.equal(monthColumns.at(-1).label, 'Sep 2108');
  assert.ok(monthColumns.every(month => typeof row[month.prop] === 'number'));
  assert.equal('metric1' in row, false);
});

test('resets cached rows when the workload column shape changes', async () => {
  const [wideRow] = await getHRData(100);
  const [balancedRow] = await getHRData(1_000);

  assert.notEqual(balancedRow, wideRow);
  assert.equal('hours210809' in wideRow, true);
  assert.equal('hours210809' in balancedRow, false);
  assert.equal('hours203309' in balancedRow, true);
});

test('reuses rows that were already prepared', async () => {
  let timerCalls = 0;
  const nativeSetTimeout = globalThis.setTimeout.bind(globalThis);
  window.setTimeout = (callback, delay) => {
    timerCalls += 1;
    return nativeSetTimeout(callback, delay);
  };

  const first = await getHRData(1_000);
  const yieldsAfterFirstLoad = timerCalls;
  const second = await getHRData(1_000);

  assert.deepEqual(first, second);
  assert.equal(timerCalls, yieldsAfterFirstLoad);
});

test('reports completion and returns stable cached row identities', async () => {
  const progress = [];
  const first = await getHRData(100, { onProgress: value => progress.push(value) });
  const larger = await getHRData(200, { onProgress: value => progress.push(value) });

  assert.equal(larger[0], first[0]);
  assert.deepEqual(progress.at(-1), { loaded: 200, total: 200 });
});

test('rejects an aborted preparation request without extending the cache', async () => {
  const controller = new AbortController();
  controller.abort();

  await assert.rejects(getHRData(100, { signal: controller.signal }), { name: 'AbortError' });
  assert.equal((await getHRData(1)).length, 1);
});
