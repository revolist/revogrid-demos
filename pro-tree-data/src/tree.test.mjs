import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createTreeConfig, createTreeFilterConfig, createTreeRows } from './tree.shared.ts';

const root = dirname(fileURLToPath(import.meta.url));
const readSource = file => readFile(join(root, file), 'utf8');

test('tree showcase includes hierarchy, interaction, and export plugins', async () => {
  const source = await readSource('tree.shared.ts');

  for (const plugin of [
    'TreeDataPlugin',
    'DimensionAnimationPlugin',
    'RowOrderPlugin',
    'AdvanceFilterPlugin',
    'ExportExcelPlugin',
    'RowSelectPlugin',
    'StickyCellsPlugin',
  ]) {
    assert.match(source, new RegExp(plugin));
  }
  assert.match(source, /parentId: null/);
  assert.match(source, /parentId: 'product'/);
  assert.match(source, /stickyParents/);
  assert.match(source, /animation: true/);
});

test('all four frameworks expose matching tree controls', async () => {
  const files = ['tree.ts', 'tree.react.tsx', 'tree.vue', 'tree.angular.ts'];
  const sources = await Promise.all(files.map(readSource));

  for (const source of sources) {
    assert.match(source, /TREE_EXPAND_ALL_EVENT/);
    assert.match(source, /TREE_COLLAPSE_ALL_EVENT/);
    assert.match(source, /ExportExcelPlugin/);
    assert.match(source, /Sticky parents/);
    assert.doesNotMatch(source, /Organization explorer|Interactive hierarchy|tree-(?:toolbar__intro|eyebrow)/);
  }

  const styles = await readSource('tree.scss');
  assert.doesNotMatch(styles, /\.tree-(?:toolbar__intro|eyebrow)\b/);
});

test('all framework variants keep tree cells readonly without changing presentation', async () => {
  const [typescript, react, vue, angular, styles] = await Promise.all([
    readSource('tree.ts'),
    readSource('tree.react.tsx'),
    readSource('tree.vue'),
    readSource('tree.angular.ts'),
    readSource('tree.scss'),
  ]);

  assert.match(typescript, /grid\.readonly = true/);
  assert.match(react, /readonly=\{true\}/);
  assert.match(vue, /:readonly="true"/);
  assert.match(angular, /\[readonly\]="true"/);
  assert.doesNotMatch(styles, /readonly|read-only/);
});

test('all framework variants configure sticky parent rows', async () => {
  const [shared, typescript, react, vue, angular] = await Promise.all([
    readSource('tree.shared.ts'),
    readSource('tree.ts'),
    readSource('tree.react.tsx'),
    readSource('tree.vue'),
    readSource('tree.angular.ts'),
  ]);

  assert.match(shared, /TREE_STICKY_CELLS_CONFIG[\s\S]*?maxRows:\s*2/);
  assert.match(typescript, /grid\.stickyCells = TREE_STICKY_CELLS_CONFIG/);
  assert.match(react, /stickyCells:\s*TREE_STICKY_CELLS_CONFIG/);
  assert.match(vue, /:sticky-cells\.prop="TREE_STICKY_CELLS_CONFIG"/);
  assert.match(angular, /\[stickyCells\]="stickyCells"/);
});

test('expanded tree has enough rows to exercise internal sticky scrolling', () => {
  const rows = createTreeRows();

  assert.ok(rows.length >= 24);
  assert.ok(rows.filter(row => row.parentId !== null).length >= 20);
});

test('tree config preserves live expansion state across framework refreshes', () => {
  const rows = createTreeRows();
  const expandedRowIds = new Set(['product', 'platform', 'experience']);
  const config = createTreeConfig(rows, {
    expandedRowIds,
    stickyParents: false,
  });

  assert.deepEqual(config.expandedRowIds, expandedRowIds);
  assert.notEqual(config.expandedRowIds, expandedRowIds);
  assert.equal(config.stickyParents, false);
});

test('selection filters reuse team member and status cell templates', () => {
  const rows = createTreeRows();
  const selection = createTreeFilterConfig(rows).selection;

  assert.deepEqual(selection?.syncCellTemplate, { fullName: true, status: true });
  assert.equal(typeof selection?.itemTemplate?.fullName, 'function');
  assert.equal(typeof selection?.itemTemplate?.status, 'function');
  assert.equal(selection?.sortDirection, 'asc');
  assert.deepEqual(selection?.getItems?.fullName?.('fullName')[0], {
    value: 'Maya Chen',
    label: 'Maya Chen',
    id: 'product',
    avatar: 'MC',
    fullName: 'Maya Chen',
  });
});

test('all framework variants provide the synchronized selection filter config', async () => {
  const [typescript, react, vue, angular] = await Promise.all([
    readSource('tree.ts'),
    readSource('tree.react.tsx'),
    readSource('tree.vue'),
    readSource('tree.angular.ts'),
  ]);

  assert.match(typescript, /grid\.filter = createTreeFilterConfig\(source\)/);
  assert.match(react, /filter=\{filterConfig\}/);
  assert.match(vue, /:filter="filterConfig"/);
  assert.match(angular, /\[filter\]="filterConfig"/);
});

