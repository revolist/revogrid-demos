import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  createContextMenuColumns,
  createContextMenuRowHeaders,
  createDataGridFormattingPresets,
  createTeamRowForAction,
  createTeamRows,
} from '../src/data-grid-context-menu.data.ts';
import { createDataGridContextMenuFormats } from '../src/data-grid-context-menu.formats.ts';
import { createContextMenuDetailsSpec } from '../src/data-grid-context-menu.details.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../src');
const readSource = file => readFile(join(root, file), 'utf8');

test('showcase data uses flat freely editable columns', () => {
  const rows = createTeamRows();
  const columns = createContextMenuColumns();
  const score = columns.find(column => column.prop === 'score');
  const team = columns.find(column => column.prop === 'team');
  const status = columns.find(column => column.prop === 'status');
  const approved = columns.find(column => column.prop === 'approved');

  assert.equal(rows.length, 9);
  assert.equal(new Set(rows.map(row => row.id)).size, rows.length);
  assert.equal(columns[0].collapsible, true);
  assert.equal(columns[0].children?.[0].readonly, true);
  const leafColumns = columns.flatMap(column => column.children ?? [column]);
  assert.ok(leafColumns.every(column => column.sortable === true));
  assert.equal(typeof score?.readonly, 'function');
  assert.equal(team?.columnType, undefined);
  assert.equal(team?.dropdown, undefined);
  assert.equal(team?.editor, undefined);
  assert.equal(status?.columnType, undefined);
  assert.equal(status?.dropdown, undefined);
  assert.equal(status?.cellTemplate, undefined);
  assert.equal(approved?.columnType, undefined);
  assert.equal(approved?.dropdown, undefined);
  assert.equal(approved?.editor, undefined);
  assert.ok(rows.some(row => row.approved === null));
  assert.notStrictEqual(createTeamRows()[0], rows[0]);
});

test('showcase keeps column defaults and coordinate-owned cell overrides', async () => {
  const formatting = createDataGridFormattingPresets();

  assert.equal(formatting.columns.length, 3);
  assert.deepEqual(
    formatting.columns.map(column => column.column),
    [4, 7, 8],
  );
  assert.equal(formatting.cells.length, 24);
  assert.equal(
    new Set(formatting.cells.map(cell => (
      `${cell.range.start.row}:${cell.range.start.column}`
    ))).size,
    formatting.cells.length,
  );
  const authoredOverrides = formatting.cells.filter(cell => ![3, 6]
    .includes(cell.range.start.column));
  assert.deepEqual(
    authoredOverrides.map(cell => [cell.range.start.row, cell.range.start.column]),
    [
      [0, 4],
      [1, 1],
      [2, 4],
      [4, 4],
      [7, 5],
      [0, 8],
    ],
  );
  const joined = formatting.columns.find(column => column.column === 8);
  assert.equal(joined?.format.value?.kind, 'preset');
  assert.equal(joined?.format.value?.preset, 'date');
  const avatar = formatting.cells.find(cell => (
    cell.range.start.row === 1 && cell.range.start.column === 1
  ));
  assert.equal(avatar?.format.presentation?.id, 'avatar-with-text');
  const rating = formatting.cells.find(cell => (
    cell.range.start.row === 4 && cell.range.start.column === 4
  ));
  assert.equal(rating?.format.presentation?.id, 'rating');
  assert.equal(rating?.format.appearance?.horizontal, 'center');
  const scoreColumn = formatting.columns.find(column => column.column === 4);
  const firstScore = formatting.cells.find(cell => (
    cell.range.start.row === 0 && cell.range.start.column === 4
  ));
  assert.equal(scoreColumn?.format.presentation?.id, 'progress-line');
  assert.equal(firstScore?.format.presentation?.id, 'circular-progress');
  const joinedTextOverride = formatting.cells.find(cell => (
    cell.range.start.row === 0 && cell.range.start.column === 8
  ));
  assert.equal(joinedTextOverride?.format.value?.kind, 'preset');
  assert.equal(joinedTextOverride?.format.value?.preset, 'text');

  for (let row = 0; row < createTeamRows().length; row += 1) {
    assert.equal(formatting.cells.find(cell => (
      cell.range.start.row === row && cell.range.start.column === 3
    ))?.format.presentation?.id, 'status-dropdown');
    assert.equal(formatting.cells.find(cell => (
      cell.range.start.row === row && cell.range.start.column === 6
    ))?.format.presentation?.id, 'boolean');
  }

  const shared = await readSource('data-grid-context-menu.shared.ts');
  assert.match(shared, /import DateColumnType from '@revolist\/revogrid-column-date'/);
  assert.match(shared, /presetEditors:\s*\{\s*date:\s*dateColumnType\.editor\s*\}/);
});

