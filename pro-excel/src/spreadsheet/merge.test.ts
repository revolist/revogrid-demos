import assert from 'node:assert/strict';
import test from 'node:test';
import { SPREADSHEET_BASE_PLUGIN_LABELS } from './config';
import { getSpreadsheetLeafColumns } from './columns';
import { createSpreadsheetColumns, createSpreadsheetWorkbook } from './workbook';

test('keeps explicit and automatic cell merging out of the workbench', () => {
  const department = getSpreadsheetLeafColumns(createSpreadsheetColumns([]))
    .find(column => column.prop === 'department');
  const pluginLabels: readonly string[] = SPREADSHEET_BASE_PLUGIN_LABELS;
  const workbook = createSpreadsheetWorkbook();

  assert.equal(department?.merge, undefined);
  assert.equal('cellMerge' in workbook, false);
  assert.equal(pluginLabels.includes('CellMergePlugin'), false);
  assert.equal(pluginLabels.includes('SameValueMergePlugin'), false);
});
