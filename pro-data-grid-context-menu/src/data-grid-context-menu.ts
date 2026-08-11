import { defineCustomElements } from '@revolist/revogrid/loader';
import {
  AdvanceFilterPlugin,
  AutoSizeColumnPlugin,
  ColumnCollapsePlugin,
  DataGridContextMenuPlugin,
  DialogPlugin,
  EventManagerPlugin,
  ExportExcelPlugin,
  HistoryPlugin,
  MultiRangeSelectionPlugin,
  RowSelectPlugin,
} from '@revolist/revogrid-pro';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import {
  DATA_GRID_CONTEXT_MENU_ROW_SIZE,
  createContextMenuColumns,
  createDataGridColumnTypes,
  createContextMenuRowHeaders,
  createDataGridFormattingPresets,
  createDataGridContextMenuConfig,
  createTeamGrouping,
  createTeamRows,
  getDataGridContextMenuTheme,
  type TeamRow,
} from './data-grid-context-menu.shared';
import './data-grid-context-menu.scss';

defineCustomElements();

const plugins = [
  EventManagerPlugin,
  HistoryPlugin,
  DataGridContextMenuPlugin,
  DialogPlugin,
  AdvanceFilterPlugin,
  AutoSizeColumnPlugin,
  RowSelectPlugin,
  ColumnCollapsePlugin,
  MultiRangeSelectionPlugin,
  ExportExcelPlugin,
];

export function load(parentSelector: string, rows?: TeamRow[]) {
  const parent = document.querySelector(parentSelector);
  if (!parent) return () => undefined;

  const showcase = document.createElement('section');
  showcase.className = 'data-grid-context-menu-showcase';
  showcase.setAttribute('aria-label', 'Data Grid Context Menu & Formatting workspace');

  const grid = document.createElement('revo-grid');
  grid.className = 'data-grid-context-menu-grid';
  grid.theme = getDataGridContextMenuTheme(currentTheme().isDark());
  grid.rowSize = DATA_GRID_CONTEXT_MENU_ROW_SIZE;
  grid.columns = createContextMenuColumns();
  grid.columnTypes = createDataGridColumnTypes();
  grid.plugins = plugins;
  grid.grouping = createTeamGrouping();
  grid.dataGridFormatting = createDataGridFormattingPresets();
  grid.dataGridContextMenu = createDataGridContextMenuConfig();
  grid.rowHeaders = createContextMenuRowHeaders();
  grid.range = true;
  grid.resize = true;
  grid.hideAttribution = true;

  showcase.appendChild(grid);
  parent.appendChild(showcase);
  grid.source = rows?.length ? rows : createTeamRows();

  const disconnectTheme = observeCurrentTheme((isDark) => {
    grid.theme = getDataGridContextMenuTheme(isDark);
  });

  return () => {
    disconnectTheme();
    showcase.remove();
  };
}
