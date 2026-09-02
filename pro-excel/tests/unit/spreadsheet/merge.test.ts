import assert from 'node:assert/strict';
import test from 'node:test';
import { SPREADSHEET_BASE_PLUGIN_LABELS } from '../../../src/spreadsheet/config';
import { getSpreadsheetLeafColumns } from '../../../src/spreadsheet/columns';
import { createSpreadsheetColumns, createSpreadsheetWorkbook } from '../../../src/spreadsheet/workbook';

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
