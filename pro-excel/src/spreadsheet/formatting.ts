/** Framework-neutral cell formatting for the spreadsheet toolbar. */
import type {
  CellProps,
  CellTemplateProp,
  ColumnData,
  ColumnGrouping,
  ColumnRegular,
  DataType,
} from '@revolist/revogrid';
import type {
  ExcelExportCellPropertiesResult,
  ExcelExportCellValue,
  MultiRangeSelectionRange,
} from '@revolist/revogrid-pro';
import { appendSpreadsheetCellClass } from './columns';
import type { SpreadsheetWorkbook } from './models';

const SPREADSHEET_CELL_FORMATS_PROP = '__spreadsheetCellFormats';

type SpreadsheetFormattedRow = DataType & {
  [SPREADSHEET_CELL_FORMATS_PROP]?: Record<string, true>;
};

export type SpreadsheetFocusedCell = {
  model?: DataType;
  rowType?: string;
  column?: ColumnRegular;
  cell?: { y: number };
};

export type SpreadsheetCellFormatResult = {
  workbook: SpreadsheetWorkbook;
  formatted: boolean;
  message: string;
};

type SpreadsheetSelectionFormatPlugin = {
  getSelectedRanges(): MultiRangeSelectionRange[];
  providers: {
    data: {
      getModel(row: number, rowType: MultiRangeSelectionRange['rowType']): DataType | undefined;
    };
    column: {
      getColumn(column: number, colType: MultiRangeSelectionRange['colType']): ColumnRegular | undefined;
    };
  };
};

type SpreadsheetCellFormatTarget = {
  rowIndex: number;
  prop: ColumnRegular['prop'];
};

/**
 * Toggles a visible emphasis format on the selected body cells.
 * Formatting is stored with row data so it survives sorting and virtualization.
 */
export function toggleSpreadsheetFocusedCellFormat(
  workbook: SpreadsheetWorkbook,
  focused: SpreadsheetFocusedCell | null | undefined,
  selectionPlugin?: SpreadsheetSelectionFormatPlugin,
): SpreadsheetCellFormatResult {
  const targets = resolveSpreadsheetCellFormatTargets(workbook, focused, selectionPlugin);
  if (!targets.length) {
    return {
      workbook,
      formatted: false,
      message: 'Select a workbook cell before applying formatting.',
    };
  }

  const formatted = targets.some(({ rowIndex, prop }) => (
    !isSpreadsheetCellFormatted(workbook.rows[rowIndex], prop)
  ));
  const rows = [...workbook.rows];
  const targetsByRow = new Map<number, ColumnRegular['prop'][]>();
  targets.forEach(({ rowIndex, prop }) => {
    const props = targetsByRow.get(rowIndex) ?? [];
    props.push(prop);
    targetsByRow.set(rowIndex, props);
  });
  targetsByRow.forEach((props, rowIndex) => {
    const row = rows[rowIndex] as SpreadsheetFormattedRow;
    const formats = { ...(row[SPREADSHEET_CELL_FORMATS_PROP] ?? {}) };
    props.forEach((prop) => {
      const propKey = String(prop);
      if (formatted) {
        formats[propKey] = true;
      } else {
        delete formats[propKey];
      }
    });

    const nextRow: SpreadsheetFormattedRow = { ...row };
    if (Object.keys(formats).length) {
      nextRow[SPREADSHEET_CELL_FORMATS_PROP] = formats;
    } else {
      delete nextRow[SPREADSHEET_CELL_FORMATS_PROP];
    }
    rows[rowIndex] = nextRow;
  });

  const cellLabel = targets.length === 1 ? 'the selected cell' : `${targets.length} selected cells`;
  return {
    workbook: { ...workbook, rows },
    formatted,
    message: formatted
      ? `Applied emphasis formatting to ${cellLabel}.`
      : `Removed formatting from ${cellLabel}.`,
  };
}

