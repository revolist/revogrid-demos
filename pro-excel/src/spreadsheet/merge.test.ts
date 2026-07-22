import assert from 'node:assert/strict';
import test from 'node:test';
import { SPREADSHEET_BASE_PLUGIN_LABELS } from './config';
import { createSpreadsheetCellMerge } from './data';
import { getSpreadsheetLeafColumns } from './columns';
import { createSpreadsheetColumns } from './workbook';

test('uses explicit cell merges for consecutive Department groups', () => {
  const rows = [
    { department: 'Marketing' },
    { department: 'Marketing' },
    { department: 'Sales' },
    { department: 'Sales' },
    { department: 'Sales' },
    { department: 'Platform' },
  ];

  assert.deepEqual(createSpreadsheetCellMerge(rows), [
    { row: 0, column: 0, rowType: 'rgRow', colType: 'colPinStart', rowSpan: 2 },
    { row: 2, column: 0, rowType: 'rgRow', colType: 'colPinStart', rowSpan: 3 },
    { row: 0, column: 0, rowType: 'rowPinEnd', colType: 'colPinStart', colSpan: 2 },
  ]);
});

test('does not enable automatic same-value merging for Department', () => {
  const department = getSpreadsheetLeafColumns(createSpreadsheetColumns([]))
    .find(column => column.prop === 'department');
  const pluginLabels: readonly string[] = SPREADSHEET_BASE_PLUGIN_LABELS;

  assert.equal(department?.merge, undefined);
  assert.ok(pluginLabels.includes('CellMergePlugin'));
  assert.equal(pluginLabels.includes('SameValueMergePlugin'), false);
});

test('keeps imported and empty workbooks free of scenario merges', () => {
  assert.deepEqual(createSpreadsheetCellMerge([], false), []);
  assert.deepEqual(createSpreadsheetCellMerge([{ department: 'Marketing' }, { department: 'Marketing' }], true), []);
});
