import { defineCustomElements } from '@revolist/revogrid/loader';
import type { ColumnRegular, MultiFilterItem } from '@revolist/revogrid';
import { AdvanceFilterPlugin, ColumnStretchPlugin, RowOddPlugin, FIlTER_SELECTION, FIlTER_SLIDER } from '@revolist/revogrid-pro';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import { createOrderExplorerColumns, createOrderExplorerColumnTypes } from './filtering.columns';
import { createOrderExplorerFilter, getOrderExplorerVisibleCount } from './filtering.config';
import { ORDER_STATUSES } from './filtering.data';
import {
  createFirstEntryRows, initialFirstEntryState, REVIEW_STATUSES,
  FIRST_ENTRY_ACTION_EVENT, FIRST_ENTRY_RESET_EVENT,
  type FirstEntryAction, type FirstEntryState,
} from './first-entry.data';

export function firstEntryFilters(state: FirstEntryState): MultiFilterItem {
  const included = ORDER_STATUSES.filter(status =>
    (!state.queue || REVIEW_STATUSES.some(value => value === status)) && (!state.status || state.status === status));
  return {
    ...(state.queue || state.status ? { status: [{
      id: 1, type: FIlTER_SELECTION, relation: 'and' as const, hidden: true,
      value: new Set(ORDER_STATUSES.filter(status => !included.includes(status)).map(value => value.toLowerCase())),
    }] } : {}),
    ...(state.highValue ? { total: [{
      id: 2, type: FIlTER_SLIDER, relation: 'and' as const, hidden: true,
      value: { fromValue: 1000, toValue: 1860 },
    }] } : {}),
  };
}

