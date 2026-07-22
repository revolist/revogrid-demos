/** Context-menu selection caching and DOM-to-grid coordinate resolution. */
import {
  type Cell,
  type DimensionCols,
  type DimensionRows,
  type RangeArea,
} from '@revolist/revogrid';
import { type MultiRangeSelectionRange } from '@revolist/revogrid-pro';

type SpreadsheetActionCell = Pick<Cell, 'x' | 'y'> & {
  rowType?: DimensionRows;
  colType?: DimensionCols;
};

type SpreadsheetMultiRangeSelectionPlugin = {
  getSelectedRanges(): MultiRangeSelectionRange[];
  setSelectedRanges(
    ranges: MultiRangeSelectionRange[],
    activeIndex?: number,
  ): void;
};

const spreadsheetMultiRangeSelections = new WeakMap<
  HTMLRevoGridElement,
  MultiRangeSelectionRange[]
>();


/**
 * Preserves multi-range selection while a context menu receives focus.
 * Returns a cleanup callback for every DOM and grid listener installed here.
 */
export function installSpreadsheetContextSelectionGuard(
  root: HTMLElement,
  getGrid: () => HTMLRevoGridElement | null | undefined,
) {
  const selectionGrid = getGrid() ?? root.querySelector<HTMLRevoGridElement>('revo-grid');
  let snapshot: {
    ranges: MultiRangeSelectionRange[];
    activeIndex: number;
    expiresAt: number;
  } | null = null;

  const syncSelectionCache = (event: Event) => {
    const grid = (event.currentTarget as HTMLRevoGridElement | null) ?? getGrid();
    const ranges = (event as CustomEvent<{ ranges?: MultiRangeSelectionRange[] }>).detail?.ranges;
    if (!grid || !ranges) {
      return;
    }
    spreadsheetMultiRangeSelections.set(
      grid,
      ranges.map(cloneSpreadsheetSelectionRange),
    );
  };

  const rememberSelection = (event: MouseEvent) => {
    if (event.button !== 2) {
      snapshot = null;
      return;
    }

    const trigger = event.target instanceof HTMLElement
      ? event.target.closest('.rgCell') as HTMLElement | null
      : null;
    if (!trigger || !root.contains(trigger)) {
      snapshot = null;
      return;
    }

    const grid = getGrid();
    const ranges = getCachedSpreadsheetSelectionRanges(grid);
    const cell = getSpreadsheetCellFromElement(trigger);
    const activeIndex = cell ? findSpreadsheetRangeIndexForCell(ranges, cell) : -1;
    const activeRange = activeIndex >= 0 ? ranges[activeIndex] : undefined;

    if (!activeRange || (ranges.length === 1 && isSingleSpreadsheetRange(activeRange.range))) {
      snapshot = null;
      return;
    }

    snapshot = {
      ranges: ranges.map(cloneSpreadsheetSelectionRange),
      activeIndex,
      expiresAt: Date.now() + 1200,
    };
  };

  const restoreSelection = async () => {
    const current = snapshot;
    if (!current || Date.now() > current.expiresAt) {
      snapshot = null;
      return;
    }

    const grid = getGrid();
    const plugin = await getSpreadsheetMultiRangeSelectionPlugin(grid);
    plugin?.setSelectedRanges(
      current.ranges.map(cloneSpreadsheetSelectionRange),
      current.activeIndex,
    );
  };

  const restoreSelectionForContextMenu = () => {
    void restoreSelection();
    window.setTimeout(() => void restoreSelection(), 0);
  };

  selectionGrid?.addEventListener('multirangeselectionchange', syncSelectionCache);
  root.addEventListener('mousedown', rememberSelection, true);
  root.addEventListener('contextmenu', restoreSelectionForContextMenu, true);

  return () => {
    selectionGrid?.removeEventListener('multirangeselectionchange', syncSelectionCache);
    root.removeEventListener('mousedown', rememberSelection, true);
    root.removeEventListener('contextmenu', restoreSelectionForContextMenu, true);
  };
}

async function getSpreadsheetMultiRangeSelectionPlugin(
  grid?: HTMLRevoGridElement | null,
): Promise<SpreadsheetMultiRangeSelectionPlugin | undefined> {
  const plugins = await grid?.getPlugins?.();
  const plugin = plugins?.find(isSpreadsheetMultiRangeSelectionPlugin);
  return isSpreadsheetMultiRangeSelectionPlugin(plugin) ? plugin : undefined;
}

