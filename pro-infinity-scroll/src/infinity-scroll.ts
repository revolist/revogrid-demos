import exportIcon from '@fortawesome/fontawesome-free/svgs/solid/download.svg?raw';
import { h } from 'preact';
import { renderPreactInto } from '@revolist/ui/preact-mount';
import { IconButton } from '@revolist/ui/preact';
import '@revolist/ui/styles.css';
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
  const exportHost = document.createElement('div');
  toolbar.append(copy, exportHost);

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
    // Published 4.0.1 cached reads reference Node process; use supported direct reads until the fixed release.
    query: false,
    chunkSize: 50,
    bufferSize: 150,
    preloadThreshold: 0.75,
    total: dataset.length,
    loadData,
  };
  grid.infinityScroll = infinityScroll;

  const exportAll = async () => {
    renderExportButton(true);
    try {
      await exportInfinityScrollRows({
        columns,
        total: dataset.length,
        loadData: serverLoader,
        theme: grid.theme,
        setStatus: (message) => { status.textContent = message; },
      });
    } finally {
      renderExportButton(false);
    }
  };
  const renderExportButton = (disabled: boolean) => {
    renderPreactInto(exportHost, h(IconButton, { label: 'Export all to Excel', icon: exportIcon, disabled, onClick: exportAll }));
  };
  renderExportButton(false);

  container.append(toolbar, grid);
  parent.appendChild(container);
  grid.source = source;
  const disconnectTheme = observeCurrentTheme((isDark) => {
    grid.theme = isDark ? 'darkMaterial' : 'material';
  });

  return () => {
    disconnectTheme();
    renderPreactInto(exportHost, null);
    grid.remove();
    container.remove();
  };
}
