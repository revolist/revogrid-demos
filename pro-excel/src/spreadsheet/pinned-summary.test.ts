import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateRawValuesFormula } from '@revolist/revogrid-pro';
import { getSpreadsheetLeafColumns } from './columns';
import {
  createSpreadsheetFormulaNames,
  createSpreadsheetPinnedBottomSource,
  createSpreadsheetRows,
} from './data';
import { preventReadonlySpreadsheetEdit } from './interaction-edit-guards';
import { createSpreadsheetColumns } from './workbook';

test('creates a live, finite aggregate Margin for the pinned summary', () => {
  const rows = createSpreadsheetRows('budget');
  const formulaNames = createSpreadsheetFormulaNames(rows);
  const columns = getSpreadsheetLeafColumns(createSpreadsheetColumns(rows, formulaNames));
  const summary = createSpreadsheetPinnedBottomSource(rows)[0];
  const evaluateMargin = () => Number(evaluateRawValuesFormula(
    String(summary.margin),
    rows,
    columns,
    { names: formulaNames.names },
  ));
  const initialMargin = evaluateMargin();

  assert.equal(Number.isFinite(initialMargin), true);
  rows[0].target = Number(rows[0].target) * 2;
  const editedMargin = evaluateMargin();
  assert.equal(Number.isFinite(editedMargin), true);
  assert.notEqual(editedMargin, initialMargin);
});

test('creates a live aggregate Variance for the pinned summary', () => {
  const rows = createSpreadsheetRows('budget');
  const formulaNames = createSpreadsheetFormulaNames(rows);
  const columns = getSpreadsheetLeafColumns(createSpreadsheetColumns(rows, formulaNames));
  const summary = createSpreadsheetPinnedBottomSource(rows)[0];
  const evaluateVariance = () => Number(evaluateRawValuesFormula(
    String(summary.variance),
    rows,
    columns,
    { names: formulaNames.names },
  ));

  assert.equal(evaluateVariance(), -102_000);
  rows[0].target = Number(rows[0].target) + 1_000;
  assert.equal(evaluateVariance(), -103_000);
});

test('makes every pinned summary column readonly while body inputs stay editable', () => {
  const rows = createSpreadsheetRows('budget');
  const columns = getSpreadsheetLeafColumns(createSpreadsheetColumns(rows));
  const readonlyAt = (column: typeof columns[number], type: 'rgRow' | 'rowPinEnd') => (
    typeof column.readonly === 'function'
      ? column.readonly({ type } as never)
      : column.readonly === true
  );

  assert.deepEqual(columns.filter(column => !readonlyAt(column, 'rowPinEnd')).map(column => column.prop), []);
  assert.equal(readonlyAt(columns.find(column => column.prop === 'owner')!, 'rgRow'), false);
  assert.equal(readonlyAt(columns.find(column => column.prop === 'status')!, 'rgRow'), false);
});

test('blocks pinned dropdown editing before dropdown-specific exceptions', () => {
  const rows = createSpreadsheetRows('budget');
  const columns = getSpreadsheetLeafColumns(createSpreadsheetColumns(rows));
  const status = columns.find(column => column.prop === 'status')!;
  let prevented = false;
  let stopped = false;
  const event = {
    detail: { type: 'rowPinEnd', prop: 'status', column: status },
    preventDefault: () => { prevented = true; },
    stopImmediatePropagation: () => { stopped = true; },
  } as unknown as Event;

  assert.equal(preventReadonlySpreadsheetEdit(event, columns), true);
  assert.equal(prevented, true);
  assert.equal(stopped, true);
});
