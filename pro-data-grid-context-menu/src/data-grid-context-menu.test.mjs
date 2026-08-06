import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  createContextMenuColumns,
  createDataGridContextMenuConfig,
  createTeamGrouping,
  createTeamRows,
} from './data-grid-context-menu.shared.ts';

const root = dirname(fileURLToPath(import.meta.url));
const readSource = file => readFile(join(root, file), 'utf8');

test('showcase data covers grouped, editable, and readonly targets', () => {
  const rows = createTeamRows();
  const columns = createContextMenuColumns();
  const score = columns.find(column => column.prop === 'score');

  assert.equal(rows.length, 9);
  assert.equal(new Set(rows.map(row => row.id)).size, rows.length);
  assert.equal(createTeamGrouping().props?.[0], 'team');
  assert.equal(columns[0].collapsible, true);
  assert.equal(columns[0].children?.[0].readonly, true);
  assert.equal(typeof score?.readonly, 'function');
  assert.notStrictEqual(createTeamRows()[0], rows[0]);
});

test('menu configuration demonstrates hiding, extending, replacing, and schema creation', () => {
  const config = createDataGridContextMenuConfig();

  assert.equal(config.hiddenItems?.['row.delete'], true);
  assert.equal(config.rowPinning, true);
  assert.equal(typeof config.items, 'function');
  assert.equal(typeof config.getItems, 'function');
  assert.equal(typeof config.createRow, 'function');
  assert.equal(typeof config.columnSchema, 'object');
});

test('all framework variants install the same universal menu capabilities', async () => {
  const files = [
    'data-grid-context-menu.ts',
    'data-grid-context-menu.react.tsx',
    'data-grid-context-menu.vue',
    'data-grid-context-menu.angular.ts',
  ];
  const sources = await Promise.all(files.map(readSource));

  for (const source of sources) {
    assert.match(source, /DataGridContextMenuPlugin/);
    assert.match(source, /AdvanceFilterPlugin/);
    assert.match(source, /ColumnCollapsePlugin/);
    assert.match(source, /MultiRangeSelectionPlugin/);
    assert.match(source, /ExportExcelPlugin/);
    assert.match(source, /createDataGridContextMenuConfig/);
    assert.match(source, /createTeamGrouping/);
  }
});

test('framework variants follow standalone demo lifecycle conventions', async () => {
  const [typescript, react, vue, angular] = await Promise.all([
    readSource('data-grid-context-menu.ts'),
    readSource('data-grid-context-menu.react.tsx'),
    readSource('data-grid-context-menu.vue'),
    readSource('data-grid-context-menu.angular.ts'),
  ]);

  assert.ok(typescript.indexOf('parent.appendChild(showcase)') < typescript.indexOf('grid.source ='));
  assert.match(typescript, /return \(\) =>/);
  assert.match(react, /const plugins = useMemo/);
  assert.match(react, /const additionalData = useMemo/);
  assert.match(vue, /const rows = ref/);
  assert.match(vue, /const additionalData = computed/);
  assert.match(angular, /standalone: true/);
  assert.match(angular, /encapsulation: ViewEncapsulation.None/);
});

test('all framework variants reactively apply the compact RevoGrid theme', async () => {
  const files = [
    'data-grid-context-menu.ts',
    'data-grid-context-menu.react.tsx',
    'data-grid-context-menu.vue',
    'data-grid-context-menu.angular.ts',
  ];
  const [shared, ...sources] = await Promise.all([
    readSource('data-grid-context-menu.shared.ts'),
    ...files.map(readSource),
  ]);

  assert.match(shared, /isDark \? ['"]darkCompact['"] : ['"]compact['"]/);
  for (const source of sources) {
    assert.match(source, /currentTheme/);
    assert.match(source, /observeCurrentTheme/);
    assert.match(source, /getDataGridContextMenuTheme/);
  }
});

test('all framework variants keep rows readable and leave the ID column unpinned', async () => {
  const files = [
    'data-grid-context-menu.ts',
    'data-grid-context-menu.react.tsx',
    'data-grid-context-menu.vue',
    'data-grid-context-menu.angular.ts',
  ];
  const [shared, ...sources] = await Promise.all([
    readSource('data-grid-context-menu.shared.ts'),
    ...files.map(readSource),
  ]);

  assert.doesNotMatch(shared, /pin:\s*['"]colPinStart['"]/);
  assert.match(shared, /DATA_GRID_CONTEXT_MENU_ROW_SIZE\s*=\s*48/);
  assert.match(shared, /minHeight:\s*DATA_GRID_CONTEXT_MENU_ROW_SIZE/);

  const [typescript, react, vue, angular] = sources;
  assert.match(typescript, /grid\.rowSize\s*=\s*DATA_GRID_CONTEXT_MENU_ROW_SIZE/);
  assert.match(typescript, /grid\.rowAutoSize\s*=\s*createContextMenuRowAutoSize\(\)/);
  assert.match(react, /rowSize=\{DATA_GRID_CONTEXT_MENU_ROW_SIZE\}/);
  assert.match(react, /rowAutoSize=\{rowAutoSize\}/);
  assert.match(vue, /:row-size="DATA_GRID_CONTEXT_MENU_ROW_SIZE"/);
  assert.match(vue, /:row-auto-size\.prop="rowAutoSize"/);
  assert.match(angular, /\[rowSize\]="rowSize"/);
  assert.match(angular, /\[rowAutoSize\]="rowAutoSize"/);
});