// Shared Web Component lifecycle; each framework owns its controls and renders snapshots.
// Only public grid properties/events are used. Reset replaces the grid to dispose debounce,
// sorting, sizing, focus and viewport state together.
export function createFirstEntryController(host: HTMLElement, publish: (state: FirstEntryState) => void) {
  defineCustomElements();
  const compactQuery = window.matchMedia('(max-width: 720px)');
  let state = initialFirstEntryState(compactQuery.matches);
  let grid: HTMLRevoGridElement;
  let generation = 0;
  let read = 0;
  let disposed = false;
  const pending = new Set<FirstEntryAction>();
  const confirmed = new Set<FirstEntryAction>();
  const notify = () => publish({ ...state });
  const emit = (name: string, detail?: unknown) => host.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
  const filterConfig = () => {
    const config = createOrderExplorerFilter(firstEntryFilters(state));
    // The full explorer deliberately uses synthetic facet counts; this snapshot does not.
    config.selection = { ...config.selection, getItems: undefined, optionProgress: undefined };
    return config;
  };

  const statusToken = (value: unknown) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const statusTemplate: NonNullable<ColumnRegular['cellTemplate']> = (h, { value }) =>
    h('span', { class: `order-first-entry__status-badge order-first-entry__status-badge--${statusToken(value)}` }, String(value ?? ''));

  const columns = () => {
    const available = createOrderExplorerColumns();
    const allProps = ['orderNumber', 'customer', 'total', 'status', 'city', 'region', 'orderDate'];
    const compactSizes: Record<string, number> = { orderNumber: 120, total: 112, status: 116 };
    const props = state.compact && !state.showAllColumns
      ? ['orderNumber', 'total', 'status']
      : allProps;
    return props.map(prop => {
      const column = available.find(candidate => candidate.prop === prop)!;
      const compactSize = compactSizes[prop];
      const size = state.compact && !state.showAllColumns
        ? compactSize
        : prop === 'customer' ? 220 : prop === 'status' ? 174 : prop === 'total' ? 150 : column.size;
      return {
        ...column,
        name: prop === 'total' ? 'Total (USD)' : column.name,
        size: size!,
        minSize: size!,
        filter: false,
        ...(prop === 'status' ? { cellTemplate: statusTemplate } : {}),
      };
    });
  };

  const syncColumns = () => {
    if (grid) grid.columns = columns();
  };

  function mount() {
    const epoch = ++generation;
    const next = document.createElement('revo-grid');
    grid = next;
    next.theme = currentTheme().isDark() ? 'darkMaterial' : 'material';
    // This guided mode owns filters in its visible toolbar; the full explorer retains header menus.
    next.columns = columns();
    next.plugins = [AdvanceFilterPlugin, ColumnStretchPlugin, RowOddPlugin];
    next.columnTypes = createOrderExplorerColumnTypes();
    next.filter = filterConfig();
    next.readonly = true;
    next.resize = true;
    next.hideAttribution = true;
    next.stretch = 'all';
    next.style.cssText = 'width:100%;height:100%';
    const sync = async (kind?: 'search') => {
      const ticket = ++read;
      const visibleCount = await getOrderExplorerVisibleCount(next);
      if (disposed || epoch !== generation || ticket !== read) return;
      state.visibleCount = visibleCount;
      // Search and column filters can finish independently. Keep both confirmations
      // when a user refines the list before the search debounce has completed.
      for (const action of [...pending]) {
        if (action === 'search' && kind !== 'search') continue;
        pending.delete(action);
        if (visibleCount > 0 && (action !== 'search' || state.query.trim())) confirmed.add(action);
      }
      state.busy = pending.size > 0;
      const actions = ['preset', 'search', 'filter'] as const;
      while (state.progress < actions.length && confirmed.has(actions[state.progress])) {
        state.progress += 1;
        emit(FIRST_ENTRY_ACTION_EVENT, { progress: state.progress, resultCount: visibleCount });
      }
      notify();
    };
    next.addEventListener('afterfilterapply', () => { void sync(); });
    next.addEventListener('afterquickfilterapply', () => { void sync('search'); });
    host.append(next);
    next.source = createFirstEntryRows();
    void next.componentOnReady().then(() => {
      if (epoch === generation && !disposed && !pending.size) void sync();
    });
  }
  const changeFilter = (action?: FirstEntryAction) => {
    ++read;
    if (action) pending.add(action);
    state.busy = true;
    notify();
    grid.filter = filterConfig();
  };
  mount();
  const handleCompactChange = (event: MediaQueryListEvent) => {
    state.compact = event.matches;
    state.showAllColumns = false;
    syncColumns();
    notify();
  };
  compactQuery.addEventListener('change', handleCompactChange);
  const disconnectTheme = observeCurrentTheme(isDark => {
    grid.theme = isDark ? 'darkMaterial' : 'material';
  });
  return {
    queue(value: boolean) {
      state.queue = value;
      if (value && state.status && !REVIEW_STATUSES.some(status => status === state.status)) state.status = '';
      if (!value) pending.delete('preset');
      changeFilter(value ? 'preset' : undefined);
    },
    search(query: string) {
      // The plugin treats whitespace-only changes as a no-op and emits no event.
      const normalized = (text: string) => text.trim().replace(/\s+/g, ' ');
      if (normalized(state.query) === normalized(query)) {
        state.query = query;
        notify();
        return;
      }
      ++read;
      state.query = query;
      pending.add('search');
      state.busy = true;
      notify();
      grid.quickFilter = { text: query, debounceMs: 150 };
    },
    amount(value: boolean) {
      state.highValue = value;
      if (!value) pending.delete('filter');
      changeFilter(value ? 'filter' : undefined);
    },
    status(value: string) {
      state.status = value;
      if (!value) pending.delete('filter');
      changeFilter(value ? 'filter' : undefined);
    },
    showAllColumns(value: boolean) {
      state.showAllColumns = value;
      syncColumns();
      notify();
    },
    reset() {
      ++generation;
      pending.clear();
      confirmed.clear();
      grid.remove();
      state = initialFirstEntryState(compactQuery.matches);
      emit(FIRST_ENTRY_RESET_EVENT);
      notify();
      mount();
    },
    dispose() {
      disposed = true;
      ++generation;
      compactQuery.removeEventListener('change', handleCompactChange);
      disconnectTheme();
      grid.remove();
    },
  };
}
export type FirstEntryController = ReturnType<typeof createFirstEntryController>;
