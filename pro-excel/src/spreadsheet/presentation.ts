/** Display shaping, autofill behavior, freeze panes, and workbook insights. */
import type {
  CellProps,
  CellTemplateProp,
  ColumnData,
  ColumnGrouping,
  ColumnProp,
  ColumnRegular,
  DataType,
  RangeArea,
  RowHeaders,
} from '@revolist/revogrid';
import { rowHeaders, type AutoFillStrategy } from '@revolist/revogrid-pro';
import { appendSpreadsheetCellClass, getSpreadsheetLeafColumns } from './columns';
import { applySpreadsheetCellFormatting } from './formatting';
import type { SpreadsheetInsight, SpreadsheetWorkbook } from './models';
import { summarizeSelection } from './status';
import { formatCurrencyValue } from './workbook';

const SPREADSHEET_AUTOFILL_CURRENCY_PROPS = new Set<ColumnProp>(['jan', 'feb', 'mar', 'target']);
const registeredSpreadsheetAutofillPlugins = new WeakSet<object>();

type SpreadsheetRowFocusEvent = Event & {
  detail?: {
    rowIndex?: number;
    providers?: { type?: string };
  };
};

/** Derives display-only columns without mutating the workbook schema. */
export function createSpreadsheetDisplayColumns(
  workbook: SpreadsheetWorkbook,
  options: { freezePane?: boolean; searchQuery?: string } = {},
): ColumnData {
  const frozenColumns = options.freezePane !== false
    ? setSpreadsheetFreezePane(workbook.columns, true)
    : workbook.columns;
  return applySpreadsheetSearchHighlight(
    applySpreadsheetCellFormatting(frozenColumns),
    options.searchQuery ?? '',
  );
}

export function createSpreadsheetRowHeaders(): RowHeaders {
  const baseRowHeaders = rowHeaders({
    showHeaderFocusBtn: false,
    rowDrag: ({ type }) => type === 'rgRow',
  });
  const baseCellTemplate = baseRowHeaders.cellTemplate;

  return {
    ...baseRowHeaders,
    size: 48,
    cellTemplate: (h, data, additionalData) => (
      data.providers.type === 'rowPinEnd'
        ? h('div', { class: 'grow', 'aria-hidden': 'true' })
        : baseCellTemplate?.(h, data, additionalData)
    ),
  };
}

/** Registers the currency-copy autofill strategy once per AutoFillPlugin instance. */
export async function installSpreadsheetAutofillStrategy(grid: HTMLRevoGridElement | null | undefined) {
  const plugins = await grid?.getPlugins?.();
  const autofillPlugin = plugins?.find(plugin => (
    plugin?.constructor?.name === 'AutoFillPlugin'
    && typeof (plugin as { registerStrategy?: unknown }).registerStrategy === 'function'
  )) as { registerStrategy: (strategy: AutoFillStrategy) => void } | undefined;

  if (!autofillPlugin || registeredSpreadsheetAutofillPlugins.has(autofillPlugin)) {
    return;
  }

  autofillPlugin.registerStrategy(spreadsheetCurrencyCopyAutofillStrategy);
  registeredSpreadsheetAutofillPlugins.add(autofillPlugin);
}

const spreadsheetCurrencyCopyAutofillStrategy: AutoFillStrategy = (
  selectedData,
  _direction,
  targetRange,
  context,
) => {
  if (!context) {
    return null;
  }

  const sourceColumns = getSpreadsheetAutofillColumns(context.oldRange, context);
  const targetColumns = getSpreadsheetAutofillColumns(context.newRange, context);
  const allColumns = [...sourceColumns, ...targetColumns];
  if (!allColumns.length || !allColumns.every(column => SPREADSHEET_AUTOFILL_CURRENCY_PROPS.has(column.prop))) {
    return null;
  }

  // Budget actuals are currency inputs. Copy raw numeric values instead of
  // treating month values as an arithmetic sequence.
  return repeatSpreadsheetMatrix(selectedData, targetRange);
};

function getSpreadsheetAutofillColumns(
  range: RangeArea,
  context: NonNullable<Parameters<AutoFillStrategy>[3]>,
): ColumnRegular[] {
  const columns: ColumnRegular[] = [];
  for (let x = range.x; x <= range.x1; x += 1) {
    const column = context.providers.column.getColumn(x, context.colType) as ColumnRegular | undefined;
    if (column) {
      columns.push(column);
    }
  }
  return columns;
}

function repeatSpreadsheetMatrix<T>(selectedData: T[][], targetRange: RangeArea): T[][] {
  const values = selectedData.flat();
  if (!values.length) {
    return [];
  }

  const rows = targetRange.y1 - targetRange.y + 1;
  const cols = targetRange.x1 - targetRange.x + 1;
  return Array.from({ length: rows }, (_, rowIndex) => (
    Array.from({ length: cols }, (_, colIndex) => values[(rowIndex * cols + colIndex) % values.length])
  ));
}

export function summarizeSpreadsheetRowHeaderFocus(
  event: Event,
  columns: ColumnData,
) {
  const detail = (event as SpreadsheetRowFocusEvent).detail;
  if (detail?.providers?.type && detail.providers.type !== 'rgRow') {
    return;
  }
  const rowIndex = Number(detail?.rowIndex);
  if (!Number.isInteger(rowIndex) || rowIndex < 0) {
    return;
  }
  const columnCount = Math.max(getSpreadsheetLeafColumns(columns).length, 1);
  return summarizeSelection([
    {
      x: 0,
      y: rowIndex,
      x1: columnCount - 1,
      y1: rowIndex,
    },
  ]);
}

