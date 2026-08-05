import { defineCustomElements } from '@revolist/revogrid/loader';
import {
  CellColumnFocusVerifyPlugin,
  ColumnStretchPlugin,
  MasterRowPlugin,
  TreeDataPlugin,
} from '@revolist/revogrid-pro';
import {
  createMasterColumns,
  createMasterRowConfig,
  createMasterRows,
  createMasterTreeConfig,
  prefersDarkTheme,
  type MasterProjectRow,
} from './row-master.shared';
import './row-master.scss';

defineCustomElements();

const plugins = [TreeDataPlugin, MasterRowPlugin, CellColumnFocusVerifyPlugin, ColumnStretchPlugin];

export function load(parentSelector: string, rows?: MasterProjectRow[]) {
  const parent = document.querySelector(parentSelector);
  if (!parent) return () => undefined;

  const source = rows?.length ? rows : createMasterRows();
  const container = document.createElement('section');
  container.className = 'row-master-showcase';
  container.setAttribute('aria-label', 'Row Master portfolio explorer');
  container.innerHTML = `
    <div class="row-master-toolbar">
      <div>
        <strong>Portfolio explorer</strong>
        <span>Expand a leaf initiative to open its virtualized master-detail workspace.</span>
      </div>
      <div class="row-master-toolbar__badge">Tree + master detail</div>
    </div>`;

  const grid = document.createElement('revo-grid');
  grid.className = 'row-master-grid';
  grid.theme = prefersDarkTheme() ? 'darkMaterial' : 'material';
  grid.columns = createMasterColumns(source);
  grid.plugins = plugins;
  grid.masterRow = createMasterRowConfig();
  grid.tree = createMasterTreeConfig();
  grid.stretch = 'last';
  grid.hideAttribution = true;

  container.appendChild(grid);
  parent.appendChild(container);
  grid.source = source;

  return () => {
    grid.remove();
    container.remove();
  };
}
