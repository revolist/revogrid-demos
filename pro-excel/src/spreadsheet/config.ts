/** Stable demo identifiers and plugin configuration constants. */
import type { ExportExcelEvent } from '@revolist/revogrid-pro';
import type { SpreadsheetPreviewMode } from './models';

export const SPREADSHEET_WORKBOOK_NAME = 'RevoGrid Spreadsheet Workbench';
export const SPREADSHEET_DEMO_ID = 'spreadsheet-workbench';
export const SPREADSHEET_EXPORT_CONFIG: ExportExcelEvent = {
  sheetName: 'Spreadsheet Workbench',
  workbookName: 'revogrid-spreadsheet-workbench.xlsx',
};

export const SPREADSHEET_BASE_PLUGIN_LABELS = [
  'EventManagerPlugin',
  'HistoryPlugin',
  'CellFlashPlugin',
  'CollaborativePresencePlugin',
  'FormulaBarPlugin',
  'FormulaDependencyHighlightPlugin',
  'NamedRangesPlugin',
  'FormulaPlugin',
  'MultiRangeSelectionPlugin',
  'RowHeaderPlugin',
  'RowOrderPlugin',
  'ColumnMoveAdvancedPlugin',
  'ColumnCollapsePlugin',
  'ContextMenuPlugin',
  'ExportExcelPlugin',
  'AdvanceFilterPlugin',
  'FilterHeaderPlugin',
  'CellValidatePlugin',
  'CellMergePlugin',
  'SameValueMergePlugin',
  'TooltipPlugin',
  'ColumnHidePlugin',
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

export function getSpreadsheetPluginLabels(previewMode: SpreadsheetPreviewMode = 'smart-fill'): string[] {
  return [
    ...SPREADSHEET_BASE_PLUGIN_LABELS.slice(0, 8),
    ...(previewMode === 'smart-fill'
      ? ['AutoFillPlugin', 'AutoFillPreviewPlugin']
      : ['RangeCopyPreviewPlugin']),
    ...SPREADSHEET_BASE_PLUGIN_LABELS.slice(8),
  ];
}
