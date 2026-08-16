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

test('creates meaningful aggregates for every pinned summary column', () => {
  const rows = createSpreadsheetRows('budget');
  const formulaNames = createSpreadsheetFormulaNames(rows);
  const columns = getSpreadsheetLeafColumns(createSpreadsheetColumns(rows, formulaNames));
  const summary = createSpreadsheetPinnedBottomSource(rows)[0];
  const evaluate = (prop: string) => evaluateRawValuesFormula(
    String(summary[prop]),
    rows,
    columns,
    { names: formulaNames.names },
  );
  const sum = (prop: string) => rows.reduce((total, row) => total + Number(row[prop]), 0);
  const jan = sum('jan');
  const feb = sum('feb');
  const mar = sum('mar');
  const target = sum('target');
  const actual = jan + feb + mar;
  assert.deepEqual({ jan, feb, mar, actual, target }, {
    jan: 3_805_000,
    feb: 4_098_000,
    mar: 4_448_000,
    actual: 12_351_000,
    target: 12_453_000,
  });
  assert.deepEqual(
    rows.reduce<Record<string, number>>((counts, row) => {
      const status = String(row.status);
      counts[status] = (counts[status] ?? 0) + 1;
      return counts;
    }, {}),
    { Forecast: 12, Committed: 13, Watch: 11, Blocked: 4 },
  );
  assert.equal(summary.department, 'Total - 40 rows');
  assert.equal(summary.owner, '');
  assert.equal(evaluate('jan'), jan);
  assert.equal(evaluate('feb'), feb);
  assert.equal(evaluate('mar'), mar);
  assert.equal(evaluate('total'), actual);
  assert.equal(evaluate('target'), target);
  assert.equal(evaluate('variance'), actual - target);
  assert.equal(evaluate('margin'), actual / target);
  assert.equal(evaluate('variance'), -102_000);
  assert.equal(evaluate('margin'), 0.9918092026017827);
  assert.equal(summary.trend, '=IF(SUM(JanuaryActuals)=0,0,(SUM(MarchActuals)-SUM(JanuaryActuals))/SUM(JanuaryActuals))');
  assert.equal(summary.status, '=(COUNTIF(K1:K40,"Watch")+COUNTIF(K1:K40,"Blocked"))');
  assert.ok(Math.abs(Number(evaluate('trend')) - (mar - jan) / jan) < Number.EPSILON);
  assert.equal(evaluate('trend'), 0.16898817345597897);
  assert.equal(evaluate('status'), 15);

  const statusColumn = columns.find(column => column.prop === 'status')!;
  const rendered = statusColumn.cellTemplate?.(
    (tag: string, props: Record<string, unknown>, children?: unknown) => ({ tag, props, children }) as never,
    {
      column: statusColumn,
      model: summary,
      prop: 'status',
      value: 15,
      type: 'rowPinEnd',
      rowIndex: 0,
      colIndex: 8,
      colType: 'rgCol',
      data: [summary],
    } as never,
  ) as unknown as { props?: Record<string, unknown>; children?: unknown };

  assert.equal(rendered.children, '15 at risk');
  assert.equal(rendered.props?.['aria-label'], 'Governance summary: 15 at risk');

  rows[0].mar = Number(rows[0].mar) + 10_000;
  rows[0].status = 'Blocked';
  assert.ok(Math.abs(Number(evaluate('trend')) - ((mar + 10_000) - jan) / jan) < Number.EPSILON);
  assert.equal(evaluate('status'), 16);
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
