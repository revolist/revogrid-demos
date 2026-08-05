import { defineCustomElements } from '@revolist/revogrid/loader';
import {
  AdvanceFilterPlugin,
  ColumnCollapsePlugin,
  FilterHeaderPlugin,
  RowOddPlugin,
  RowSelectPlugin,
} from '@revolist/revogrid-pro';
import {
  createColumnCollapseColumns,
  createColumnCollapseRows,
  prefersDarkTheme,
  type ContactRow,
} from './column-collapse.shared';
import './column-collapse.scss';

defineCustomElements();

const plugins = [
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
  container.innerHTML = `
    <div class="column-collapse-toolbar">
      <div>
        <strong>Contact workspace</strong>
        <span>Collapse a grouped header to keep only its sealed column visible.</span>
      </div>
      <div class="column-collapse-legend" aria-label="Column collapse legend">
        <span><i class="column-collapse-dot column-collapse-dot--sealed"></i>Sealed</span>
        <span><i class="column-collapse-dot column-collapse-dot--hidden"></i>Collapsible</span>
      </div>
    </div>
  `;

  const grid = document.createElement('revo-grid');
  grid.className = 'column-collapse-grid';
  grid.theme = prefersDarkTheme() ? 'darkMaterial' : 'material';
  grid.columns = createColumnCollapseColumns();
  grid.plugins = plugins;
  grid.rowHeaders = true;
  grid.resize = true;
  grid.hideAttribution = true;

  container.appendChild(grid);
  parent.appendChild(container);
  grid.source = rows?.length ? rows : createColumnCollapseRows();

  return () => {
    grid.remove();
    container.remove();
  };
}
