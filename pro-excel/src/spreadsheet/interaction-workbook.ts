/** Workbook mutations shared by edit and context-menu interactions. */
import {
  type ColumnData,
  type ColumnProp,
  type DataType,
} from '@revolist/revogrid';
import {
  type FormulaNamesConfig,
  type MergeData,
} from '@revolist/revogrid-pro';
import { getSpreadsheetLeafColumns } from './columns';
import {
  createEmptySpreadsheetFormulaNames,
  createSpreadsheetFormulaNames,
  createSpreadsheetPinnedBottomSource,
} from './data';
import {
  type SpreadsheetContextMenuController,
  type SpreadsheetWorkbook,
} from './models';
import { createSpreadsheetColumns } from './workbook';

type SpreadsheetGridWithWorkbookProps = HTMLRevoGridElement & {
  cellMerge?: MergeData[];
  formulaNames?: FormulaNamesConfig;
};

export function applySpreadsheetRows(controller: SpreadsheetContextMenuController, rows: DataType[]) {
  const current = controller.getWorkbook?.();
  if (!current) {
    const grid = controller.getGrid?.();
    if (grid) {
      grid.source = rows;
    }
    return;
  }

  const formulaNames = current.imported
    ? createEmptySpreadsheetFormulaNames()
    : createSpreadsheetFormulaNames(rows);
  const columns = current.imported
    ? current.columns
    : createSpreadsheetColumns(rows, formulaNames);
  const pinnedBottomSource = current.imported
    ? []
    : createSpreadsheetPinnedBottomSource(rows);
  const cellMerge = trimSpreadsheetCellMerge(
    current.cellMerge,
    rows.length,
    getSpreadsheetLeafColumns(columns).length,
  );

  applySpreadsheetWorkbookToController(controller, {
    ...current,
    rows,
    formulaNames,
    columns,
    pinnedBottomSource,
    cellMerge,
  });
}

export function applySpreadsheetCellMerge(
  controller: SpreadsheetContextMenuController,
  updater: (current: MergeData[]) => MergeData[],
) {
  const current = controller.getWorkbook?.();
  const grid = controller.getGrid?.() as SpreadsheetGridWithWorkbookProps | null | undefined;
  const nextMerge = updater([...(current?.cellMerge ?? grid?.cellMerge ?? [])]);

  if (current) {
    applySpreadsheetWorkbookToController(controller, {
      ...current,
      cellMerge: nextMerge,
    });
    return;
  }

  if (grid) {
    grid.cellMerge = nextMerge;
  }
}

export function applySpreadsheetColumns(
  controller: SpreadsheetContextMenuController,
  columns: ColumnData,
) {
  const current = controller.getWorkbook?.();
  const grid = controller.getGrid?.();
  if (current) {
    applySpreadsheetWorkbookToController(controller, {
      ...current,
      columns,
    });
    return;
  }
  if (grid) {
    grid.columns = columns;
  }
}

export function applySpreadsheetWorkbookToController(
  controller: SpreadsheetContextMenuController,
  workbook: SpreadsheetWorkbook,
) {
  controller.setWorkbook?.(workbook);
  const grid = controller.getGrid?.() as SpreadsheetGridWithWorkbookProps | null | undefined;
  if (!grid) {
    return;
  }

  grid.formulaNames = workbook.formulaNames;
  grid.source = workbook.rows;
  grid.pinnedBottomSource = workbook.pinnedBottomSource;
  grid.columns = workbook.columns;
  grid.cellMerge = workbook.cellMerge;
}

export function createBlankSpreadsheetContextRow(
  columns: ColumnData,
  rows: DataType[],
  insertAt: number,
  imported: boolean,
): DataType {
  const props = getSpreadsheetLeafColumns(columns).map(column => column.prop);
  if (!imported && hasBudgetWorkbookProps(props)) {
    const n = insertAt + 1;
    return {
      id: createNextSpreadsheetRowId(rows),
      department: 'New department',
      owner: 'Unassigned',
      jan: 0,
      feb: 0,
      mar: 0,
      total: `=SUM(C${n}:E${n})`,
      target: 0,
      variance: `=F${n}-G${n}`,
      margin: `=IF(G${n}=0,0,F${n}/G${n})`,
      status: 'Forecast',
    };
  }

  return props.reduce<DataType>((row, prop) => {
    row[prop] = String(prop) === 'id' ? createNextSpreadsheetRowId(rows) : '';
    return row;
  }, {});
}

function createNextSpreadsheetRowId(rows: DataType[]) {
  return rows.reduce((max, row) => {
    const value = Number(row?.id);
    return Number.isFinite(value) && value > max ? value : max;
  }, 0) + 1;
}

function hasBudgetWorkbookProps(props: ColumnProp[]) {
  const propSet = new Set(props.map(prop => String(prop)));
  return ['department', 'owner', 'jan', 'feb', 'mar', 'total', 'target', 'variance', 'margin', 'status']
    .every(prop => propSet.has(prop));
}

function trimSpreadsheetCellMerge(merge: MergeData[], rowCount: number, columnCount: number) {
  return merge.filter((item) => {
    if (item.rowType && item.rowType !== 'rgRow') {
      return true;
    }
    if (item.colType && item.colType !== 'rgCol') {
      return true;
    }
    return item.row >= 0
      && item.column >= 0
      && item.row < rowCount
      && item.column < columnCount;
  });
}
