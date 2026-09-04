import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  createMasterColumns,
  createMasterRowConfig,
  createMasterRows,
  createMasterTreeConfig,
} from '../src/row-master.shared.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../src');
const readSource = file => readFile(join(root, file), 'utf8');

test('portfolio rows form a deterministic hierarchy with expandable leaves', () => {
  const rows = createMasterRows();
  const ids = new Set(rows.map(row => row.id));
  const roots = rows.filter(row => row.parentId === null);
  const leaves = rows.filter(row => !rows.some(candidate => candidate.parentId === row.id));

  assert.equal(rows.length, 14);
  assert.equal(roots.length, 3);
  assert.ok(rows.filter(row => row.parentId !== null).every(row => ids.has(row.parentId)));
  assert.ok(leaves.length >= 7);
  assert.notStrictEqual(createMasterRows()[0], rows[0]);
});

test('shared configuration uses direct Tree and Row Master contracts', () => {
  const rows = createMasterRows();
  const columns = createMasterColumns(rows);
  const tree = createMasterTreeConfig();
  const masterRow = createMasterRowConfig(0);

  assert.equal(columns.length, 8);
  assert.equal(columns[0].tree, true);
  assert.equal(tree.expandAll, true);
  assert.equal(tree.idField, 'id');
  assert.equal(masterRow.rowHeight, 340);
  assert.equal(typeof masterRow.template, 'function');
});

test('all framework variants preserve plugin composition and lifecycle conventions', async () => {
  const [typescript, react, vue, angular] = await Promise.all([
    readSource('row-master.ts'),
    readSource('row-master.react.tsx'),
    readSource('row-master.vue'),
    readSource('row-master.angular.ts'),
  ]);

  for (const source of [typescript, react, vue, angular]) {
    assert.match(source, /MasterRowPlugin/);
    assert.match(source, /TreeDataPlugin/);
    assert.match(source, /CellColumnFocusVerifyPlugin/);
    assert.match(source, /masterRow/);
    assert.doesNotMatch(source, /Portfolio explorer|Tree \+ master detail|row-master-toolbar/);
    assert.doesNotMatch(source, /additionalData/);
  }

  assert.ok(typescript.indexOf('parent.appendChild(container)') < typescript.indexOf('grid.source = source'));
  assert.match(typescript, /return \(\) =>/);
  assert.match(react, /const plugins = useMemo/);
  assert.match(react, /const masterRow = useMemo/);
  assert.match(vue, /const rows = ref/);
  assert.match(vue, /const plugins = \[/);
  assert.match(angular, /standalone: true/);
  assert.match(angular, /encapsulation: ViewEncapsulation.None/);
});

test('all framework variants react to the resolved host theme', async () => {
  const files = ['row-master.ts', 'row-master.react.tsx', 'row-master.vue', 'row-master.angular.ts'];
  const sources = await Promise.all(files.map(readSource));
  const styles = await readSource('row-master.scss');

  for (const source of sources) {
    assert.match(source, /currentTheme/);
    assert.match(source, /observeCurrentTheme/);
    assert.match(source, /darkMaterial/);
  }
  assert.doesNotMatch(styles, /\.row-master-showcase\.is-dark/);
  assert.doesNotMatch(styles, /@media \(prefers-color-scheme: dark\)/);
});

test('showcase renders only the borderless grid workspace', async () => {
  const styles = await readSource('row-master.scss');

  assert.match(styles, /\.row-master-showcase\s*\{[^}]*background:\s*transparent/);
  assert.match(styles, /\.row-master-showcase\s*\{[^}]*border:\s*0/);
  assert.match(styles, /\.row-master-showcase\s*\{[^}]*border-radius:\s*0/);
  assert.doesNotMatch(styles, /\.row-master-toolbar(?:__badge)?\b/);
});
