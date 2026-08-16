/** Spreadsheet edit lifecycle guards. */
import {
  type BeforeSaveDataDetails,
  type ColumnData,
  type ColumnRegular,
} from '@revolist/revogrid';
import { getSpreadsheetLeafColumns } from './columns';

type SpreadsheetEditEvent = Event & {
  detail?: BeforeSaveDataDetails;
};

export function preventReadonlySpreadsheetEdit(
  event: Event,
  columns: ColumnData,
  onPrevent?: (message: string) => void,
) {
  const detail = (event as SpreadsheetEditEvent).detail;
  const column = resolveSpreadsheetEditColumn(detail, columns);
  if (!column || !isReadonlySpreadsheetColumn(column, detail)) {
    return false;
  }

  event.preventDefault();
  event.stopImmediatePropagation();
  onPrevent?.(`${getColumnLabel(column)} is read-only. Edit the input cells that feed this value.`);
  return true;
}

/** Installs readonly/edit guards and returns a disposer for their listeners. */
export function installSpreadsheetReadonlyEditGuard(
  grid: HTMLRevoGridElement,
  getColumns: () => ColumnData,
  onPrevent?: (message: string) => void,
) {
  const onReadonlyEdit = (event: Event) => {
    preventReadonlySpreadsheetEdit(event, getColumns(), onPrevent);
  };

  grid.addEventListener('beforeeditstart', onReadonlyEdit, true);
  grid.addEventListener('beforeedit', onReadonlyEdit, true);

  return () => {
    grid.removeEventListener('beforeeditstart', onReadonlyEdit, true);
    grid.removeEventListener('beforeedit', onReadonlyEdit, true);
  };
}

function getColumnLabel(column: ColumnRegular) {
  return typeof column.name === 'string' && column.name.trim() ? column.name : String(column.prop);
}

function resolveSpreadsheetEditColumn(
  detail: BeforeSaveDataDetails | undefined,
  columns: ColumnData,
) {
  if (detail?.column) {
    return detail.column;
  }
  if (detail?.prop === undefined) {
    return;
  }
  return getSpreadsheetLeafColumns(columns).find(column => column.prop === detail.prop);
}

function isReadonlySpreadsheetColumn(
  column: ColumnRegular,
  detail: BeforeSaveDataDetails | undefined,
) {
  if (detail?.type === 'rowPinEnd') {
    return true;
  }
  if ((column as ColumnRegular & { dropdown?: unknown }).dropdown) {
    return false;
  }
  if (column.readonly === true) {
    return true;
  }
  if (typeof column.readonly !== 'function' || !detail) {
    return false;
  }

  try {
    return Boolean(column.readonly(detail));
  } catch {
    return false;
  }
}
