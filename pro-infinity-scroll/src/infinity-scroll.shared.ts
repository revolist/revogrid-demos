import type {
  ColumnProp,
  ColumnRegular,
  FilterCollectionItem,
  MultiFilterItem,
} from '@revolist/revogrid';

export const INFINITY_SCROLL_TOTAL_RECORDS = 1000;

export type InfinityScrollUser = {
  id: number;
  name: string;
  email: string;
  region: 'Europe' | 'North America' | 'Asia Pacific' | 'Latin America';
  status: 'Active' | 'Invited' | 'Review';
};

export type InfinityScrollOrder = Partial<Record<ColumnProp, 'asc' | 'desc'>>;
export type InfinityScrollFilter = Record<ColumnProp, FilterCollectionItem>;
export type InfinityScrollQuickFilter = {
  text: string;
  columns?: ColumnProp[];
};

const REGIONS: InfinityScrollUser['region'][] = [
  'Europe',
  'North America',
  'Asia Pacific',
  'Latin America',
];
const STATUSES: InfinityScrollUser['status'][] = ['Active', 'Invited', 'Review'];

export function createInfinityScrollColumns(): ColumnRegular[] {
  return [
    { prop: 'id', name: 'ID', rowSelect: true, sortable: true, size: 90 },
    { prop: 'name', name: 'Name', sortable: true, filter: ['selection'], size: 210 },
    { prop: 'email', name: 'Email', filter: true, size: 260 },
    { prop: 'region', name: 'Region', sortable: true, filter: ['selection'], size: 170 },
    { prop: 'status', name: 'Status', filter: ['selection'], size: 130 },
  ];
}

export function createInfinityScrollRows(total = INFINITY_SCROLL_TOTAL_RECORDS): InfinityScrollUser[] {
  return Array.from({ length: total }, (_, index) => {
    const id = index + 1;
    return {
      id,
      name: `Remote User ${String(id).padStart(4, '0')}`,
      email: `user${id}@example.com`,
      region: REGIONS[(index * 3 + Math.floor(index / 11)) % REGIONS.length],
      status: STATUSES[(index * 5 + Math.floor(index / 7)) % STATUSES.length],
    };
  });
}

export function createInfinityScrollPinnedTopRows() {
  return [
    { id: 'live-status', name: 'Pinned status', email: 'Remote rows load below', region: 'All regions', status: 'Live' },
  ];
}

export function createInfinityScrollPinnedBottomRows() {
  return [
    { id: 'support', name: 'Pinned support', email: 'Always visible while scrolling', region: 'Global', status: 'Online' },
  ];
}

function matchesFilter(value: unknown, filter: FilterCollectionItem, selectionFilterType: string) {
  const cell = String(value ?? '').toLowerCase();
  const term = String(filter.value ?? '').toLowerCase();

  switch (filter.type) {
    case 'contains': return cell.includes(term);
    case 'notContains': return !cell.includes(term);
    case 'begins': return cell.startsWith(term);
    case 'eq': return cell === term;
    case 'notEq': return cell !== term;
    case 'empty': return cell === '';
    case 'notEmpty': return cell !== '';
    case selectionFilterType: {
      const excluded = filter.value instanceof Set ? filter.value : new Set<unknown>();
      return !excluded.has(value) && !excluded.has(cell);
    }
    default: return true;
  }
}

function matchesMultiFilter(
  row: InfinityScrollUser,
  filters: MultiFilterItem | undefined,
  selectionFilterType: string,
) {
  if (!filters) return true;
  return Object.entries(filters).every(([prop, conditions]) => {
    if (!conditions.length) return true;
    let result = matchesFilter(row[prop as keyof InfinityScrollUser], conditions[0], selectionFilterType);
    for (let index = 1; index < conditions.length; index++) {
      const condition = conditions[index];
      const matches = matchesFilter(row[prop as keyof InfinityScrollUser], condition, selectionFilterType);
      result = condition.relation === 'or' ? result || matches : result && matches;
    }
    return result;
  });
}

function matchesQuickFilter(row: InfinityScrollUser, quickFilter?: InfinityScrollQuickFilter) {
  const terms = quickFilter?.text.trim().toLowerCase().split(/\s+/).filter(Boolean) ?? [];
  if (!terms.length) return true;
  const columns = quickFilter?.columns?.length
    ? quickFilter.columns
    : ['id', 'name', 'email', 'region', 'status'];
  const values = columns.map((prop) => String(row[prop as keyof InfinityScrollUser] ?? '').toLowerCase());
  return terms.every((term) => values.some((value) => value.includes(term)));
}

export function createInfinityScrollDataLoader({
  rows = createInfinityScrollRows(),
  selectionFilterType,
  delayMs = 350,
}: {
  rows?: InfinityScrollUser[];
  selectionFilterType: string;
  delayMs?: number;
}) {
  return async (
    skip: number,
    limit: number,
    order?: InfinityScrollOrder,
    singleConditionFilters?: InfinityScrollFilter,
    multiConditionFilters?: MultiFilterItem,
    quickFilter?: InfinityScrollQuickFilter,
  ) => {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    let result = rows.filter((row) => {
      const singleMatches = !singleConditionFilters || Object.entries(singleConditionFilters).every(
        ([prop, filter]) => matchesFilter(row[prop as keyof InfinityScrollUser], filter, selectionFilterType),
      );
      return singleMatches
        && matchesMultiFilter(row, multiConditionFilters, selectionFilterType)
        && matchesQuickFilter(row, quickFilter);
    });

    const [sortProp, direction] = Object.entries(order ?? {})[0] ?? [];
    if (sortProp && direction) {
      result = [...result].sort((left, right) => {
        const comparison = String(left[sortProp as keyof InfinityScrollUser]).localeCompare(
          String(right[sortProp as keyof InfinityScrollUser]),
          undefined,
          { numeric: true },
        );
        return direction === 'desc' ? -comparison : comparison;
      });
    }

    return {
      data: result.slice(skip, skip + limit),
      total: result.length,
      hasMore: skip + limit < result.length,
    };
  };
}
