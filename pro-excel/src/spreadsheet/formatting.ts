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

/**
 * Toggles a visible emphasis format on the focused body cell.
 * Formatting is stored with row data so it survives sorting and virtualization.
 */
export function toggleSpreadsheetFocusedCellFormat(
  workbook: SpreadsheetWorkbook,
  focused: SpreadsheetFocusedCell | null | undefined,
): SpreadsheetCellFormatResult {
  const prop = focused?.column?.prop;
  if (!focused?.model || focused.rowType !== 'rgRow' || prop === undefined) {
    return {
      workbook,
      formatted: false,
      message: 'Select a workbook cell before applying formatting.',
    };
  }

  const focusedId = focused.model.id;
  let rowIndex = workbook.rows.findIndex(row => row === focused.model);
  if (rowIndex < 0 && focusedId !== undefined) {
    rowIndex = workbook.rows.findIndex(row => row.id === focusedId);
  }
  if (rowIndex < 0 && Number.isInteger(focused.cell?.y) && focused.cell!.y >= 0) {
    rowIndex = focused.cell!.y;
  }
  if (rowIndex < 0 || rowIndex >= workbook.rows.length) {
    return {
      workbook,
      formatted: false,
      message: 'The selected cell is no longer available.',
    };
  }

  const row = workbook.rows[rowIndex] as SpreadsheetFormattedRow;
  const propKey = String(prop);
  const formats = { ...(row[SPREADSHEET_CELL_FORMATS_PROP] ?? {}) };
  const formatted = !formats[propKey];
  if (formatted) {
    formats[propKey] = true;
  } else {
    delete formats[propKey];
  }

  const nextRow: SpreadsheetFormattedRow = { ...row };
  if (Object.keys(formats).length) {
    nextRow[SPREADSHEET_CELL_FORMATS_PROP] = formats;
  } else {
    delete nextRow[SPREADSHEET_CELL_FORMATS_PROP];
  }

  const rows = [...workbook.rows];
  rows[rowIndex] = nextRow;
  return {
    workbook: { ...workbook, rows },
    formatted,
    message: formatted ? 'Applied emphasis formatting to the selected cell.' : 'Removed formatting from the selected cell.',
  };
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
