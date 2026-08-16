/** Public spreadsheet interaction surface, organized by area of use. */
export {
  createSpreadsheetCellFlashConfig,
  createSpreadsheetEventManagerConfig,
  createSpreadsheetExportExcelConfig,
  createSpreadsheetFormulaDependencyHighlightConfig,
  createSpreadsheetHistoryConfig,
  flashSpreadsheetSampleCells,
} from './interaction-config';
export {
  installSpreadsheetReadonlyEditGuard,
  preventReadonlySpreadsheetEdit,
} from './interaction-edit-guards';
export { SPREADSHEET_ACTION_ICONS } from './interaction-icons';
export { installSpreadsheetCellMergeSync } from './interaction-merge-sync';
