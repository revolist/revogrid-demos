import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCsv, parseJson, inferFields, prepareRows } from '../src/import-data.ts';

test('CSV handles quotes and rejects malformed rows', () => {
  assert.deepEqual(parseCsv('Name,Sales\n"West, Inc.",12\n'), [{ Name: 'West, Inc.', Sales: '12' }]);
  assert.throws(() => parseCsv('Name,Sales\nNorth'), /row 2/);
  assert.throws(() => parseCsv('Name,Name\nA,B'), /unique/);
});

test('JSON accepts flat records and rejects nested values', () => {
  assert.deepEqual(parseJson('[{"Region":"North","Sales":10}]'), [{ Region: 'North', Sales: 10 }]);
  assert.throws(() => parseJson('[{"Region":{"nested":true}}]'), /scalar/);
});

test('prepares explicit types, UTC calendar groups, numeric bins, and invalid values', () => {
  const rows = parseCsv('Date,Region,Sales\n2025-04-03,North,14\n2025-13-02,South,abc\n');
  const fields = inferFields(rows);
  const date = fields.find(field => field.name === 'Date'); date.type = 'date'; date.dateGroup = 'quarter';
  const sales = fields.find(field => field.name === 'Sales'); sales.type = 'number'; sales.binSize = 10;
  const result = prepareRows(rows, fields);
  assert.equal(result.invalid, 2);
  assert.equal(result.rows[0]['Date (quarter)'], '2025 Q2');
  assert.equal(result.rows[0]['Sales (bin_10)'], '10–<20');
  assert.equal(result.rows[1]['Date (quarter)'], null);
  assert.equal(result.rows[1].Sales, null);
  assert.equal(result.rows[0]['Record count'], 1);
  assert.equal(prepareRows([{ Date: '2025-04-03Tgarbage' }], [{ name: 'Date', type: 'date', dateGroup: 'year', binSize: null }]).invalid, 1);
});

test('reserves a unique generated count name when the source already has one', () => {
  const rows = [{ Region: 'North', 'Record count': 7 }];
  const prepared = prepareRows(rows, inferFields(rows));
  assert.equal(prepared.countField, 'Record count (2)');
  assert.equal(prepared.rows[0]['Record count'], 7);
  assert.equal(prepared.rows[0]['Record count (2)'], 1);
});
