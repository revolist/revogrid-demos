/**
 * Stable public facade for the spreadsheet demo.
 *
 * Implementation modules live in `./spreadsheet/`; exports here intentionally
 * match the original shared API so framework consumers stay decoupled from the
 * internal module layout.
 */
export {
  SPREADSHEET_SHEETS,
} from './spreadsheet/models';
export type {
  SpreadsheetBaseRow,
  SpreadsheetContextMenuController,
  SpreadsheetFlashPlugin,
  SpreadsheetFormulaToken,
  SpreadsheetFormulaTokenType,
  SpreadsheetInsight,
  SpreadsheetPreviewMode,
  SpreadsheetRow,
  SpreadsheetSheetKey,
  SpreadsheetWorkbook,
  SpreadsheetWorkbookKey,
} from './spreadsheet/models';

export {
  SPREADSHEET_BASE_PLUGIN_LABELS,
  SPREADSHEET_DEMO_ID,
  SPREADSHEET_EXPORT_CONFIG,
  SPREADSHEET_ROW_ORDER_CONFIG,
  SPREADSHEET_WORKBOOK_NAME,
  getSpreadsheetPluginLabels,
} from './spreadsheet/config';

export {
  createSpreadsheetCellMerge,
  createSpreadsheetFormulaNames,
  createSpreadsheetPinnedBottomSource,
  createSpreadsheetRows,
  createSpreadsheetScenarioFormulaRow,
  getSpreadsheetSheetLabel,
} from './spreadsheet/data';

export {
  getSpreadsheetLeafColumns,
} from './spreadsheet/columns';

export {
  installSpreadsheetFormulaEditorHighlight,
  tokenizeSpreadsheetFormula,
} from './spreadsheet/formula';

export {
  countSpreadsheetSearchMatches,
  createSpreadsheetDisplayColumns,
  createSpreadsheetInsights,
  createSpreadsheetRowHeaders,
  formatSpreadsheetSearchStatus,
  installSpreadsheetAutofillStrategy,
  setSpreadsheetFreezePane,
  summarizeSpreadsheetRowHeaderFocus,
} from './spreadsheet/presentation';

export {
  formatWorkbookStatus,
  summarizeClipboardMatrix,
  summarizeSelection,
} from './spreadsheet/status';

export {
  getSpreadsheetGridTheme,
  isSpreadsheetDarkTheme,
  observeSpreadsheetTheme,
} from './spreadsheet/theme';

export {
  createEmptySpreadsheetWorkbook,
  createSpreadsheetColumns,
  createSpreadsheetEditCellKey,
  createSpreadsheetWorkbook,
  createSpreadsheetWorkbookFromGridSource,
} from './spreadsheet/workbook';

export {
  SPREADSHEET_ACTION_ICONS,
  createSpreadsheetCellFlashConfig,
  createSpreadsheetContextMenus,
  createSpreadsheetEventManagerConfig,
  createSpreadsheetExportExcelConfig,
  createSpreadsheetFormulaDependencyHighlightConfig,
  createSpreadsheetHistoryConfig,
  flashSpreadsheetSampleCells,
  insertSpreadsheetRowFromPinnedDropdown,
  installSpreadsheetContextSelectionGuard,
  installSpreadsheetReadonlyEditGuard,
  preventReadonlySpreadsheetEdit,
} from './spreadsheet/interactions';
