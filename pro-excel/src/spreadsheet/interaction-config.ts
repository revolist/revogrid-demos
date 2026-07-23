/** Configuration factories used while composing spreadsheet plugins and toolbar actions. */
import { type HistoryConfig } from '@revolist/revogrid-pro';
import { getSpreadsheetLeafColumns } from './columns';
import { SPREADSHEET_DEMO_ID } from './config';
import {
  type SpreadsheetFlashPlugin,
  type SpreadsheetWorkbook,
} from './models';

function getColumnLabel(column: { name?: unknown; prop: string | number }) {
  return typeof column.name === 'string' && column.name.trim() ? column.name : String(column.prop);
}

export function createSpreadsheetHistoryConfig(sourceId = SPREADSHEET_DEMO_ID): HistoryConfig {
  return {
    sourceId,
    maxStackSize: 80,
    clearOnSourceChange: true,
    clearOnFilterChange: false,
    clearOnSortingChange: false,
  };
}

export function createSpreadsheetEventManagerConfig() {
  return {
    applyEventsToSource: true,
  };
}

export function createSpreadsheetCellFlashConfig() {
  return {
    duration: 850,
    rowDuration: 1200,
    queue: 'merge' as const,
    mode: 'cell-and-row' as const,
    clearOnSourceChange: false,
    aria: true,
  };
}

export function flashSpreadsheetSampleCells(
  plugin: SpreadsheetFlashPlugin | undefined,
  workbook: SpreadsheetWorkbook,
) {
  if (!plugin?.flashCells) {
    return 'Cell flash plugin is not ready yet.';
  }

  const row = workbook.rows[0];
  if (!row) {
    return 'No visible row is available to flash.';
  }

  const columns = getSpreadsheetLeafColumns(workbook.columns)
    .filter(column => column.readonly !== true)
    .slice(0, 3);
  if (!columns.length) {
    return 'No editable cells are available to flash.';
  }

  const data: Record<string, unknown> = {};
  const previousData: Record<string, unknown> = {};
  columns.forEach((column, index) => {
    const value = row[column.prop];
    data[String(column.prop)] = value;
    previousData[String(column.prop)] = createSpreadsheetFlashPreviousValue(value, index);
  });

  plugin.flashCells({
    type: 'rgRow',
    data: { 0: data },
    previousData: { 0: previousData },
    eventTypes: ['spreadsheet-demo-flash'],
  }, {
    mode: 'cell-and-row',
    duration: 1250,
    rowDuration: 1450,
  });

  const labels = columns.map(getColumnLabel).join(', ');
  return `Flashed ${labels} in row 1.`;
}

export function createSpreadsheetFormulaDependencyHighlightConfig() {
  return {
    dependencyClass: 'spreadsheet-dependency-cell',
    formulaCellClass: 'spreadsheet-dependency-active-cell',
    dependencyColors: ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#0891b2', '#ca8a04'],
    includeNamedRanges: true,
  };
}

function createSpreadsheetFlashPreviousValue(value: unknown, offset: number) {
  if (typeof value === 'number') {
    return value + (offset % 2 === 0 ? -1000 : 1000);
  }
  if (typeof value === 'string' && value.trim()) {
    return `${value} previous`;
  }
  if (typeof value === 'boolean') {
    return !value;
  }
  return '__previous__';
}

export function createSpreadsheetExportExcelConfig() {
  return {
    allowDrag: true,
    allowedExtensions: ['.csv'],
  };
}