/** Returns a cloned column tree with the leading planning columns pinned or unpinned. */
export function setSpreadsheetFreezePane(columns: ColumnData, freezePane: boolean): ColumnData {
  const props = getSpreadsheetFreezeProps(columns);
  if (!props.size) {
    return columns;
  }

  return updateSpreadsheetColumnsByProps(columns, props, (column) => {
    if (!freezePane) {
      const { pin: _pin, ...rest } = column;
      return rest;
    }
    return { ...column, pin: 'colPinStart' };
  });
}

export function createSpreadsheetInsights(workbook: SpreadsheetWorkbook): SpreadsheetInsight[] {
  if (workbook.imported) {
    const leafColumns = getSpreadsheetLeafColumns(workbook.columns);
    const filledCells = workbook.rows.reduce((total, row) => (
      total + leafColumns.filter(column => String(row[column.prop] ?? '').trim() !== '').length
    ), 0);
    return [
      { label: 'Imported rows', value: String(workbook.rows.length), tone: 'neutral' },
      { label: 'Inferred columns', value: String(leafColumns.length), tone: 'neutral' },
      { label: 'Filled values', value: String(filledCells), tone: 'positive' },
    ];
  }
  if (workbook.sheetKey === 'empty') {
    const leafColumns = getSpreadsheetLeafColumns(workbook.columns);
    const filledCells = workbook.rows.reduce((total, row) => (
      total + leafColumns.filter(column => String(row[column.prop] ?? '').trim() !== '').length
    ), 0);
    return [
      { label: 'Blank rows', value: String(workbook.rows.length), tone: 'neutral' },
      { label: 'Columns', value: String(leafColumns.length), tone: 'neutral' },
      { label: 'Filled values', value: String(filledCells), tone: filledCells ? 'positive' : 'neutral' },
    ];
  }

  const actualTotal = workbook.rows.reduce((total, row) => (
    total + numberValue(row.jan) + numberValue(row.feb) + numberValue(row.mar)
  ), 0);
  const targetTotal = workbook.rows.reduce((total, row) => total + numberValue(row.target), 0);
  const gap = actualTotal - targetTotal;
  const atRisk = workbook.rows.filter(row => ['Watch', 'Blocked'].includes(String(row.status))).length;

  return [
    { label: 'Q1 actuals', value: formatCurrencyValue(actualTotal), tone: 'positive' },
    { label: 'Gap to target', value: formatCurrencyValue(gap), tone: gap < 0 ? 'negative' : 'positive' },
    { label: 'At risk rows', value: String(atRisk), tone: atRisk ? 'warning' : 'neutral' },
  ];
}

export function countSpreadsheetSearchMatches(
  rows: DataType[],
  columns: ColumnData,
  searchQuery: string,
): number {
  const query = normalizeSpreadsheetSearchQuery(searchQuery);
  if (!query) {
    return 0;
  }

  const leafColumns = getSpreadsheetLeafColumns(columns);
  return rows.reduce((total, row) => (
    total + leafColumns.filter(column => doesSpreadsheetValueMatchSearch(row[column.prop], query)).length
  ), 0);
}

export function formatSpreadsheetSearchStatus(searchQuery: string, matches: number) {
  const query = searchQuery.trim();
  if (!query) {
    return 'Find is ready';
  }
  return `${matches} match${matches === 1 ? '' : 'es'} for "${query}"`;
}

export function updateSpreadsheetColumnsByProps(
  columns: ColumnData,
  props: Set<ColumnProp>,
  updater: (column: ColumnRegular) => ColumnRegular,
): ColumnData {
  return columns.map(column => {
    if (isSpreadsheetColumnGroup(column)) {
      return {
        ...column,
        children: updateSpreadsheetColumnsByProps(column.children, props, updater),
      };
    }

    return props.has(column.prop) ? updater({ ...column }) : column;
  });
}

function getSpreadsheetFreezeProps(columns: ColumnData) {
  const leaves = getSpreadsheetLeafColumns(columns);
  const namedFreezeProps = leaves
    .filter(column => column.prop === 'department' || column.prop === 'owner')
    .map(column => column.prop);
  const freezeProps = namedFreezeProps.length ? namedFreezeProps : leaves.slice(0, 2).map(column => column.prop);
  return new Set(freezeProps);
}

function applySpreadsheetSearchHighlight(columns: ColumnData, searchQuery: string): ColumnData {
  const query = normalizeSpreadsheetSearchQuery(searchQuery);
  if (!query) {
    return columns;
  }

  return columns.map((column) => {
    if (isSpreadsheetColumnGroup(column)) {
      return {
        ...column,
        children: applySpreadsheetSearchHighlight(column.children, query),
      };
    }

    const originalCellProperties = column.cellProperties;
    return {
      ...column,
      cellProperties(model: CellTemplateProp) {
        const props = (originalCellProperties?.(model) ?? {}) as CellProps;
        return doesSpreadsheetValueMatchSearch(model.value ?? model.model?.[model.prop], query)
          ? appendSpreadsheetCellClass(props, 'spreadsheet-cell-search-hit')
          : props;
      },
    };
  });
}

function normalizeSpreadsheetSearchQuery(searchQuery: string) {
  return searchQuery.trim().toLowerCase();
}

function doesSpreadsheetValueMatchSearch(value: unknown, query: string) {
  return query ? String(value ?? '').toLowerCase().includes(query) : false;
}

function numberValue(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function isSpreadsheetColumnGroup(column: ColumnGrouping | ColumnRegular): column is ColumnGrouping {
  return Array.isArray((column as ColumnGrouping).children);
}
