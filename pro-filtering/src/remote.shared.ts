import type {
  ColumnProp,
  FilterCollectionItem,
  FilterData,
  MultiFilterItem,
  SortingOrder,
} from '@revolist/revogrid';
import { defineCustomElements } from '@revolist/revogrid/loader';
import {
  AdvanceFilterPlugin,
  ColumnStretchPlugin,
  InfinityScrollPlugin,
  PaginationPlugin,
  RowOddPlugin,
  serializeFilterValue,
} from '@revolist/revogrid-pro';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import {
  createOrderExplorerColumns,
  createOrderExplorerColumnTypes,
  createOrderExplorerFilter,
  createOrderExplorerRows,
  setOrderExplorerQuickFilter,
  type OrderExplorerRow,
  type QuickFilterInput,
} from './filtering.shared';
import './filtering.scss';

defineCustomElements();

type RemoteMode = 'pagination' | 'infinity';
type QuickFilter = Exclude<QuickFilterInput, string>;

interface RemoteRequest {
  mode: RemoteMode;
  skip: number;
  take: number;
  order?: SortingOrder;
  singleConditionFilters?: Record<ColumnProp, FilterCollectionItem>;
  multiConditionFilters?: MultiFilterItem;
  quickFilter?: Omit<QuickFilter, 'debounceMs'>;
}

const rows = createOrderExplorerRows();

function transportRequest(
  mode: RemoteMode,
  skip: number,
  take: number,
  order?: SortingOrder,
  singleConditionFilters?: Record<ColumnProp, FilterCollectionItem>,
  multiConditionFilters?: MultiFilterItem,
  quickFilter?: Omit<QuickFilter, 'debounceMs'>,
): RemoteRequest {
  return serializeFilterValue({
    mode,
    skip,
    take,
    order,
    singleConditionFilters,
    multiConditionFilters,
    quickFilter,
  }) as RemoteRequest;
}

function matchesFilter(value: unknown, item: FilterData) {
  const type = String(item.type);
  if (type === 'selection') {
    const excluded = new Set(Array.from(item.value ?? [], entry => String(entry).toLowerCase()));
    return !excluded.has(String(value).toLowerCase());
  }
  if (type === 'slider') {
    const range = item.value as { fromValue?: number; toValue?: number };
    return Number(value) >= (range.fromValue ?? -Infinity) && Number(value) <= (range.toValue ?? Infinity);
  }
  if (type === 'gte') return Number(value) >= Number(item.value);
  if (type === 'lte') return Number(value) <= Number(item.value);
  if (type === 'contains') return String(value).toLowerCase().includes(String(item.value).toLowerCase());
  if (type === 'onOrAfter') return String(value) >= String(item.value);
  return true;
}

function applyRequest(source: OrderExplorerRow[], request: RemoteRequest) {
  const props = request.quickFilter?.columns ?? createOrderExplorerColumns().map(column => column.prop);
  const tokens = request.quickFilter?.text.toLowerCase().split(/\s+/).filter(Boolean) ?? [];
  const filtered = source.filter(row => {
    const matchesColumns = Object.entries(request.multiConditionFilters ?? {}).every(([prop, items]) =>
      items.every(item => matchesFilter((row as any)[prop], item)));
    const values = props.map(prop => String((row as any)[prop] ?? '').toLowerCase());
    return matchesColumns && tokens.every(token => values.some(value => value.includes(token)));
  });
  const entries = Object.entries(request.order ?? {});
  return entries.length ? [...filtered].sort((left, right) => {
    for (const [prop, direction] of entries) {
      const result = String((left as any)[prop]).localeCompare(String((right as any)[prop]), undefined, { numeric: true });
      if (result) return direction === 'desc' ? -result : result;
    }
    return 0;
  }) : filtered;
}

function mixedRemoteFilters(): MultiFilterItem {
  return {
    status: [{
      id: 1,
      type: 'selection' as FilterData['type'],
      value: new Set(['processing', 'payment hold', 'shipped', 'delivered']),
      relation: 'and',
      hidden: true,
    }],
    total: [{
      id: 2,
      type: 'slider' as FilterData['type'],
      value: { fromValue: 250, toValue: 800 },
      relation: 'and',
    }],
    orderDate: [{
      id: 3,
      type: 'onOrAfter' as FilterData['type'],
      value: new Date('2026-01-01T00:00:00.000Z'),
      relation: 'and',
    }],
  };
}

function createButton(label: string, onClick: () => void) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'rv-btn';
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

