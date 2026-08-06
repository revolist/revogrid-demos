import { defineCustomElements } from '@revolist/revogrid/loader';
import {
  CellColumnFocusVerifyPlugin,
  ColumnStretchPlugin,
  MasterRowPlugin,
  TreeDataPlugin,
} from '@revolist/revogrid-pro';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import {
  createMasterColumns,
  createMasterRowConfig,
  createMasterRows,
  createMasterTreeConfig,
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

  const grid = document.createElement('revo-grid');
  grid.className = 'row-master-grid';
  const initialDarkTheme = currentTheme().isDark();
  grid.theme = initialDarkTheme ? 'darkMaterial' : 'material';
  grid.columns = createMasterColumns(source);
  grid.plugins = plugins;
  grid.masterRow = createMasterRowConfig();
  grid.tree = createMasterTreeConfig();
  grid.stretch = 'last';
  grid.hideAttribution = true;

  container.appendChild(grid);
  parent.appendChild(container);
  grid.source = source;
  const disconnectTheme = observeCurrentTheme((isDark) => {
    grid.theme = isDark ? 'darkMaterial' : 'material';
  });

  return () => {
    disconnectTheme();
    grid.remove();
    container.remove();
  };
}
