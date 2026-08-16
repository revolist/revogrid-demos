/** Shared data contracts for the spreadsheet demo modules. */
import type { DataType } from '@revolist/revogrid';
import type { FormulaNamesConfig } from '@revolist/revogrid-pro';

export type SpreadsheetPreviewMode = 'smart-fill' | 'copy-preview';

export type SpreadsheetRow = DataType & {
  id: number;
  department: string;
  owner: string;
  jan: number;
  feb: number;
  mar: number;
  total: string;
  target: number;
  variance: string;
  margin: string;
  trend: number;
  status: string;
};

export type SpreadsheetBaseRow = {
  department: string;
  owner: string;
  jan: number;
  feb: number;
  mar: number;
  target: number;
  status: string;
};

export const SPREADSHEET_SHEETS = [
  { key: 'budget', label: 'Budget', description: 'Approved Q1 operating plan' },
  { key: 'stretch', label: 'Stretch plan', description: 'Higher target scenario' },
  { key: 'pipeline', label: 'Pipeline risk', description: 'Conservative close-rate scenario' },
] as const;

export type SpreadsheetSheetKey = typeof SPREADSHEET_SHEETS[number]['key'];
export type SpreadsheetWorkbookKey = SpreadsheetSheetKey | 'empty' | 'imported';

export type SpreadsheetInsight = {
  label: string;
  value: string;
  tone: 'neutral' | 'positive' | 'negative' | 'warning';
};

/** Complete workbook state passed between framework views and grid helpers. */
export type SpreadsheetWorkbook = {
  rows: DataType[];
  columns: import('@revolist/revogrid').ColumnData;
  pinnedBottomSource: DataType[];
  formulaNames: FormulaNamesConfig;
  imported: boolean;
  name: string;
  sheetKey: SpreadsheetWorkbookKey;
};

/** Minimal CellFlashPlugin surface required by demo-driven flash actions. */
export type SpreadsheetFlashPlugin = {
  flashCells?: (
    detail: {
      type: 'rgRow';
      data: Record<number, Record<string, unknown>>;
      previousData?: Record<number, Record<string, unknown>>;
      eventTypes?: string[];
    },
    options?: {
      mode?: 'cell' | 'row' | 'cell-and-row';
      duration?: number;
      rowDuration?: number;
    },
  ) => void;
};
