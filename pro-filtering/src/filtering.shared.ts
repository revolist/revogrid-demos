import type {
  ColumnFilterConfig,
  ColumnRegular,
  ColumnTypes,
  FilterData,
  MultiFilterItem,
} from '@revolist/revogrid';
import NumberColumnType from '@revolist/revogrid-column-numeral';
import {
  AdvanceFilterPlugin,
  ColumnStretchPlugin,
  FILTER_DATE,
  FilterHeaderPlugin,
  FIlTER_SELECTION,
  FIlTER_SLIDER,
  RowOddPlugin,
  columnTypeRenderer,
} from '@revolist/revogrid-pro';
import {
  type FilterBadgeFormatContext,
  mountGridFilterBadges,
} from './filter-badges';

export type OrderStatus = 'Processing' | 'Pending Review' | 'Payment Hold' | 'Shipped' | 'Delivered';
export type OrderRegion = 'Europe' | 'North America' | 'Asia Pacific' | 'Latin America';
export type OrderCategory = 'Electronics' | 'Home' | 'Fashion' | 'Sports';
export type OrderExpedited = 'Yes' | 'No';

export interface OrderExplorerRow {
  orderNumber: string;
  customer: string;
  status: OrderStatus;
  region: OrderRegion;
  category: OrderCategory;
  expedited: OrderExpedited;
  total: number;
  orderDate: string;
}

export type OrderExplorerPreset = 'high-value-europe' | 'recent-expedited' | 'review-queue';

const CUSTOMERS = [
  'Avery Johnson', 'Mina Patel', 'Lucas Martin', 'Sofia Rossi', 'Noah Williams',
  'Emma Dubois', 'Mateo Silva', 'Yuki Tanaka', 'Amara Okafor', 'Oliver Smith',
] as const;

export const ORDER_STATUSES: readonly OrderStatus[] = [
  'Processing', 'Pending Review', 'Payment Hold', 'Shipped', 'Delivered',
];
export const ORDER_REGIONS: readonly OrderRegion[] = [
  'Europe', 'North America', 'Asia Pacific', 'Latin America',
];
export const ORDER_CATEGORIES: readonly OrderCategory[] = [
  'Electronics', 'Home', 'Fashion', 'Sports',
];
export const ORDER_EXPEDITED: readonly OrderExpedited[] = ['Yes', 'No'];

const OPTIONS_BY_PROP: Record<string, readonly string[]> = {
  status: ORDER_STATUSES,
  region: ORDER_REGIONS,
  category: ORDER_CATEGORIES,
  expedited: ORDER_EXPEDITED,
};

const COLUMN_LABELS: Record<string, string> = {
  orderNumber: 'Order',
  customer: 'Customer',
  status: 'Status',
  region: 'Region',
  category: 'Category',
  expedited: 'Expedited',
  total: 'Total',
  orderDate: 'Order date',
};

const OPERATOR_LABELS: Record<string, string> = {
  contains: 'contains',
  notContains: 'does not contain',
  eq: '=',
  neq: '≠',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  equals: 'on',
  before: 'before',
  after: 'after',
  onOrBefore: 'on or before',
  onOrAfter: 'on or after',
  between: 'between',
  today: 'Today',
  yesterday: 'Yesterday',
  last7Days: 'Last 7 days',
  thisMonth: 'This month',
  lastMonth: 'Last month',
  thisQuarter: 'This quarter',
  nextQuarter: 'Next quarter',
  previousQuarter: 'Previous quarter',
  thisYear: 'This year',
  nextYear: 'Next year',
  previousYear: 'Previous year',
};

export const orderExplorerPlugins = [
  AdvanceFilterPlugin,
  FilterHeaderPlugin,
  ColumnStretchPlugin,
  RowOddPlugin,
];

export function createOrderExplorerColumnTypes(): ColumnTypes {
  return {
    currency: new NumberColumnType('$0,0.00'),
  };
}

export function createOrderExplorerColumns(): ColumnRegular[] {
  return [
    {
      name: 'Order',
      prop: 'orderNumber',
      size: 138,
      filter: 'string',
      columnType: 'id',
      columnTemplate: columnTypeRenderer,
    },
    {
      name: 'Customer',
      prop: 'customer',
      size: 175,
      filter: 'string',
      columnType: 'string',
      columnTemplate: columnTypeRenderer,
    },
    {
      name: 'Status',
      prop: 'status',
      size: 150,
      filter: [FIlTER_SELECTION],
      columnType: 'string',
      columnTemplate: columnTypeRenderer,
    },
    {
      name: 'Region',
      prop: 'region',
      size: 150,
      filter: [FIlTER_SELECTION],
      columnType: 'string',
      columnTemplate: columnTypeRenderer,
    },
    {
      name: 'Category',
      prop: 'category',
      size: 132,
      filter: [FIlTER_SELECTION],
      columnType: 'string',
      columnTemplate: columnTypeRenderer,
    },
    {
      name: 'Expedited',
      prop: 'expedited',
      size: 116,
      filter: [FIlTER_SELECTION],
      columnType: 'boolean',
      columnTemplate: columnTypeRenderer,
    },
    {
      name: 'Total',
      prop: 'total',
      size: 132,
      filter: ['number', FIlTER_SLIDER],
      columnType: 'currency',
      columnTemplate: columnTypeRenderer,
    },
    {
      name: 'Order date',
      prop: 'orderDate',
      size: 180,
      filter: [FILTER_DATE],
      columnType: 'date',
      columnTemplate: columnTypeRenderer,
    },
  ];
}

