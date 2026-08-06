import type {
  ColumnFilterConfig,
  FilterData,
  MultiFilterItem,
} from '@revolist/revogrid';
import { FIlTER_SELECTION, FIlTER_SLIDER } from '@revolist/revogrid-pro';
import { ORDER_OPTIONS_BY_PROP } from './filtering.data';

export type OrderExplorerPreset = 'high-value-europe' | 'recent-expedited' | 'review-queue';

export function normalizeFilterOption(value: string): string {
  return value.toLowerCase().trim();
}

function selectionItem(id: number, prop: string, included: readonly string[]): FilterData {
  const includedValues = new Set(included.map(normalizeFilterOption));
  const excludedValues = (ORDER_OPTIONS_BY_PROP[prop] ?? [])
    .map(normalizeFilterOption)
    .filter(value => !includedValues.has(value));

  return {
    id,
    type: FIlTER_SELECTION,
    value: new Set(excludedValues),
    relation: 'and',
    hidden: true,
  };
}

// A preset is just a MultiFilterItem object assigned to the grid filter config.
export function createOrderExplorerPreset(preset: OrderExplorerPreset): MultiFilterItem {
  switch (preset) {
    case 'high-value-europe':
      return {
        region: [selectionItem(101, 'region', ['Europe'])],
        total: [{
          id: 102,
          type: FIlTER_SLIDER,
          value: { fromValue: 900, toValue: 2495 },
          relation: 'and',
          hidden: true,
        }],
      };
    case 'recent-expedited':
      return {
        orderDate: [{ id: 201, type: 'last7Days' as FilterData['type'], relation: 'and' }],
        expedited: [selectionItem(202, 'expedited', ['Yes'])],
      };
    case 'review-queue':
      return {
        status: [selectionItem(301, 'status', ['Pending Review', 'Payment Hold'])],
        total: [
          { id: 302, type: 'gte', value: 250, relation: 'and' },
          { id: 303, type: 'lte', value: 800, relation: 'and' },
        ],
      };
  }
}

export function createOrderExplorerInitialFilters(): MultiFilterItem {
  return createOrderExplorerPreset('high-value-europe');
}

export function cloneOrderExplorerFilterItems(items: MultiFilterItem = {}): MultiFilterItem {
  return Object.fromEntries(Object.entries(items).map(([prop, filters]) => [
    prop,
    filters.map(filter => ({
      ...filter,
      value: filter.value instanceof Set
        ? new Set(filter.value)
        : filter.value instanceof Date
          ? new Date(filter.value)
          : filter.value && typeof filter.value === 'object'
            ? { ...filter.value }
            : filter.value,
    })),
  ]));
}

export function formatOrderCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value % 1 ? 2 : 0,
  }).format(value);
}

export function createOrderExplorerFilter(multiFilterItems: MultiFilterItem = {}): ColumnFilterConfig {
  return {
    allowDuplicateOperators: true,
    multiFilterItems: cloneOrderExplorerFilterItems(multiFilterItems),
    disableDynamicFiltering: false,
    expressions: {
      enabled: true,
      buttonLabel: 'Expression',
      placeholder: 'Examples: contains "Avery" OR contains "Mina"',
    },
    selection: {
      sortDirection: 'asc',
      sourceRowTypes: ['rgRow'],
      cascadeOptions: {
        enabled: true,
        showDependencyNumbers: true,
      },
    },
    slider: {
      showRangeDisplay: true,
      showRangeInputs: true,
      formatValue: formatOrderCurrency,
      formatInputValue: value => value.toFixed(2),
    },
  };
}

export async function getOrderExplorerVisibleCount(
  grid: HTMLRevoGridElement | null | undefined,
  fallback = 0,
): Promise<number> {
  if (!grid) return fallback;
  return (await grid.getVisibleSource()).length;
}

export const ORDER_EXPLORER_QUICK_FILTER_EXAMPLE = 'Lisbon pending';

export type QuickFilterInput = string | {
  text: string;
  columns?: Array<string | number>;
  debounceMs?: number;
};

// Global search is one property update; RevoGrid handles matching and refreshing rows.
export function setOrderExplorerQuickFilter(grid: HTMLRevoGridElement, text: string) {
  (grid as HTMLRevoGridElement & { quickFilter?: QuickFilterInput }).quickFilter = {
    text,
    debounceMs: 150,
  };
}
