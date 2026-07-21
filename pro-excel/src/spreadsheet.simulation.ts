import {
  createSpreadsheetWorkbookFromGridSource,
  type SpreadsheetWorkbook,
} from './spreadsheet.shared';
import type { DimensionRows, DataType } from '@revolist/revogrid';

type SpreadsheetGridDiff = {
  [prop: string]: unknown;
};

function getSpreadsheetSourceRows(
  grid: HTMLRevoGridElement | null | undefined,
  fallbackRows: DataType[] = [],
): DataType[] {
  const rows = grid?.source;
  return rows?.length
    ? [...rows]
    : [...fallbackRows];
}

function buildWorkbookRowsFromGrid(
  grid: HTMLRevoGridElement | null | undefined,
  fallbackRows: DataType[] = [],
): DataType[] {
  return getSpreadsheetSourceRows(grid, fallbackRows);
}

function getRowDiff(
  currentRow: Record<string, unknown> | undefined,
  nextRow: Record<string, unknown> | undefined,
): SpreadsheetGridDiff {
  if (!nextRow) {
    return {};
  }
  if (!currentRow) {
    return { ...nextRow };
  }

  const keys = new Set<string>([
    ...Object.keys(currentRow),
    ...Object.keys(nextRow),
  ]);
  const diff: SpreadsheetGridDiff = {};

  keys.forEach((key) => {
    if (currentRow[key] !== nextRow[key]) {
      diff[key] = nextRow[key];
    }
  });

  return diff;
}

function applySpreadsheetGridRowUpdates(
  rowIndex: number,
  rowDiff: SpreadsheetGridDiff,
  providers: {
    data?: {
      stores?: Record<DimensionRows, any>;
    };
  } | undefined,
  rowType: DimensionRows,
) {
  const dataStore = providers?.data?.stores?.[rowType];
  if (!dataStore) {
    return;
  }
  const source = dataStore.store.get('source');
  const currentRow = source[rowIndex] as Record<string, unknown> | undefined;
  if (currentRow == null) {
    return;
  }
  const nextRow = {
    ...currentRow,
    ...rowDiff,
  };

  dataStore.setSourceData({ [rowIndex]: nextRow }, false);
}

export async function syncSpreadsheetSimulationResultToGrid(
  grid: HTMLRevoGridElement | null | undefined,
  sourceWorkbook: SpreadsheetWorkbook,
  targetWorkbook: SpreadsheetWorkbook,
  options: {
    rowType?: DimensionRows;
  } = {},
): Promise<SpreadsheetWorkbook> {
  const rowType: DimensionRows = options.rowType ?? 'rgRow';
  if (!grid) {
    return createSpreadsheetWorkbookFromGridSource(targetWorkbook, targetWorkbook.rows);
  }

  const providers = await grid.getProviders?.();
  const sourceRows = buildWorkbookRowsFromGrid(grid, sourceWorkbook.rows);
  const targetRows = targetWorkbook.rows;
  const dataStore = providers?.data?.stores?.[rowType];
  const canWriteRowStore = Boolean(dataStore?.setSourceData);

  const maxRows = Math.max(sourceRows.length, targetRows.length);

  for (let rowIndex = 0; rowIndex < maxRows; rowIndex += 1) {
    const currentRow = sourceRows[rowIndex] as Record<string, unknown> | undefined;
    const nextRow = targetRows[rowIndex] as Record<string, unknown> | undefined;
    const rowDiff = getRowDiff(currentRow, nextRow);

    if (Object.keys(rowDiff).length === 0) {
      continue;
    }

    if (!canWriteRowStore) {
      continue;
    }
    applySpreadsheetGridRowUpdates(
      rowIndex,
      rowDiff,
      providers,
      rowType,
    );
  }

  if (!canWriteRowStore || !dataStore) {
    return createSpreadsheetWorkbookFromGridSource(targetWorkbook, targetWorkbook.rows);
  }

  dataStore.store.set('source', [...dataStore.store.get('source')]);

  const nextGridRows = buildWorkbookRowsFromGrid(grid, targetRows);
  return createSpreadsheetWorkbookFromGridSource(targetWorkbook, nextGridRows);
}

export function hasSpreadsheetSimulationDataChange(result: { flash?: unknown }): boolean {
  return Boolean(result.flash);
}

export function shouldDeferSpreadsheetSimulationDataUpdate(
  grid: HTMLRevoGridElement | null | undefined,
  root?: HTMLElement | null,
  doc: Document | undefined = typeof document !== 'undefined' ? document : undefined,
): boolean {
  const activeElement = doc?.activeElement as HTMLElement | null | undefined;
  if (!activeElement) {
    return false;
  }

  const isEditableElement = activeElement.matches('input, textarea, select, [contenteditable="true"]');
  if (!isEditableElement) {
    return false;
  }

  // Remote demo writes update the provider directly, but any source refresh while
  // an editor owns focus can still recreate editor DOM and reset the caret.
  return Boolean(grid?.contains(activeElement) || root?.contains(activeElement));
}

export function getSpreadsheetGridRowsForSimulation(
  grid: HTMLRevoGridElement | null | undefined,
  fallbackRows: DataType[] = [],
): DataType[] {
  return getSpreadsheetSourceRows(grid, fallbackRows);
}