function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createOrderExplorerRows(count = 1000, now = new Date()): OrderExplorerRow[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today);
    date.setDate(date.getDate() - ((index * 17) % 120));
    return {
      orderNumber: `ORD-${String(100001 + index).padStart(6, '0')}`,
      customer: CUSTOMERS[(index * 7) % CUSTOMERS.length],
      status: ORDER_STATUSES[(index * 3 + Math.floor(index / 11)) % ORDER_STATUSES.length],
      region: ORDER_REGIONS[(index * 5 + Math.floor(index / 7)) % ORDER_REGIONS.length],
      category: ORDER_CATEGORIES[(index * 11 + Math.floor(index / 5)) % ORDER_CATEGORIES.length],
      expedited: index % 4 === 0 || index % 11 === 0 ? 'Yes' : 'No',
      total: Math.round((45 + ((index * 7919) % 245000) / 100) * 100) / 100,
      orderDate: localDateString(date),
    };
  });
}

function normalizeOption(value: string): string {
  return value.toLowerCase().trim();
}

function excludedSelectionValues(prop: string, included: readonly string[]): Set<string> {
  const includedValues = new Set(included.map(normalizeOption));
  return new Set(
    (OPTIONS_BY_PROP[prop] ?? [])
      .map(normalizeOption)
      .filter(value => !includedValues.has(value)),
  );
}

function selectionItem(id: number, prop: string, included: readonly string[]): FilterData {
  return {
    id,
    type: FIlTER_SELECTION,
    value: excludedSelectionValues(prop, included),
    relation: 'and',
    hidden: true,
  };
}

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
        : filter.value && typeof filter.value === 'object'
          ? { ...filter.value }
          : filter.value,
    })),
  ]));
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
      formatValue: formatCurrency,
      formatInputValue: value => value.toFixed(2),
    },
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value % 1 ? 2 : 0,
  }).format(value);
}

function formatSelectionValue(prop: string, value: unknown): string {
  const excluded = new Set(
    value instanceof Set
      ? [...value].map(item => normalizeOption(String(item)))
      : Array.isArray(value)
        ? value.map(item => normalizeOption(String(item)))
        : [],
  );
  const included = (OPTIONS_BY_PROP[prop] ?? [])
    .filter(option => !excluded.has(normalizeOption(option)));
  return included.length ? included.join(', ') : 'None';
}

function formatFilterValue(prop: string, filter: FilterData): string {
  const filterType = String(filter.type);
  if (filterType === FIlTER_SELECTION) {
    return formatSelectionValue(prop, filter.value);
  }
  if (filterType === FIlTER_SLIDER) {
    const range = filter.value as { fromValue?: number; toValue?: number } | undefined;
    return `${formatCurrency(range?.fromValue ?? 0)} – ${formatCurrency(range?.toValue ?? 0)}`;
  }
  if (filterType === 'between' && filter.value && typeof filter.value === 'object') {
    const value = filter.value as { fromDate?: string; toDate?: string };
    return `${value.fromDate ?? '…'} – ${value.toDate ?? '…'}`;
  }
  const operator = OPERATOR_LABELS[filterType] ?? filterType;
  if (filter.value === undefined || filter.value === '') {
    return operator;
  }
  const value = prop === 'total' && typeof filter.value === 'number'
    ? formatCurrency(filter.value)
    : String(filter.value);
  return `${operator} ${value}`;
}

export function formatOrderExplorerFilterBadge({
  prop,
  filter,
  index,
}: FilterBadgeFormatContext) {
  const relation = index ? `${String(filter.relation ?? 'and').toUpperCase()} ` : '';
  return `${COLUMN_LABELS[String(prop)] ?? String(prop)}: ${relation}${formatFilterValue(String(prop), filter)}`;
}

export function mountOrderExplorerFilterBadges(
  grid: HTMLRevoGridElement,
  root: HTMLElement,
) {
  return mountGridFilterBadges({
    grid,
    root,
    className: 'order-explorer__chips',
    badgeClassName: 'order-explorer__chip',
    emptyClassName: 'order-explorer__empty',
    formatLabel: formatOrderExplorerFilterBadge,
  });
}

export async function getOrderExplorerVisibleCount(
  grid: HTMLRevoGridElement | null | undefined,
  fallback = 0,
): Promise<number> {
  if (!grid) return fallback;
  return (await grid.getVisibleSource()).length;
}
