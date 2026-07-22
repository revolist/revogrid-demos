/** Keeps explicit value-derived merges aligned with the current visible row projection. */
import type { MergeData } from '@revolist/revogrid-pro';
import { createSpreadsheetCellMerge } from './data';

type SpreadsheetMergeGrid = HTMLRevoGridElement & {
  cellMerge?: MergeData[];
};

const SPREADSHEET_MERGE_PROJECTION_EVENTS = [
  'afteredit',
  'afterfilterapply',
  'aftersortingapply',
  'aftersourceset',
  'rowdragend',
] as const;

export function installSpreadsheetCellMergeSync(grid: SpreadsheetMergeGrid) {
  let disposed = false;
  let requestedVersion = 0;

  const sync = async () => {
    const version = ++requestedVersion;
    const visibleRows = await grid.getVisibleSource?.('rgRow');
    if (disposed || version !== requestedVersion || !visibleRows) {
      return;
    }
    grid.cellMerge = createSpreadsheetCellMerge(visibleRows);
  };
  const onProjectionChange = () => {
    void sync();
  };

  SPREADSHEET_MERGE_PROJECTION_EVENTS.forEach(eventName => (
    grid.addEventListener(eventName, onProjectionChange)
  ));

  return () => {
    disposed = true;
    SPREADSHEET_MERGE_PROJECTION_EVENTS.forEach(eventName => (
      grid.removeEventListener(eventName, onProjectionChange)
    ));
  };
}
