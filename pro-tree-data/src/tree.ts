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
  createTreeRows,
  initializeTreeStickyColumns,
  TREE_COLUMN_TYPES,
  TREE_EXPORT_CONFIG,
  TREE_PLUGINS,
  TREE_ROW_ORDER_CONFIG,
  TREE_ROW_SELECT_CONFIG,
  TREE_STICKY_CELLS_CONFIG,
  type TreeDataRow,
} from './tree.shared';
import './tree.scss';

defineCustomElements();

function createButton(label: string) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tree-button';
  button.textContent = label;
  return button;
}

export function load(parentSelector: string, rows?: TreeDataRow[]) {
  const parent = document.querySelector(parentSelector);
  if (!parent) return () => undefined;

  const source = rows?.length ? rows : createTreeRows();
  let treeConfig = createTreeConfig(source);
  const container = document.createElement('section');
  container.className = 'tree-showcase';
  container.setAttribute('aria-label', 'Tree Data organization explorer');

  const toolbar = document.createElement('div');
  toolbar.className = 'tree-toolbar';
  const actions = document.createElement('div');
  actions.className = 'tree-toolbar__actions';
  const expandButton = createButton('Expand all');
  const collapseButton = createButton('Collapse all');
  const exportButton = createButton('Export to Excel');
  const stickyLabel = document.createElement('label');
  stickyLabel.className = 'tree-sticky';
  const stickyInput = document.createElement('input');
  stickyInput.type = 'checkbox';
  stickyInput.checked = true;
  stickyLabel.append(stickyInput, document.createTextNode('Sticky parents'));
  actions.append(expandButton, collapseButton, exportButton, stickyLabel);
  toolbar.append(actions);

  const grid = document.createElement('revo-grid');
  grid.className = 'tree-grid';
  const initialDarkTheme = currentTheme().isDark();
  grid.theme = initialDarkTheme ? 'darkMaterial' : 'material';
  grid.plugins = TREE_PLUGINS;
  grid.columns = createTreeColumns(source);
  grid.columnTypes = TREE_COLUMN_TYPES;
  Object.assign(grid, {
    rowOrder: TREE_ROW_ORDER_CONFIG,
    rowSelect: TREE_ROW_SELECT_CONFIG,
    tree: treeConfig,
  });
  grid.range = true;
  grid.readonly = true;
  grid.stickyCells = TREE_STICKY_CELLS_CONFIG;
  grid.resize = true;
  grid.filter = true;
  grid.stretch = true;
  grid.hideAttribution = true;

  const expandAll = () => grid.dispatchEvent(new CustomEvent(TREE_EXPAND_ALL_EVENT));
  const collapseAll = () => grid.dispatchEvent(new CustomEvent(TREE_COLLAPSE_ALL_EVENT));
  const toggleSticky = () => {
    treeConfig = createTreeConfig(source, {
      expandedRowIds: treeConfig.expandedRowIds,
      stickyParents: stickyInput.checked,
    });
    Object.assign(grid, { tree: treeConfig });
    grid.columns = createTreeColumns(source, stickyInput.checked);
  };
  const syncTreeState = ({ detail }: CustomEvent<HTMLRevoGridElementEventMap[typeof TREE_STATE_CHANGED_EVENT]>) => {
    treeConfig = createTreeConfig(source, {
      expandedRowIds: detail.expandedRowIds,
      stickyParents: stickyInput.checked,
    });
  };
  const exportToExcel = async () => {
    exportButton.disabled = true;
    exportButton.textContent = 'Exporting…';
    try {
      const plugins = await grid.getPlugins();
      const exportPlugin = plugins.find((plugin) => plugin instanceof ExportExcelPlugin) as ExportExcelPlugin | undefined;
      await exportPlugin?.export(TREE_EXPORT_CONFIG);
    } finally {
      exportButton.disabled = false;
      exportButton.textContent = 'Export to Excel';
    }
  };

  expandButton.addEventListener('click', expandAll);
  collapseButton.addEventListener('click', collapseAll);
  exportButton.addEventListener('click', exportToExcel);
  stickyInput.addEventListener('change', toggleSticky);
  grid.addEventListener(TREE_STATE_CHANGED_EVENT, syncTreeState);
  container.append(toolbar, grid);
  parent.appendChild(container);
  grid.source = source;
  void initializeTreeStickyColumns(grid, source, () => treeConfig);
  const disconnectTheme = observeCurrentTheme((isDark) => {
    grid.theme = isDark ? 'darkMaterial' : 'material';
  });

  return () => {
    disconnectTheme();
    expandButton.removeEventListener('click', expandAll);
    collapseButton.removeEventListener('click', collapseAll);
    exportButton.removeEventListener('click', exportToExcel);
    stickyInput.removeEventListener('change', toggleSticky);
    grid.removeEventListener(TREE_STATE_CHANGED_EVENT, syncTreeState);
    container.remove();
  };
}
