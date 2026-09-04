import assert from 'node:assert/strict';
import test from 'node:test';
import { getSpreadsheetLeafColumns } from '../../../src/spreadsheet/columns';
import { createSpreadsheetDisplayColumns } from '../../../src/spreadsheet/presentation';
import { createSpreadsheetWorkbook } from '../../../src/spreadsheet/workbook';

test('keeps every Spreadsheet Workbench column in the regular viewport', () => {
  const workbook = createSpreadsheetWorkbook();
  const columns = getSpreadsheetLeafColumns(createSpreadsheetDisplayColumns(workbook));

  assert.equal(columns.length, 11);
  assert.deepEqual(columns.map(column => column.pin), Array(11).fill(undefined));
});
