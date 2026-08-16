import assert from 'node:assert/strict';
import test from 'node:test';
import { getSpreadsheetLeafColumns } from './columns';
import { createSpreadsheetColumns } from './workbook';

test('configures advanced filters for Owner and Margin', () => {
  const columns = getSpreadsheetLeafColumns(createSpreadsheetColumns([]));
  const owner = columns.find(column => column.prop === 'owner');
  const margin = columns.find(column => column.prop === 'margin');

  assert.deepEqual(owner?.filter, ['selection']);
  assert.deepEqual(margin?.filter, ['slider']);
});

test('enables sorting for every spreadsheet leaf column', () => {
  const columns = getSpreadsheetLeafColumns(createSpreadsheetColumns([]));

  assert.deepEqual(
    columns.filter(column => column.sortable !== true).map(column => column.prop),
    [],
  );
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
