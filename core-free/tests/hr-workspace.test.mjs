import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { transformWithEsbuild } from 'vite';

const source = await readFile(new URL('../src/hr-workspace.ts', import.meta.url), 'utf8');
const { code } = await transformWithEsbuild(source, 'hr-workspace.ts', {
  format: 'esm',
  loader: 'ts',
  target: 'esnext',
});
const {
  applyHRWorkspaceToColumns,
  clearHRWorkspace,
  getHRWorkspaceRowCount,
  HR_WORKSPACE_STORAGE_KEY,
  loadHRWorkspace,
} = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

function createStorage(initialValue) {
  const values = new Map(initialValue ? [[HR_WORKSPACE_STORAGE_KEY, initialValue]] : []);
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
}

test('loads valid state and safely ignores invalid storage', () => {
  assert.deepEqual(loadHRWorkspace(createStorage('{"rowCount":1000}')), { rowCount: 1000 });
  assert.deepEqual(loadHRWorkspace(createStorage('{broken')), {});
  assert.deepEqual(loadHRWorkspace(createStorage('null')), {});
});

test('validates saved row counts against the demo choices', () => {
  assert.equal(getHRWorkspaceRowCount({ rowCount: 1000 }, [100, 1000]), 1000);
  assert.equal(getHRWorkspaceRowCount({ rowCount: 999 }, [100, 1000, 10_000]), 10_000);
  assert.equal(getHRWorkspaceRowCount({}, [100, 1000, 10_000]), 10_000);
});

test('reapplies grouped column order, widths, and sorting without losing groups', () => {
  const columns = [
    { name: 'Employee', children: [{ prop: 'name', size: 200 }, { prop: 'company', size: 150 }] },
    { prop: 'salary', size: 120 },
  ];
  const result = applyHRWorkspaceToColumns(columns, {
    columnOrder: ['salary', 'company', 'name'],
    columnWidths: { company: 240 },
    sorting: { columns: [{ prop: 'salary', order: 'desc' }] },
  });

  assert.equal(result[0].prop, 'salary');
  assert.equal(result[0].order, 'desc');
  assert.equal(result[1].name, 'Employee');
  assert.deepEqual(result[1].children.map(column => column.prop), ['company', 'name']);
  assert.equal(result[1].children[0].size, 240);
});

test('clears only the Grid at Scale workspace key', () => {
  const storage = createStorage('{}');
  clearHRWorkspace(storage);
  assert.equal(storage.getItem(HR_WORKSPACE_STORAGE_KEY), null);
});