test('showcase dropdown formats own their renderers and editors per cell', () => {
  const formats = createDataGridContextMenuFormats();

  assert.deepEqual(formats.map(format => format.id), ['status-dropdown']);
  assert.ok(formats.every(format => format.replaceAuthoredEditor === true));
  assert.ok(formats.every(format => typeof format.cellTemplate === 'function'));
  assert.ok(formats.every(format => typeof format.editorFactory === 'function'));
  assert.deepEqual(formats.map(format => format.valueKind), ['text']);
  assert.equal(formats[0].isCompatible({ value: 'Active' }), true);
  assert.equal(formats[0].isCompatible({ value: null }), true);
  assert.equal(formats[0].isCompatible({ value: 'Platform' }), false);
});

test('insert actions create blank rows while duplicate explicitly clones data', () => {
  const source = createTeamRows()[0];
  for (const [id, action] of [[110, 'insertAbove'], [111, 'insertBelow']]) {
    assert.deepEqual(createTeamRowForAction(id, action, source), {
      id,
      name: '',
      team: '',
      status: null,
      score: null,
      owner: '',
      approved: null,
      schedule: [],
      joinedAt: '',
    });
  }

  const duplicate = createTeamRowForAction(112, 'duplicate', source);
  assert.deepEqual(duplicate, { ...source, id: 112 });
  assert.notStrictEqual(duplicate.schedule, source.schedule);
  assert.notStrictEqual(duplicate.schedule[0], source.schedule[0]);
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

  const blank = createTeamRowForAction(110, 'insertBelow', employee);
  const selectedSummary = createContextMenuDetailsSpec({
    ...base,
    surface: 'rowHeader',
    rows: [row, {
      model: blank,
      type: 'rgRow',
      physicalIndex: 1,
      sourceIndex: 1,
    }],
  });
  assert.equal(
    selectedSummary.entries.find(entry => entry.label === 'Average score').value,
    '98.0',
  );

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
  assert.equal(pinnedSummary.entries.find(entry => entry.label === 'Average').value, '86.7');
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
    assert.doesNotMatch(source, /EventManagerPlugin/);
    assert.match(source, /HistoryPlugin/);
    assert.match(source, /DataGridContextMenuPlugin/);
    assert.match(
      source,
      /\[\s*DataGridContextMenuPlugin,\s*HistoryPlugin,/,
    );
    assert.match(source, /DialogPlugin/);
    assert.match(source, /AdvanceFilterPlugin/);
    assert.match(source, /ColumnCollapsePlugin/);
    assert.match(source, /MultiRangeSelectionPlugin/);
    assert.match(source, /ExportExcelPlugin/);
    assert.match(source, /createDataGridContextMenuConfig/);
    assert.match(source, /dataGridFormatting/);
    assert.match(source, /createDataGridFormattingPresets/);
    assert.doesNotMatch(source, /createDataGridColumnTypes|columnTypes|column-types/);
    assert.doesNotMatch(source, /createTeamGrouping|\bgrouping\b/);
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
  assert.match(react, /dataGridFormatting=\{dataGridFormatting\}/);
  assert.match(react, /dataGridContextMenu=\{dataGridContextMenu\}/);
  assert.doesNotMatch(react, /additionalData/);
  assert.match(vue, /const rows = computed/);
  assert.match(vue, /:data-grid-formatting\.prop="dataGridFormatting"/);
  assert.match(vue, /:data-grid-context-menu\.prop="dataGridContextMenu"/);
  assert.doesNotMatch(vue, /additional-data|additionalData/);
  assert.match(angular, /standalone: true/);
  assert.match(angular, /encapsulation: ViewEncapsulation.None/);
  assert.match(angular, /\[dataGridFormatting\]="dataGridFormatting"/);
  assert.match(angular, /\[dataGridContextMenu\]="dataGridContextMenu"/);
  assert.doesNotMatch(angular, /additionalData/);
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

test('row headers center readable text within fixed-height body cells', async () => {
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
    /\.data-grid-context-menu-row-header-cell\s*\{[^}]*display:\s*flex;[^}]*align-items:\s*center;[^}]*justify-content:\s*center;[^}]*padding:\s*0 10px !important;/s,
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
