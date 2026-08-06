import type { FilterData } from '@revolist/revogrid';
import {
  type AdvancedFilterBadgeFormatContext,
  FIlTER_SELECTION,
  FIlTER_SLIDER,
  mountAdvancedFilterBadges,
} from '@revolist/revogrid-pro';
import {
  formatOrderCurrency,
  normalizeFilterOption,
} from './filtering.config';
import { ORDER_OPTIONS_BY_PROP } from './filtering.data';

const COLUMN_LABELS: Record<string, string> = {
  orderNumber: 'Order',
  customer: 'Customer',
  status: 'Status',
  region: 'Region',
  city: 'City',
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

function formatSelectionValue(prop: string, value: unknown): string {
  const excluded = new Set(
    value instanceof Set
      ? [...value].map(item => normalizeFilterOption(String(item)))
      : Array.isArray(value)
        ? value.map(item => normalizeFilterOption(String(item)))
        : [],
  );
  const included = (ORDER_OPTIONS_BY_PROP[prop] ?? [])
    .filter(option => !excluded.has(normalizeFilterOption(option)));
  return included.length ? included.join(', ') : 'None';
}

function formatFilterValue(prop: string, filter: FilterData): string {
  const filterType = String(filter.type);
  if (filterType === FIlTER_SELECTION) {
    return formatSelectionValue(prop, filter.value);
  }
  if (filterType === FIlTER_SLIDER) {
    const range = filter.value as { fromValue?: number; toValue?: number } | undefined;
    return `${formatOrderCurrency(range?.fromValue ?? 0)} – ${formatOrderCurrency(range?.toValue ?? 0)}`;
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
    ? formatOrderCurrency(filter.value)
    : String(filter.value);
  return `${operator} ${value}`;
}

export function formatOrderExplorerFilterBadge({
  prop,
  filter,
  index,
}: AdvancedFilterBadgeFormatContext) {
  const relation = index ? `${String(filter.relation ?? 'and').toUpperCase()} ` : '';
  return `${COLUMN_LABELS[String(prop)] ?? String(prop)}: ${relation}${formatFilterValue(String(prop), filter)}`;
}

// Badges reflect the same grid.filter state; they do not keep a second filter model.
export function mountOrderExplorerFilterBadges(
  grid: HTMLRevoGridElement,
  root: HTMLElement,
) {
  return mountAdvancedFilterBadges({
    grid,
    root,
    className: 'order-explorer__chips',
    badgeClassName: 'order-explorer__chip',
    emptyClassName: 'order-explorer__empty',
    formatLabel: formatOrderExplorerFilterBadge,
  });
}

export interface OrderExplorerQuickBadgeController {
  refresh(text: string): void;
  destroy(): void;
}

export function mountOrderExplorerQuickBadge(
  root: HTMLElement,
  onRemove: () => void,
): OrderExplorerQuickBadgeController {
  const refresh = (text: string) => {
    root.replaceChildren();
    const normalized = text.trim().replace(/\s+/g, ' ');
    if (!normalized) return;

    const badge = document.createElement('span');
    badge.className = 'rv-btn-pill rv-filter-badge order-explorer__chip';
    badge.setAttribute('role', 'listitem');
    badge.append(document.createTextNode(`Search: ${normalized}`));

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'rv-chip-remove';
    remove.setAttribute('aria-label', `Remove Search: ${normalized} filter`);
    remove.textContent = '×';
    remove.addEventListener('click', onRemove);
    badge.append(remove);
    root.append(badge);
  };

  return { refresh, destroy: () => root.replaceChildren() };
}