function resolveSpreadsheetCellFormatTargets(
  workbook: SpreadsheetWorkbook,
  focused: SpreadsheetFocusedCell | null | undefined,
  selectionPlugin?: SpreadsheetSelectionFormatPlugin,
): SpreadsheetCellFormatTarget[] {
  const targets = new Map<string, SpreadsheetCellFormatTarget>();
  selectionPlugin?.getSelectedRanges().forEach((selection) => {
    if (selection.rowType !== 'rgRow') {
      return;
    }
    const range = {
      x: Math.min(selection.range.x, selection.range.x1),
      y: Math.min(selection.range.y, selection.range.y1),
      x1: Math.max(selection.range.x, selection.range.x1),
      y1: Math.max(selection.range.y, selection.range.y1),
    };
    for (let row = range.y; row <= range.y1; row += 1) {
      const model = selectionPlugin.providers.data.getModel(row, selection.rowType);
      const rowIndex = resolveSpreadsheetWorkbookRowIndex(workbook, model);
      if (rowIndex === undefined) {
        continue;
      }
      for (let column = range.x; column <= range.x1; column += 1) {
        const prop = selectionPlugin.providers.column.getColumn(column, selection.colType)?.prop;
        if (prop !== undefined) {
          targets.set(`${rowIndex}:${String(prop)}`, { rowIndex, prop });
        }
      }
    }
  });
  if (targets.size) {
    return [...targets.values()];
  }

  const prop = focused?.column?.prop;
  const rowIndex = resolveSpreadsheetWorkbookRowIndex(workbook, focused?.model, focused?.cell?.y);
  return focused?.rowType === 'rgRow' && prop !== undefined && rowIndex !== undefined
    ? [{ rowIndex, prop }]
    : [];
}

function resolveSpreadsheetWorkbookRowIndex(
  workbook: SpreadsheetWorkbook,
  model: DataType | undefined,
  fallbackIndex?: number,
) {
  if (model) {
    const modelId = model.id;
    const rowIndex = workbook.rows.findIndex(row => row === model);
    if (rowIndex >= 0) {
      return rowIndex;
    }
    if (modelId !== undefined) {
      const stableIndex = workbook.rows.findIndex(row => row.id === modelId);
      if (stableIndex >= 0) {
        return stableIndex;
      }
    }
  }
  return Number.isInteger(fallbackIndex) && fallbackIndex! >= 0 && fallbackIndex! < workbook.rows.length
    ? fallbackIndex
    : undefined;
}

/** Adds the stored per-cell format class without mutating the workbook schema. */
export function applySpreadsheetCellFormatting(columns: ColumnData): ColumnData {
  return columns.map((column) => {
    if (isSpreadsheetColumnGroup(column)) {
      return {
        ...column,
        children: applySpreadsheetCellFormatting(column.children),
      };
    }

    const originalCellProperties = column.cellProperties;
    const originalExcelExport = column.excelExport;
    return {
      ...column,
      cellProperties(model: CellTemplateProp) {
        const props = (originalCellProperties?.(model) ?? {}) as CellProps;
        const formats = (model.model as SpreadsheetFormattedRow | undefined)?.[SPREADSHEET_CELL_FORMATS_PROP];
        return formats?.[String(model.prop)]
          ? appendSpreadsheetCellClass(props, 'spreadsheet-cell-formatted')
          : props;
      },
      excelExport: {
        ...originalExcelExport,
        cellProperties(context) {
          const originalResult = originalExcelExport?.cellProperties?.(context);
          return isSpreadsheetCellFormatted(context.model, context.column.prop)
            ? mergeSpreadsheetExcelExportCellFormat(originalResult)
            : originalResult;
        },
      },
    };
  });
}

function isSpreadsheetCellFormatted(model: DataType | undefined, prop: ColumnRegular['prop']) {
  const formats = (model as SpreadsheetFormattedRow | undefined)?.[SPREADSHEET_CELL_FORMATS_PROP];
  return Boolean(formats?.[String(prop)]);
}

function mergeSpreadsheetExcelExportCellFormat(
  result: ExcelExportCellPropertiesResult,
): ExcelExportCellPropertiesResult {
  const format = {
    backgroundColor: '#FFF1A8',
    borderColor: '#D49B00',
    borderStyle: 'thin',
    fontWeight: 'bold' as const,
  };
  if (result === undefined) {
    return format;
  }
  if (typeof result === 'object' && result !== null && !(result instanceof Date) && !Array.isArray(result)) {
    return { ...result, ...format };
  }
  return { value: result as ExcelExportCellValue, ...format };
}

function isSpreadsheetColumnGroup(column: ColumnGrouping | ColumnRegular): column is ColumnGrouping {
  return Array.isArray((column as ColumnGrouping).children);
}