export function mountRemoteFilteringRecipe(root: HTMLElement) {
  root.className = 'remote-filter-recipe';
  const toolbar = document.createElement('div');
  toolbar.className = 'remote-filter-recipe__toolbar';
  const gridHost = document.createElement('div');
  gridHost.className = 'remote-filter-recipe__grid';
  const output = document.createElement('pre');
  output.textContent = 'Interact with the grid to inspect a transport-safe request.';
  const requestPanel = document.createElement('aside');
  requestPanel.className = 'remote-filter-recipe__request';
  const title = document.createElement('h3');
  title.textContent = 'Last mock request';
  const signatures = document.createElement('p');
  signatures.textContent = 'Pagination(skip, take, order, single, multi, quickFilter) · Infinity(skip, limit, order, single, multi, quickFilter)';
  const groupingLink = document.createElement('a');
  groupingLink.href = 'https://pro.rv-grid.com/guides/server-side-grouping/';
  groupingLink.textContent = 'Server-Side Grouping request quick filtering';
  requestPanel.append(title, signatures, output, groupingLink);
  const layout = document.createElement('div');
  layout.className = 'remote-filter-recipe__layout';
  layout.append(gridHost, requestPanel);
  let grid: HTMLRevoGridElement | undefined;
  let mode: RemoteMode = 'pagination';
  const search = document.createElement('input');
  search.type = 'search';
  search.className = 'remote-filter-recipe__search';
  search.placeholder = 'Try “Lisbon pending”';
  search.setAttribute('aria-label', 'Remote global search');

  const onRequest = (request: RemoteRequest) => {
    output.textContent = JSON.stringify(request, null, 2);
  };
  const load = async (
    requestMode: RemoteMode,
    skip: number,
    take: number,
    order?: SortingOrder,
    single?: Record<ColumnProp, FilterCollectionItem>,
    multi?: MultiFilterItem,
    quick?: Omit<QuickFilter, 'debounceMs'>,
  ) => {
    const request = transportRequest(requestMode, skip, take, order, single, multi, quick);
    onRequest(request);
    const result = applyRequest(rows, request);
    return { data: result.slice(skip, skip + take), total: result.length, hasMore: skip + take < result.length };
  };
  const mountGrid = (nextMode: RemoteMode) => {
    mode = nextMode;
    grid?.remove();
    grid = document.createElement('revo-grid');
    grid.theme = currentTheme().isDark() ? 'darkMaterial' : 'material';
    grid.columns = createOrderExplorerColumns();
    grid.columnTypes = createOrderExplorerColumnTypes();
    grid.filter = createOrderExplorerFilter();
    grid.plugins = mode === 'pagination'
      ? [PaginationPlugin, AdvanceFilterPlugin, ColumnStretchPlugin, RowOddPlugin]
      : [InfinityScrollPlugin, AdvanceFilterPlugin, ColumnStretchPlugin, RowOddPlugin];
    grid.stretch = 'all';
    grid.hideAttribution = true;
    grid.readonly = true;
    if (mode === 'pagination') {
      (grid as any).pagination = {
        itemsPerPage: 25,
        initialPage: 0,
        total: rows.length,
        pageSizes: false,
        loadData: (skip: number, take: number, order?: SortingOrder, single?: any, multi?: any, quick?: any) =>
          load('pagination', skip, take, order, single, multi, quick),
      };
    } else {
      (grid as any).infinityScroll = {
        chunkSize: 40,
        bufferSize: 80,
        preloadThreshold: .75,
        total: rows.length,
        loadData: (skip: number, limit: number, order?: SortingOrder, single?: any, multi?: any, quick?: any) =>
          load('infinity', skip, limit, order, single, multi, quick),
      };
    }
    setOrderExplorerQuickFilter(grid, search.value);
    gridHost.append(grid);
  };

  search.addEventListener('input', () => grid && setOrderExplorerQuickFilter(grid, search.value));
  toolbar.append(
    createButton('Pagination', () => mountGrid('pagination')),
    createButton('Infinity Scroll', () => mountGrid('infinity')),
    createButton('Apply mixed filters', () => {
      if (grid) grid.filter = createOrderExplorerFilter(mixedRemoteFilters());
    }),
    search,
  );
  root.replaceChildren(toolbar, layout);
  mountGrid(mode);
  const disconnectTheme = observeCurrentTheme(isDark => {
    if (grid) grid.theme = isDark ? 'darkMaterial' : 'material';
  });
  return () => {
    disconnectTheme();
    grid?.remove();
    root.replaceChildren();
  };
}