function isSpreadsheetMultiRangeSelectionPlugin(
  plugin: unknown,
): plugin is SpreadsheetMultiRangeSelectionPlugin {
  return (
    typeof plugin === 'object' &&
    plugin !== null &&
    typeof (plugin as SpreadsheetMultiRangeSelectionPlugin).getSelectedRanges === 'function' &&
    typeof (plugin as SpreadsheetMultiRangeSelectionPlugin).setSelectedRanges === 'function'
  );
}

export function getCachedSpreadsheetSelectionRanges(
  grid?: HTMLRevoGridElement | null,
) {
  return grid
    ? spreadsheetMultiRangeSelections.get(grid)?.map(cloneSpreadsheetSelectionRange) ?? []
    : [];
}


export function getSpreadsheetCellFromElement(element: HTMLElement | null | undefined): SpreadsheetActionCell | undefined {
  const row = readSpreadsheetDataIndex(element, ['data-rgrow', 'data-rgRow']);
  const column = readSpreadsheetDataIndex(element, ['data-rgcol', 'data-rgCol']);
  if (row !== undefined && column !== undefined) {
    const dataProvider = element?.closest?.('revogr-data') as HTMLElement | null | undefined;
    const rowType = readSpreadsheetRowType(dataProvider?.getAttribute('type'));
    const colType = readSpreadsheetColumnType(dataProvider?.getAttribute('col-type'));
    return { x: column, y: row, rowType, colType };
  }
}

export function findSpreadsheetRangeIndexForCell(
  ranges: MultiRangeSelectionRange[],
  cell: SpreadsheetActionCell,
) {
  return ranges.findIndex(item => (
    isDataSelectionRange(item)
    && spreadsheetRangeMatchesCellProvider(item, cell)
    && spreadsheetRangeContainsCell(item.range, cell)
  ));
}

function isDataSelectionRange(range: Pick<MultiRangeSelectionRange, 'rowType' | 'colType'>) {
  return range.rowType === 'rgRow' && isSpreadsheetColumnType(range.colType);
}

function spreadsheetRangeMatchesCellProvider(
  range: Pick<MultiRangeSelectionRange, 'rowType' | 'colType'>,
  cell: SpreadsheetActionCell,
) {
  return (!cell.rowType || range.rowType === cell.rowType)
    && (!cell.colType || range.colType === cell.colType);
}

function spreadsheetRangeContainsCell(range: RangeArea, cell: Pick<Cell, 'x' | 'y'>) {
  const normalized = normalizeSelectionRange(range);
  return Boolean(
    normalized
    && cell.x >= normalized.x
    && cell.x <= normalized.x1
    && cell.y >= normalized.y
    && cell.y <= normalized.y1,
  );
}

export function isSingleSpreadsheetRange(range: RangeArea) {
  const normalized = normalizeSelectionRange(range);
  return !normalized || (normalized.x === normalized.x1 && normalized.y === normalized.y1);
}

function cloneSpreadsheetSelectionRange(range: MultiRangeSelectionRange): MultiRangeSelectionRange {
  return {
    rowType: range.rowType,
    colType: range.colType,
    range: { ...range.range },
  };
}

function readSpreadsheetRowType(value: string | null | undefined): DimensionRows | undefined {
  return value === 'rgRow' || value === 'rowPinStart' || value === 'rowPinEnd'
    ? value
    : undefined;
}

function readSpreadsheetColumnType(value: string | null | undefined): DimensionCols | undefined {
  return isSpreadsheetColumnType(value) ? value : undefined;
}

function isSpreadsheetColumnType(value: unknown): value is DimensionCols {
  return value === 'rgCol' || value === 'colPinStart' || value === 'colPinEnd';
}

export function readSpreadsheetDataIndex(element: HTMLElement | null | undefined, names: string[]) {
  if (!element) {
    return;
  }
  for (const name of names) {
    const value = element.getAttribute(name);
    if (value !== null) {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? undefined : parsed;
    }
  }
}



function normalizeSelectionRange(range: RangeArea) {
  return {
    x: Math.min(range.x, range.x1),
    y: Math.min(range.y, range.y1),
    x1: Math.max(range.x, range.x1),
    y1: Math.max(range.y, range.y1),
  };
}
