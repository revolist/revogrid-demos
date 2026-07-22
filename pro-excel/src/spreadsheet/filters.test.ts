import assert from 'node:assert/strict';
import test from 'node:test';
import { getCellDataParsed } from '@revolist/revogrid';
import { getSpreadsheetLeafColumns } from './columns';
import { createSpreadsheetColumns } from './workbook';

test('configures advanced filters for Owner and Margin', () => {
  const columns = getSpreadsheetLeafColumns(createSpreadsheetColumns([]));
  const owner = columns.find(column => column.prop === 'owner');
  const margin = columns.find(column => column.prop === 'margin');

  assert.deepEqual(owner?.filter, ['selection']);
  assert.deepEqual(margin?.filter, ['slider']);
});

test('provides evaluated numeric Margin values to the slider filter', () => {
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
  assert.equal(getCellDataParsed(rows[0], margin), 1.2);
  assert.equal(getCellDataParsed(rows[1], margin), 0);
});
