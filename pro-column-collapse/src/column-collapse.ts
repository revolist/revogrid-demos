import { defineCustomElements } from '@revolist/revogrid/loader';
import {
  AdvanceFilterPlugin,
  ColumnCollapsePlugin,
  ColumnMoveAdvancedPlugin,
  FilterHeaderPlugin,
  RowOddPlugin,
  RowSelectPlugin,
} from '@revolist/revogrid-pro';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import {
  createColumnCollapseColumns,
  createColumnCollapseRows,
  type ContactRow,
} from './column-collapse.shared';
import './column-collapse.scss';

defineCustomElements();

const plugins = [
  ColumnMoveAdvancedPlugin,
  ColumnCollapsePlugin,
  AdvanceFilterPlugin,
  FilterHeaderPlugin,
  RowSelectPlugin,
  RowOddPlugin,
];

export function load(parentSelector: string, rows?: ContactRow[]) {
  const parent = document.querySelector(parentSelector);
  if (!parent) return () => undefined;

  const container = document.createElement('section');
  container.className = 'column-collapse-showcase';
  container.setAttribute('aria-label', 'Column Collapse contact workspace');

  const grid = document.createElement('revo-grid');
  grid.className = 'column-collapse-grid';
  grid.theme = currentTheme().isDark() ? 'darkMaterial' : 'material';
  grid.columns = createColumnCollapseColumns();
  grid.plugins = plugins;
  grid.rowHeaders = true;
  grid.resize = true;
  grid.hideAttribution = true;

  container.appendChild(grid);
  parent.appendChild(container);
  grid.source = rows?.length ? rows : createColumnCollapseRows();
  const disconnectTheme = observeCurrentTheme((isDark) => {
    grid.theme = isDark ? 'darkMaterial' : 'material';
  });

  return () => {
    disconnectTheme();
    grid.remove();
    container.remove();
  };
}
