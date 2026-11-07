import '@revolist/ui/styles.css';
import { defineCustomElements } from '@revolist/revogrid/loader';
import {
  ExportExcelPlugin,
  TREE_COLLAPSE_ALL_EVENT,
  TREE_EXPAND_ALL_EVENT,
  TREE_STATE_CHANGED_EVENT,
} from '@revolist/revogrid-pro';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import {
  createTreeColumns,
  createTreeConfig,
  createTreeFilterConfig,
  createTreeRows,
  TREE_COLUMN_TYPES,
  TREE_DATA_GRID_CONTEXT_MENU,
  TREE_DATA_GRID_FORMATTING,
  TREE_EXPORT_CONFIG,
  TREE_PLUGINS,
  TREE_ROW_ORDER_CONFIG,
  TREE_ROW_SELECT_CONFIG,
  TREE_STICKY_CELLS_CONFIG,
  type TreeDataRow,
} from './tree.shared';
import { mountTreeToolbar } from './tree.toolbar';
import './tree.scss';

defineCustomElements();

export function load(parentSelector: string, rows?: TreeDataRow[]) {
  const parent = document.querySelector(parentSelector);
  if (!parent) return () => undefined;

  const source = rows?.length ? rows : createTreeRows();
  let treeConfig = createTreeConfig(source);
  let expandedRowIds = new Set(treeConfig.expandedRowIds);
  const container = document.createElement('section');
  container.className = 'tree-showcase';
  container.setAttribute('aria-label', 'Tree Data organization explorer');

  const toolbar = document.createElement('div');

  const grid = document.createElement('revo-grid');
  grid.className = 'tree-grid';
  const initialDarkTheme = currentTheme().isDark();
  grid.theme = initialDarkTheme ? 'darkMaterial' : 'material';
  grid.plugins = TREE_PLUGINS;
  grid.columns = createTreeColumns(source);
  grid.columnTypes = TREE_COLUMN_TYPES;
  grid.rowOrder = TREE_ROW_ORDER_CONFIG;
  grid.rowSelect = TREE_ROW_SELECT_CONFIG;
  grid.tree = treeConfig;
  grid.range = true;
  grid.readonly = true;
  grid.stickyCells = TREE_STICKY_CELLS_CONFIG;
  grid.resize = true;
  grid.filter = createTreeFilterConfig(source);
  grid.dataGridFormatting = TREE_DATA_GRID_FORMATTING;
  grid.dataGridContextMenu = TREE_DATA_GRID_CONTEXT_MENU;
  grid.stretch = true;
  grid.hideAttribution = true;

  const expandAll = () => grid.dispatchEvent(new CustomEvent(TREE_EXPAND_ALL_EVENT));
  const collapseAll = () => grid.dispatchEvent(new CustomEvent(TREE_COLLAPSE_ALL_EVENT));
  const toggleSticky = (checked: boolean) => {
    treeConfig = createTreeConfig(source, {
      expandedRowIds,
      stickyParents: checked,
    });
    grid.tree = treeConfig;
    grid.columns = createTreeColumns(source, checked);
  };
  const syncTreeState = (event: Event) => {
    expandedRowIds = new Set(
      (event as CustomEvent<{ expandedRowIds: Set<string> }>).detail.expandedRowIds,
    );
  };
  const exportToExcel = async () => {
    const plugins = await grid.getPlugins();
    const exportPlugin = plugins.find((plugin) => plugin instanceof ExportExcelPlugin) as ExportExcelPlugin | undefined;
    await exportPlugin?.export(TREE_EXPORT_CONFIG);
  };

  const unmountToolbar = mountTreeToolbar(toolbar, {
    expandAll, collapseAll, exportToExcel, setStickyParents: toggleSticky,
  });
  grid.addEventListener(TREE_STATE_CHANGED_EVENT, syncTreeState);
  container.append(toolbar, grid);
  parent.appendChild(container);
  grid.source = source;
  const disconnectTheme = observeCurrentTheme((isDark) => {
    grid.theme = isDark ? 'darkMaterial' : 'material';
  });

  return () => {
    disconnectTheme();
    unmountToolbar();
    grid.removeEventListener(TREE_STATE_CHANGED_EVENT, syncTreeState);
    container.remove();
  };
}
