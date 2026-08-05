import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

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
  }
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
