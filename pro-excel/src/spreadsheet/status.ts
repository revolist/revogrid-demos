/** Human-readable workbook, selection, and clipboard summaries. */
import type { ColumnData, RangeArea } from '@revolist/revogrid';
import type { SpreadsheetWorkbook } from './models';

type SpreadsheetRangeSummary = RangeArea | { range: RangeArea };

export function summarizeSelection(ranges: SpreadsheetRangeSummary[]) {
  const normalizedRanges = ranges
    .map(range => ('range' in range ? range.range : range))
    .filter(Boolean);

  if (!normalizedRanges.length) {
    return 'No ranges selected';
  }
  const cells = normalizedRanges.reduce(
    (total, range) => total + (Math.abs(range.x1 - range.x) + 1) * (Math.abs(range.y1 - range.y) + 1),
    0,
  );
  return `${normalizedRanges.length} range${normalizedRanges.length === 1 ? '' : 's'} selected, ${cells} cells`;
}

export function summarizeClipboardMatrix(matrix: unknown[][] | undefined) {
  if (!matrix?.length) {
    return 'Clipboard is empty';
  }
  return `${matrix.length} rows x ${matrix[0]?.length ?? 0} columns`;
}

export function formatWorkbookStatus(workbook: SpreadsheetWorkbook) {
  if (workbook.imported) {
    return workbook.rows.length
      ? `Imported ${workbook.rows.length} rows from ${workbook.name}`
      : `No values found in ${workbook.name}`;
  }
  if (workbook.sheetKey === 'empty') {
    return `${workbook.name}: ${workbook.rows.length} blank rows x ${countSpreadsheetLeafColumns(workbook.columns)} columns`;
  }
  return `${workbook.name}: ${workbook.rows.length} live rows with formulas and named ranges`;
}

function countSpreadsheetLeafColumns(columns: ColumnData): number {
  return columns.reduce((count, column) => (
    'children' in column && Array.isArray(column.children)
      ? count + countSpreadsheetLeafColumns(column.children)
      : count + 1
  ), 0);
}
