import assert from 'node:assert/strict';
import test from 'node:test';
import * as spreadsheetConfig from './config';
import { getSpreadsheetLeafColumns } from './columns';
import { createSpreadsheetColumns } from './workbook';

test('syncs selection-filter templates and formats workbook sliders as percentages', () => {
  const filterConfig = (
    spreadsheetConfig as typeof spreadsheetConfig & {
      SPREADSHEET_FILTER_CONFIG?: {
        selection?: unknown;
        slider?: { formatValue?: (value: number) => string };
      };
    }
  ).SPREADSHEET_FILTER_CONFIG;

  assert.deepEqual(filterConfig?.selection, {
    sourceRowTypes: ['rgRow'],
    syncCellTemplate: {
      department: true,
      status: true,
    },
  });
  assert.equal(filterConfig?.slider?.formatValue?.(0.164), '16.4%');
});

test('configures advanced filters for Owner, Margin, and Trend', () => {
  const columns = getSpreadsheetLeafColumns(createSpreadsheetColumns([]));
  const owner = columns.find(column => column.prop === 'owner');
  const margin = columns.find(column => column.prop === 'margin');
  const trend = columns.find(column => column.prop === 'trend');

  assert.deepEqual(owner?.filter, ['selection']);
  assert.deepEqual(margin?.filter, ['slider']);
  assert.deepEqual(trend?.filter, ['slider']);
  assert.equal(trend?.filterPlaceholder, 'Range');
});

test('enables sorting for every spreadsheet leaf column', () => {
  const columns = getSpreadsheetLeafColumns(createSpreadsheetColumns([]));

  assert.deepEqual(
    columns.filter(column => column.sortable !== true).map(column => column.prop),
    [],
  );
});

test('declares currency value semantics for editable actual and target columns', () => {
  const columns = getSpreadsheetLeafColumns(createSpreadsheetColumns([]));
  const formats = ['jan', 'feb', 'mar', 'target'].map(prop => (
    columns.find(column => column.prop === prop)?.dataGridFormat
  ));

  formats.forEach(format => assert.deepEqual(format, {
    value: {
      preset: 'currency',
      locale: 'en-US',
      currency: 'USD',
      decimalPlaces: 0,
      useGrouping: true,
      negativeStyle: 'minus',
    },
  }));
});

test('leaves formula-backed sorting to FormulaPlugin without a stale demo parser', () => {
  const rows = [{
    jan: 10,
    feb: 20,
    mar: 30,
    total: '=SUM(C1:E1)',
    target: 50,
    variance: '=F1-G1',
  }, {
    jan: 100,
    feb: 200,
    mar: 300,
    total: '=SUM(C2:E2)',
    target: 650,
    variance: '=F2-G2',
  }];
  const columns = getSpreadsheetLeafColumns(createSpreadsheetColumns(rows));
  const total = columns.find(column => column.prop === 'total');
  const variance = columns.find(column => column.prop === 'variance');

  assert.ok(total);
  assert.ok(variance);
  assert.equal(total.cellParser, undefined);
  assert.equal(variance.cellParser, undefined);
});

test('provides built-in badge renderers without a custom status popup class', () => {
  const status = getSpreadsheetLeafColumns(createSpreadsheetColumns([]))
    .find(column => column.prop === 'status') as {
      badgeStyles?: Record<string, { backgroundColor: string; color?: string }>;
      dropdown?: {
        config?: { popupClassName?: string };
        syncCellTemplate?: boolean;
        cellTemplate?: unknown;
        renderOption?: unknown;
        renderSelectedValue?: unknown;
      };
    } | undefined;

  assert.equal(status?.dropdown?.config?.popupClassName, undefined);
  assert.equal(status?.dropdown?.syncCellTemplate, true);
  assert.equal(typeof status?.dropdown?.cellTemplate, 'function');
  assert.equal(status?.dropdown?.renderOption, undefined);
  assert.equal(status?.dropdown?.renderSelectedValue, undefined);
  assert.ok(status?.badgeStyles);
  assert.ok(Object.values(status.badgeStyles).every(style => style.color === undefined));
});

test('provides department templates to the dropdown popup and editor value', () => {
  const department = getSpreadsheetLeafColumns(createSpreadsheetColumns([]))
    .find(column => column.prop === 'department') as {
      dropdown?: {
        config?: { popupClassName?: string };
        syncCellTemplate?: boolean;
        renderOption?: unknown;
        renderSelectedValue?: unknown;
      };
    } | undefined;

  assert.equal(department?.dropdown?.config?.popupClassName, 'spreadsheet-department-dropdown');
  assert.equal(department?.dropdown?.syncCellTemplate, true);
  assert.equal(department?.dropdown?.renderOption, undefined);
  assert.equal(department?.dropdown?.renderSelectedValue, undefined);
});

test('leaves formula-backed slider values to FormulaPlugin filtering', () => {
  const rows = [{
    jan: 100,
    feb: 120,
    mar: 80,
    total: '=SUM(C1:E1)',
    target: 250,
    margin: '=IF(G1=0,0,F1/G1)',
  }, {
    jan: 100,
    feb: 120,
    mar: 80,
    total: '=SUM(C2:E2)',
    target: 0,
    margin: '=IF(G2=0,0,F2/G2)',
  }];
  const margin = getSpreadsheetLeafColumns(createSpreadsheetColumns(rows))
    .find(column => column.prop === 'margin');

  assert.ok(margin);
  assert.equal(margin.cellParser, undefined);
});

test('renders cleared advanced percentage cells as blank instead of zero', () => {
  const columns = getSpreadsheetLeafColumns(createSpreadsheetColumns([]));
  const render = (prop: 'margin' | 'trend') => {
    const column = columns.find(item => item.prop === prop);
    assert.ok(column?.cellTemplate);
    return column.cellTemplate(
      (tag: string, props: Record<string, unknown>, children?: unknown) => ({ tag, props, children }),
      {
        value: '',
        model: {},
        column,
        prop,
        rowIndex: 0,
        colIndex: 0,
        type: 'rgRow',
        colType: 'rgCol',
      } as never,
      undefined,
    ) as { props?: { class?: string }; children?: unknown };
  };

  const margin = render('margin');
  const trend = render('trend');

  assert.match(margin.props?.class ?? '', /spreadsheet-margin-empty/);
  assert.equal(margin.children, '');
  assert.match(trend.props?.class ?? '', /spreadsheet-trend-empty/);
  assert.equal(trend.children, '');
});
