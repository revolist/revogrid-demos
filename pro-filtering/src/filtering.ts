import { defineCustomElements } from '@revolist/revogrid/loader';
import type { MultiFilterItem } from '@revolist/revogrid';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import {
  createOrderExplorerColumns,
  createOrderExplorerColumnTypes,
  createOrderExplorerFilter,
  createOrderExplorerInitialFilters,
  createOrderExplorerPreset,
  createOrderExplorerRows,
  getOrderExplorerVisibleCount,
  setOrderExplorerQuickFilter,
  ORDER_EXPLORER_QUICK_FILTER_EXAMPLE,
  orderExplorerPlugins,
  type OrderExplorerPreset,
  type OrderExplorerRow,
} from './filtering.shared';
import './filtering.scss';

defineCustomElements();

function createButton(label: string, onClick: () => void, className = 'rv-btn') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

export function load(parentSelector: string, rows?: OrderExplorerRow[]) {
  const parent = document.querySelector(parentSelector);
  if (!parent) return () => undefined;

  const source = rows?.length ? rows : createOrderExplorerRows();
  const container = document.createElement('section');
  container.className = 'order-explorer';
  container.setAttribute('aria-label', 'Advanced Filtering: Order Explorer');

  const toolbar = document.createElement('div');
  toolbar.className = 'order-explorer__toolbar';
  const presets = document.createElement('div');
  presets.className = 'order-explorer__presets';
  presets.setAttribute('aria-label', 'Filter presets');
  const eyebrow = document.createElement('p');
  eyebrow.className = 'order-explorer__eyebrow';
  eyebrow.textContent = 'Presets';
  presets.append(eyebrow);

  const summary = document.createElement('div');
  summary.className = 'order-explorer__summary';
  const count = document.createElement('span');
  count.className = 'order-explorer__count';
  count.setAttribute('aria-live', 'polite');
  summary.append(count);

  const grid = document.createElement('revo-grid');
  grid.className = 'order-explorer__grid';
  grid.theme = currentTheme().isDark() ? 'darkMaterial' : 'material';
  grid.columns = createOrderExplorerColumns();
  grid.plugins = orderExplorerPlugins;
  grid.columnTypes = createOrderExplorerColumnTypes();
  grid.stretch = 'all';
  grid.hideAttribution = true;
  grid.readonly = true;
  grid.resize = true;

  const renderCount = (visible: number) => {
    count.textContent = `${visible.toLocaleString()} of ${source.length.toLocaleString()} orders`;
  };

  // Presets and header filters use the same public `filter` property.
  const applyFilterItems = (items: MultiFilterItem) => {
    grid.filter = createOrderExplorerFilter(items);
  };

  const presetButtons: Array<[string, OrderExplorerPreset]> = [
    ['High-value Europe', 'high-value-europe'],
    ['Recent expedited', 'recent-expedited'],
    ['Review queue', 'review-queue'],
  ];
  presetButtons.forEach(([label, preset]) => {
    presets.append(createButton(label, () => applyFilterItems(createOrderExplorerPreset(preset))));
  });
  const search = document.createElement('div');
  search.className = 'order-explorer__search';
  const searchInput = document.createElement('input');
  searchInput.className = 'order-explorer__search-input';
  searchInput.type = 'search';
  searchInput.placeholder = 'Global search — try “Lisbon pending”';
  searchInput.setAttribute('aria-label', 'Search all visible columns');
  const applyQuickFilter = (text: string) => {
    searchInput.value = text;
    setOrderExplorerQuickFilter(grid, text);
  };
  searchInput.addEventListener('input', () => applyQuickFilter(searchInput.value));
  search.append(
    searchInput,
    createButton('Try example', () => applyQuickFilter(ORDER_EXPLORER_QUICK_FILTER_EXAMPLE)),
  );
  summary.append(createButton('Clear All', () => {
    applyFilterItems({});
    applyQuickFilter('');
  }, 'rv-btn-secondary'));
  toolbar.append(presets, search, summary);
  container.append(toolbar, grid);

  grid.addEventListener('afterfilterapply', async () => {
    renderCount(await getOrderExplorerVisibleCount(grid, source.length));
  });

  parent.appendChild(container);
  let destroyed = false;
  const disconnectTheme = observeCurrentTheme((isDark) => {
    grid.theme = isDark ? 'darkMaterial' : 'material';
  });
  renderCount(source.length);
  void grid.componentOnReady().then(() => {
    if (destroyed) return;
    const initialFilter = createOrderExplorerFilter(createOrderExplorerInitialFilters());
    grid.filter = initialFilter;
    grid.source = source;
  });

  return () => {
    destroyed = true;
    disconnectTheme();
    grid.remove();
    container.remove();
  };
}
