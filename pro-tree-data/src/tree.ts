import { defineCustomElements } from '@revolist/revogrid/loader';
import {
  ExportExcelPlugin,
  TREE_COLLAPSE_ALL_EVENT,
  TREE_EXPAND_ALL_EVENT,
} from '@revolist/revogrid-pro';
import {
  createTreeColumns,
  createTreeConfig,
  createTreeRows,
  prefersDarkTheme,
  TREE_COLUMN_TYPES,
  TREE_EXPORT_CONFIG,
  TREE_PLUGINS,
  TREE_ROW_ORDER_CONFIG,
  TREE_ROW_SELECT_CONFIG,
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
  const container = document.createElement('section');
  container.className = 'tree-showcase';
  container.setAttribute('aria-label', 'Tree Data organization explorer');

  const toolbar = document.createElement('div');
  toolbar.className = 'tree-toolbar';
  const intro = document.createElement('div');
  intro.className = 'tree-toolbar__intro';
  intro.innerHTML = '<span class="tree-eyebrow">Organization explorer</span><strong>Interactive hierarchy</strong>';
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
  toolbar.append(intro, actions);

  const grid = document.createElement('revo-grid');
  grid.className = 'tree-grid';
  grid.theme = prefersDarkTheme() ? 'darkMaterial' : 'material';
  grid.columns = createTreeColumns();
  grid.plugins = TREE_PLUGINS;
  grid.columnTypes = TREE_COLUMN_TYPES;
  Object.assign(grid, {
    rowOrder: TREE_ROW_ORDER_CONFIG,
    rowSelect: TREE_ROW_SELECT_CONFIG,
    tree: createTreeConfig(source),
  });
  grid.range = true;
  grid.resize = true;
  grid.filter = true;
  grid.stretch = true;
  grid.hideAttribution = true;

  const expandAll = () => grid.dispatchEvent(new CustomEvent(TREE_EXPAND_ALL_EVENT));
  const collapseAll = () => grid.dispatchEvent(new CustomEvent(TREE_COLLAPSE_ALL_EVENT));
  const toggleSticky = () => {
    Object.assign(grid, { tree: createTreeConfig(source, stickyInput.checked) });
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
  container.append(toolbar, grid);
  parent.appendChild(container);
  grid.source = source;

  return () => {
    expandButton.removeEventListener('click', expandAll);
    collapseButton.removeEventListener('click', collapseAll);
    exportButton.removeEventListener('click', exportToExcel);
    stickyInput.removeEventListener('change', toggleSticky);
    container.remove();
  };
}
