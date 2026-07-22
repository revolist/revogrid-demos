import assert from 'node:assert/strict';
import test from 'node:test';
import type { CellProps, ColumnRegular } from '@revolist/revogrid';
import { getSpreadsheetLeafColumns } from './columns';
import {
  applySpreadsheetCellFormatting,
  toggleSpreadsheetFocusedCellFormat,
} from './formatting';
import { createSpreadsheetWorkbook } from './workbook';

test('toggles formatting on the focused body cell and preserves existing cell classes', () => {
  const workbook = createSpreadsheetWorkbook();
  const row = workbook.rows[0];
  const column = getSpreadsheetLeafColumns(workbook.columns).find(item => item.prop === 'owner')!;

  const applied = toggleSpreadsheetFocusedCellFormat(workbook, {
    model: row,
    rowType: 'rgRow',
    column,
  });
  const displayColumn = getSpreadsheetLeafColumns(
    applySpreadsheetCellFormatting([{ ...column, cellProperties: () => ({ class: 'existing' }) }]),
  )[0] as ColumnRegular;
  const appliedProps = displayColumn.cellProperties?.({
    model: applied.workbook.rows[0],
    prop: 'owner',
  } as never);

  assert.equal(applied.formatted, true);
  assert.equal(applied.workbook.rows[0] === row, false);
  assert.equal((appliedProps as CellProps | undefined)?.class, 'existing spreadsheet-cell-formatted');

  const removed = toggleSpreadsheetFocusedCellFormat(applied.workbook, {
    model: applied.workbook.rows[0],
    rowType: 'rgRow',
    column,
  });
  const removedProps = displayColumn.cellProperties?.({
    model: removed.workbook.rows[0],
    prop: 'owner',
  } as never);

  assert.equal(removed.formatted, false);
  assert.equal((removedProps as CellProps | undefined)?.class, 'existing');
});

test('asks for a body-cell selection without changing the workbook', () => {
  const workbook = createSpreadsheetWorkbook();
  const result = toggleSpreadsheetFocusedCellFormat(workbook, null);

  assert.equal(result.workbook, workbook);
  assert.equal(result.formatted, false);
  assert.match(result.message, /Select a workbook cell/);
});

test('resolves a rendered model clone by its stable row id', () => {
  const workbook = createSpreadsheetWorkbook();
  const column = getSpreadsheetLeafColumns(workbook.columns).find(item => item.prop === 'target')!;
  const result = toggleSpreadsheetFocusedCellFormat(workbook, {
    model: { ...workbook.rows[3] },
    rowType: 'rgRow',
    column,
    cell: { y: 3 },
  });

  assert.equal(result.formatted, true);
  assert.equal(result.workbook.rows[3].id, workbook.rows[3].id);
  assert.notEqual(result.workbook.rows[3], workbook.rows[3]);
});

test('carries the cell format into Excel export and preserves existing export options', () => {
  const workbook = createSpreadsheetWorkbook();
  const baseColumn = getSpreadsheetLeafColumns(workbook.columns).find(item => item.prop === 'target')!;
  const applied = toggleSpreadsheetFocusedCellFormat(workbook, {
    model: workbook.rows[0],
    rowType: 'rgRow',
    column: baseColumn,
  });
  const displayColumn = getSpreadsheetLeafColumns(applySpreadsheetCellFormatting([{
    ...baseColumn,
    excelExport: {
      cellProperties: () => ({ format: '$#,##0', align: 'right' }),
    },
  }]))[0];

  const exported = displayColumn.excelExport?.cellProperties?.({
    model: applied.workbook.rows[0],
    column: displayColumn,
  } as never);

  assert.deepEqual(exported, {
    format: '$#,##0',
    align: 'right',
    backgroundColor: '#FFF1A8',
    borderColor: '#D49B00',
    borderStyle: 'thin',
    fontWeight: 'bold',
  });
});