test('plugins are applied before columns so tree sticky decorators see the initial column set', async () => {
  const [typescript, react, vue, angular] = await Promise.all([
    readSource('tree.ts'),
    readSource('tree.react.tsx'),
    readSource('tree.vue'),
    readSource('tree.angular.ts'),
  ]);

  assert.ok(typescript.indexOf('grid.plugins = TREE_PLUGINS') < typescript.indexOf('grid.columns = createTreeColumns('));
  assert.ok(react.indexOf('plugins={plugins}') < react.indexOf('columns={columns}'));
  assert.ok(vue.indexOf(':plugins="plugins"') < vue.indexOf(':columns="columns"'));
  assert.ok(angular.indexOf('[plugins]="plugins"') < angular.indexOf('[columns]="columns"'));
});

test('frameworks configure tree plugins declaratively without readiness workarounds', async () => {
  const [shared, typescript, react, vue, angular] = await Promise.all([
    readSource('tree.shared.ts'),
    readSource('tree.ts'),
    readSource('tree.react.tsx'),
    readSource('tree.vue'),
    readSource('tree.angular.ts'),
  ]);

  for (const source of [shared, typescript, react, vue, angular]) {
    assert.doesNotMatch(source, /customElements\.whenDefined|componentOnReady|initializeTreeStickyColumns|Object\.assign/);
  }
});

test('all framework variants mirror live tree expansion state', async () => {
  const files = ['tree.ts', 'tree.react.tsx', 'tree.vue', 'tree.angular.ts'];
  const sources = await Promise.all(files.map(readSource));

  for (const source of sources) {
    assert.match(source, /TREE_STATE_CHANGED_EVENT/);
    assert.match(source, /detail\.expandedRowIds/);
    assert.match(source, /createTreeConfig\([\s\S]*?expandedRowIds/);
  }
});

test('tree columns explicitly track sticky parent IDs and checkbox changes', async () => {
  const [shared, typescript, react, vue, angular] = await Promise.all([
    readSource('tree.shared.ts'),
    readSource('tree.ts'),
    readSource('tree.react.tsx'),
    readSource('tree.vue'),
    readSource('tree.angular.ts'),
  ]);

  assert.match(shared, /createTreeColumns\(\s*rows:[\s\S]*?parentIds[\s\S]*?stickyCell:[\s\S]*?stickyParents/);
  assert.match(typescript, /toggleSticky[\s\S]*?grid\.columns = createTreeColumns/);
  assert.match(react, /createTreeColumns\(source, stickyParents\)[\s\S]*?\[source, stickyParents\]/);
  assert.match(vue, /computed\(\(\) => createTreeColumns\(rows\.value, stickyParents\.value\)\)/);
  assert.match(angular, /setStickyParents[\s\S]*?this\.columns = createTreeColumns/);
});

test('framework variants follow demo lifecycle conventions', async () => {
  const [typescript, react, vue, angular] = await Promise.all([
    readSource('tree.ts'),
    readSource('tree.react.tsx'),
    readSource('tree.vue'),
    readSource('tree.angular.ts'),
  ]);

  assert.ok(typescript.indexOf('parent.appendChild(container)') < typescript.indexOf('grid.source = source'));
  assert.match(react, /const plugins = useMemo/);
  assert.match(react, /const columnTypes = useMemo/);
  assert.match(vue, /const rows = ref/);
  assert.match(vue, /const treeConfig = computed/);
  assert.match(vue, /const plugins = \[\.\.\.TREE_PLUGINS\]/);
  assert.match(angular, /standalone: true/);
  assert.match(angular, /encapsulation: ViewEncapsulation.None/);
});

test('all framework variants react to the resolved host theme', async () => {
  const files = ['tree.ts', 'tree.react.tsx', 'tree.vue', 'tree.angular.ts'];
  const sources = await Promise.all(files.map(readSource));
  const styles = await readSource('tree.scss');

  for (const source of sources) {
    assert.match(source, /currentTheme/);
    assert.match(source, /observeCurrentTheme/);
    assert.match(source, /darkMaterial/);
  }
  assert.doesNotMatch(styles, /\.tree-showcase\.is-dark/);
  assert.doesNotMatch(styles, /@media \(prefers-color-scheme: dark\)/);
});

test('showcase chrome stays transparent and inherits the host theme', async () => {
  const styles = await readSource('tree.scss');

  assert.match(styles, /\.tree-showcase\s*\{[^}]*background:\s*transparent/);
  assert.match(styles, /\.tree-showcase\s*\{[^}]*border:\s*0/);
  assert.match(styles, /\.tree-showcase\s*\{[^}]*border-radius:\s*0/);
  assert.match(styles, /\.tree-toolbar\s*\{[^}]*background:\s*transparent/);
  assert.match(styles, /\.tree-button,[^{]*\{[^}]*@include demo-controls\.scheduler-button/);
});
