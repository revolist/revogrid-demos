import {
  createSpreadsheetWorkbookFromGridSource,
} from './spreadsheet/workbook';
import type { SpreadsheetWorkbook } from './spreadsheet/models';
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

function getRowDiff(
  baselineRow: Record<string, unknown> | undefined,
  targetRow: Record<string, unknown> | undefined,
): SpreadsheetGridDiff {
  if (!targetRow) {
    return {};
  }
  if (!baselineRow) {
    return { ...targetRow };
  }

  const keys = new Set<string>([
    ...Object.keys(baselineRow),
    ...Object.keys(targetRow),
  ]);
  const diff: SpreadsheetGridDiff = {};

  keys.forEach((key) => {
    if (baselineRow[key] !== targetRow[key]) {
      diff[key] = targetRow[key];
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
): boolean {
  const dataStore = providers?.data?.stores?.[rowType];
  if (!dataStore) {
    return false;
  }
  const source = dataStore.store.get('source');
  const currentRow = source[rowIndex] as Record<string, unknown> | undefined;
  if (currentRow == null) {
    return false;
  }
  source[rowIndex] = {
    ...currentRow,
    ...rowDiff,
  };
  return true;
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
  const dataStore = providers?.data?.stores?.[rowType];
  const providerSource = dataStore?.store?.get?.('source');
  const targetRows = targetWorkbook.rows;
  const canWriteRowStore = Array.isArray(providerSource);
  let didUpdate = false;

  const simulationSourceRows = sourceWorkbook.rows;
  const maxRows = Math.max(simulationSourceRows.length, targetRows.length);

  for (let rowIndex = 0; rowIndex < maxRows; rowIndex += 1) {
    const simulationSourceRow = simulationSourceRows[rowIndex] as Record<string, unknown> | undefined;
    const nextRow = targetRows[rowIndex] as Record<string, unknown> | undefined;
    // Derive only the simulation's change. Comparing against the live provider
    // row would misclassify newer local values as stale fields to overwrite.
    const rowDiff = getRowDiff(simulationSourceRow, nextRow);

    if (Object.keys(rowDiff).length === 0) {
      continue;
    }

    if (!canWriteRowStore) {
      continue;
    }
    didUpdate = applySpreadsheetGridRowUpdates(
      rowIndex,
      rowDiff,
      providers,
      rowType,
    ) || didUpdate;
  }

  if (!canWriteRowStore || !dataStore) {
    return createSpreadsheetWorkbookFromGridSource(targetWorkbook, targetWorkbook.rows);
  }

  if (didUpdate) {
    providers?.data?.refresh?.(rowType);
  }

  const nextGridRows = dataStore.store.get('source');
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
