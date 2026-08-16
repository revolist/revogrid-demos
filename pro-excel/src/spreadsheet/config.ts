/** Stable demo identifiers and plugin configuration constants. */
import type { ExportExcelEvent } from '@revolist/revogrid-pro';
import type { SpreadsheetPreviewMode } from './models';
import { SPREADSHEET_ADVANCED_FORMATS } from './workbook';

export const SPREADSHEET_WORKBOOK_NAME = 'RevoGrid Spreadsheet Workbench';
export const SPREADSHEET_DEMO_ID = 'spreadsheet-workbench';
export const SPREADSHEET_EXPORT_CONFIG: ExportExcelEvent = {
  sheetName: 'Spreadsheet Workbench',
  workbookName: 'revogrid-spreadsheet-workbench.xlsx',
};

export const SPREADSHEET_DATA_GRID_FORMATTING = {
  rowKeyProp: 'id',
} as const;

export const SPREADSHEET_DATA_GRID_CONTEXT_MENU = {
  formatting: {
    advancedFormats: {
      customFormats: SPREADSHEET_ADVANCED_FORMATS,
    },
  },
} as const;

export const SPREADSHEET_BASE_PLUGIN_LABELS = [
  'EventManagerPlugin',
  'HistoryPlugin',
  'CellFlashPlugin',
  'CollaborativePresencePlugin',
  'FormulaBarPlugin',
  'FormulaDependencyHighlightPlugin',
  'NamedRangesPlugin',
  'FormulaPlugin',
  'DataGridFormattingPlugin',
  'SelectionPlugin',
  'RowOrderPlugin',
  'ColumnMoveAdvancedPlugin',
  'ColumnCollapsePlugin',
  'ExportExcelPlugin',
  'AdvanceFilterPlugin',
  'FilterHeaderPlugin',
  'CellValidatePlugin',
  'CellMergePlugin',
  'ColumnStretchPlugin',
] as const;

export const SPREADSHEET_ROW_ORDER_CONFIG = {
  prop: 'department',
  preview: 'compact' as const,
  validateDrop: ({ type }: { type?: string }) => (
    type === 'rgRow'
      ? { valid: true as const }
      : { valid: false as const, reason: 'Pinned totals stay fixed.' }
  ),
};

export const SPREADSHEET_ROW_SELECT_CONFIG = {
  rowOrder: true,
} as const;

export function getSpreadsheetPluginLabels(previewMode: SpreadsheetPreviewMode = 'smart-fill'): string[] {
  return [
    ...SPREADSHEET_BASE_PLUGIN_LABELS.slice(0, 9),
    ...(previewMode === 'smart-fill'
      ? ['AutoFillPlugin', 'AutoFillPreviewPlugin']
      : ['RangeCopyPreviewPlugin']),
    ...SPREADSHEET_BASE_PLUGIN_LABELS.slice(9),
  ];
}
