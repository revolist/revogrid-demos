import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  createContextMenuColumns,
  createContextMenuRowHeaders,
  createDataGridFormattingPresets,
  createTeamGrouping,
  createTeamRows,
} from './data-grid-context-menu.data.ts';
import { createContextMenuDetailsSpec } from './data-grid-context-menu.details.ts';

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
  const leafColumns = columns.flatMap(column => column.children ?? [column]);
  assert.ok(leafColumns.every(column => column.sortable === true));
  assert.equal(typeof score?.readonly, 'function');
  assert.notStrictEqual(createTeamRows()[0], rows[0]);
});

test('showcase starts with several declaratively formatted cells', () => {
  const formatting = createDataGridFormattingPresets();

  assert.equal(formatting.rowKeyProp, 'id');
  assert.equal(formatting.cells.length, 4);
  assert.equal(
    new Set(formatting.cells.map(cell => `${cell.rowKey}:${cell.prop}`)).size,
    formatting.cells.length,
  );
  assert.deepEqual(
    formatting.cells.map(cell => [cell.rowKey, cell.prop]),
    [[101, 'score'], [103, 'status'], [105, 'score'], [108, 'owner']],
  );
});

test('menu configuration keeps row deletion while extending, replacing, and creating schema', async () => {
  const source = await readSource('data-grid-context-menu.shared.ts');

  assert.doesNotMatch(source, /hiddenItems:[\s\S]*['"]row\.delete['"]:\s*true/);
  assert.match(source, /inspection:\s*\{\s*includeRowData:\s*true,\s*includeColumnData:\s*true\s*\}/);
  assert.match(source, /rowPinning:\s*true/);
  assert.match(source, /items:\s*context\s*=>/);
  assert.match(source, /getItems:\s*\(context, defaults\)\s*=>/);
  assert.match(source, /createRow:\s*\(/);
  assert.match(source, /columnSchema:\s*\{/);
});

test('custom menu extensions use business summaries distinct from technical inspection', () => {
  const employee = createTeamRows()[0];
  const row = { model: employee, type: 'rgRow', physicalIndex: 0, sourceIndex: 0 };
  const base = {
    rows: [row],
    columns: [],
    readonly: false,
    menu: { target: 'row', cell: { model: employee } },
  };

  assert.equal(createContextMenuDetailsSpec({ ...base, surface: 'cell' }).actionLabel, 'View employee profile');
  assert.equal(createContextMenuDetailsSpec({ ...base, surface: 'rowHeader' }).actionLabel, 'View row details');
  assert.equal(createContextMenuDetailsSpec({
    ...base,
    rows: [],
    surface: 'rowHeader',
  }).actionLabel, 'View row details');
  assert.equal(createContextMenuDetailsSpec({ ...base, surface: 'rowGroup' }).actionLabel, 'View team summary');
  assert.equal(createContextMenuDetailsSpec({
    ...base,
    surface: 'columnHeader',
    column: { prop: 'score', name: 'Score' },
  }).actionLabel, 'View column summary');
  assert.equal(createContextMenuDetailsSpec({
    ...base,
    surface: 'columnGroupHeader',
    columnGroup: { name: 'Identity', children: [], indexes: [] },
    columns: [{ prop: 'id', name: 'ID' }, { prop: 'name', name: 'Name' }],
  }).actionLabel, 'View column-group summary');

  const [pinnedTop, regular, pinnedBottom] = createTeamRows();
  const rowStore = source => ({
    get: key => key === 'source' ? source : key === 'items' ? source.map((_, index) => index) : undefined,
  });
  const pinnedSummary = createContextMenuDetailsSpec({
    ...base,
    rows: [],
    surface: 'columnHeader',
    column: { prop: 'score', name: 'Score' },
    menu: {
      target: 'column',
      providers: {
        data: {
          stores: {
            rowPinStart: { store: rowStore([pinnedTop]) },
            rgRow: { store: rowStore([regular]) },
            rowPinEnd: { store: rowStore([pinnedBottom]) },
          },
        },
      },
    },
  });
  assert.equal(pinnedSummary.entries.find(entry => entry.label === 'Visible rows').value, '3');
  assert.equal(pinnedSummary.entries.find(entry => entry.label === 'Average').value, '96.7');
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
    assert.match(source, /DialogPlugin/);
    assert.match(source, /AdvanceFilterPlugin/);
    assert.match(source, /ColumnCollapsePlugin/);
    assert.match(source, /MultiRangeSelectionPlugin/);
    assert.match(source, /ExportExcelPlugin/);
    assert.match(source, /createDataGridContextMenuConfig/);
    assert.match(source, /dataGridFormatting/);
    assert.match(source, /createDataGridFormattingPresets/);
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
  assert.match(vue, /const rows = computed/);
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
  const [data, ...sources] = await Promise.all([
    readSource('data-grid-context-menu.data.ts'),
    ...files.map(readSource),
  ]);

  assert.match(data, /isDark \? ['"]darkCompact['"] : ['"]compact['"]/);
  for (const source of sources) {
    assert.match(source, /currentTheme/);
    assert.match(source, /observeCurrentTheme/);
    assert.match(source, /getDataGridContextMenuTheme/);
  }
});

test('all framework variants keep fixed rows readable and leave the ID column unpinned', async () => {
  const files = [
    'data-grid-context-menu.ts',
    'data-grid-context-menu.react.tsx',
    'data-grid-context-menu.vue',
    'data-grid-context-menu.angular.ts',
  ];
  const [data, ...sources] = await Promise.all([
    readSource('data-grid-context-menu.data.ts'),
    ...files.map(readSource),
  ]);

  assert.doesNotMatch(data, /pin:\s*['"]colPinStart['"]/);
  assert.match(data, /DATA_GRID_CONTEXT_MENU_ROW_SIZE\s*=\s*48/);
  assert.doesNotMatch(data, /createContextMenuRowAutoSize/);

  const [typescript, react, vue, angular] = sources;
  assert.match(typescript, /grid\.rowSize\s*=\s*DATA_GRID_CONTEXT_MENU_ROW_SIZE/);
  assert.match(react, /rowSize=\{DATA_GRID_CONTEXT_MENU_ROW_SIZE\}/);
  assert.match(vue, /:row-size="DATA_GRID_CONTEXT_MENU_ROW_SIZE"/);
  assert.match(angular, /\[rowSize\]="rowSize"/);
  for (const source of sources) {
    assert.doesNotMatch(source, /RowAutoSizePlugin/);
    assert.doesNotMatch(source, /rowAutoSize/);
  }
});

test('row headers use readable text metrics with fixed-height body cells', async () => {
  const rowHeaders = createContextMenuRowHeaders();
  const rowHeaderProperties = rowHeaders.cellProperties?.({});

  assert.equal(rowHeaders.prop, '_revo_row_header');
  assert.equal(rowHeaderProperties?.class, 'data-grid-context-menu-row-header-cell');
  assert.deepEqual(rowHeaderProperties?.style, {
    fontSize: '14px',
    lineHeight: '21px',
    textAlign: 'center',
  });

  const styles = await readSource('data-grid-context-menu.scss');
  assert.match(
    styles,
    /\.data-grid-context-menu-row-header-cell\s*\{[^}]*padding:\s*5px 10px !important;/s,
  );

  const files = [
    'data-grid-context-menu.ts',
    'data-grid-context-menu.react.tsx',
    'data-grid-context-menu.vue',
    'data-grid-context-menu.angular.ts',
  ];
  const sources = await Promise.all(files.map(readSource));
  for (const source of sources) {
    assert.match(source, /createContextMenuRowHeaders/);
  }
  assert.match(sources[2], /:row-headers="rowHeaders"/);
  assert.doesNotMatch(sources[2], /:row-headers\.prop/);
});

test('application summaries use the shared dialog presentation', async () => {
  const [details, styles, shared] = await Promise.all([
    readSource('data-grid-context-menu.details.ts'),
    readSource('data-grid-context-menu.scss'),
    readSource('data-grid-context-menu.shared.ts'),
  ]);

  assert.match(details, /providers\.plugins\.getByClass\(DialogPlugin\)/);
  assert.match(details, /surfaceClass:\s*['"]data-grid-context-menu-details-dialog['"]/);
  assert.match(details, /createDialogButton/);
  assert.doesNotMatch(shared, /window\.alert/);
  assert.match(styles, /\.data-grid-context-menu-details-dialog/);
});
