import { defineCustomElements } from '@revolist/revogrid/loader';
import type { ColumnProp, FilterCollectionItem, MultiFilterItem } from '@revolist/revogrid';
import {
  AdvanceFilterPlugin,
  ColumnStretchPlugin,
  FIlTER_SELECTION,
  InfinityScrollPlugin,
  RowOddPlugin,
  RowSelectPlugin,
  type InfinityScrollConfig,
} from '@revolist/revogrid-pro';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import { exportInfinityScrollRows } from './infinity-scroll.export';
import {
  createInfinityScrollColumns,
  createInfinityScrollDataLoader,
  createInfinityScrollPinnedBottomRows,
  createInfinityScrollPinnedTopRows,
  createInfinityScrollRows,
  type InfinityScrollQuickFilter,
  type InfinityScrollUser,
} from './infinity-scroll.shared';
import './infinity-scroll.scss';

defineCustomElements();

const plugins = [
  InfinityScrollPlugin,
  AdvanceFilterPlugin,
  RowOddPlugin,
  RowSelectPlugin,
  ColumnStretchPlugin,
];

export function load(parentSelector: string, rows?: InfinityScrollUser[]) {
  const parent = document.querySelector(parentSelector);
  if (!parent) return () => undefined;

  const dataset = rows?.length ? rows : createInfinityScrollRows();
  const source: InfinityScrollUser[] = [];
  const container = document.createElement('section');
  container.className = 'infinity-showcase';
  container.setAttribute('aria-label', 'Infinity Scroll remote directory');
  const toolbar = document.createElement('div');
  toolbar.className = 'infinity-toolbar';
  const copy = document.createElement('div');
  copy.className = 'infinity-toolbar__copy';
  const title = document.createElement('strong');
  title.textContent = 'Remote user directory';
  const status = document.createElement('span');
  status.className = 'infinity-status';
  status.textContent = 'Initializing remote source…';
  copy.append(title, status);
  const exportButton = document.createElement('button');
  exportButton.type = 'button';
  exportButton.className = 'infinity-button';
  exportButton.textContent = 'Export all to Excel';
  toolbar.append(copy, exportButton);

  const columns = createInfinityScrollColumns();
  const grid = document.createElement('revo-grid');
  grid.className = 'infinity-grid';
  grid.theme = currentTheme().isDark() ? 'darkMaterial' : 'material';
  grid.columns = columns;
  grid.plugins = plugins;
  grid.stretch = 'last';
  grid.rowHeaders = true;
  grid.hideAttribution = true;
  grid.pinnedTopSource = createInfinityScrollPinnedTopRows();
  grid.pinnedBottomSource = createInfinityScrollPinnedBottomRows();

  const serverLoader = createInfinityScrollDataLoader({
    rows: dataset,
    selectionFilterType: FIlTER_SELECTION,
  });
  const loadData = async (
    skip: number,
    limit: number,
    order?: Partial<Record<ColumnProp, 'asc' | 'desc'>>,
    singleFilters?: Record<ColumnProp, FilterCollectionItem>,
    multiFilters?: MultiFilterItem,
    quickFilter?: InfinityScrollQuickFilter,
  ) => {
    status.textContent = `Fetching rows ${skip + 1}–${Math.min(skip + limit, dataset.length)}…`;
    const result = await serverLoader(skip, limit, order, singleFilters, multiFilters, quickFilter);
    status.textContent = `Loaded ${result.total.toLocaleString()} matching records`;
    return result;
  };
  const infinityScroll: Partial<InfinityScrollConfig> = {
    chunkSize: 50,
    bufferSize: 150,
    preloadThreshold: 0.75,
    total: dataset.length,
    loadData,
  };
  grid.infinityScroll = infinityScroll;

  const exportAll = async () => {
    exportButton.disabled = true;
    try {
      await exportInfinityScrollRows({
        columns,
        total: dataset.length,
        loadData: serverLoader,
        theme: grid.theme,
        setStatus: (message) => { status.textContent = message; },
      });
    } finally {
      exportButton.disabled = false;
    }
  };
  exportButton.addEventListener('click', exportAll);

  container.append(toolbar, grid);
  parent.appendChild(container);
  grid.source = source;
  const disconnectTheme = observeCurrentTheme((isDark) => {
    grid.theme = isDark ? 'darkMaterial' : 'material';
  });

  return () => {
    disconnectTheme();
    exportButton.removeEventListener('click', exportAll);
    grid.remove();
    container.remove();
  };
}
