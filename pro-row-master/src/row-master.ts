import { defineCustomElements } from '@revolist/revogrid/loader';
import {
  BEFORE_ROW_MASTER_COLLAPSE,
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
  cloneMasterRows,
  preserveExpandedMastersOnSource,
  type MasterProjectRow,
} from './row-master.shared';
import './row-master.scss';

defineCustomElements();

const plugins = [TreeDataPlugin, MasterRowPlugin, CellColumnFocusVerifyPlugin, ColumnStretchPlugin];

export function load(parentSelector: string, rows?: MasterProjectRow[]) {
  const parent = document.querySelector(parentSelector);
  if (!parent) return () => undefined;

  let source = rows?.length ? rows : createMasterRows();
  const container = document.createElement('section');
  container.className = 'row-master-showcase';
  container.setAttribute('aria-label', 'Row Master portfolio explorer');

  const controls = document.createElement('div');
  controls.className = 'row-master-source-update';
  const refreshSource = document.createElement('button');
  refreshSource.type = 'button';
  refreshSource.className = 'row-master-source-update__button';
  refreshSource.textContent = 'Refresh source and preserve details';
  controls.append(refreshSource);

  const grid = document.createElement('revo-grid');
  grid.className = 'row-master-grid';
  const initialDarkTheme = currentTheme().isDark();
  grid.theme = initialDarkTheme ? 'darkMaterial' : 'material';
  grid.columns = createMasterColumns(source);
  grid.plugins = plugins;
  grid.masterRow = createMasterRowConfig();
  grid.tree = createMasterTreeConfig();
  grid.readonly = true;
  grid.stretch = 'last';
  grid.hideAttribution = true;

  refreshSource.addEventListener('click', () => {
    const refreshedSource = cloneMasterRows(source);
    source = refreshedSource;
    grid.source = refreshedSource;
  });
  grid.addEventListener(BEFORE_ROW_MASTER_COLLAPSE, preserveExpandedMastersOnSource);

  container.appendChild(controls);
  container.appendChild(grid);
  parent.appendChild(container);
  grid.source = source;
  const disconnectTheme = observeCurrentTheme((isDark) => {
    grid.theme = isDark ? 'darkMaterial' : 'material';
  });

  return () => {
    disconnectTheme();
    grid.removeEventListener(BEFORE_ROW_MASTER_COLLAPSE, preserveExpandedMastersOnSource);
    grid.remove();
    container.remove();
  };
}
