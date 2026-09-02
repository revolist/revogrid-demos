import type {
  ColumnGrouping,
  ColumnProp,
  ColumnRegular,
  FilterCollectionItem,
} from '@revolist/revogrid';

export const HR_WORKSPACE_STORAGE_KEY = 'revogrid:grid-at-scale:workspace:v1';
export const HR_DEFAULT_ROW_COUNT = 10_000;

type HRSortColumn = {
  prop: string;
  order: 'asc' | 'desc';
};

export interface HRWorkspaceState {
  rowCount?: number;
  theme?: string;
  columnOrder?: string[];
  columnWidths?: Record<string, number>;
  sorting?: { columns: HRSortColumn[] };
  filter?: { collection: Record<string, FilterCollectionItem> };
}

export interface HRWorkspaceController {
  save(settings: { rowCount: number; theme: string }): Promise<HRWorkspaceState>;
  clear(): void;
  destroy(): void;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type WorkspaceColumn = ColumnGrouping | ColumnRegular;

function getStorage(storage?: StorageLike): StorageLike | undefined {
  if (storage) return storage;
  return typeof localStorage === 'undefined' ? undefined : localStorage;
}

function isGrouping(column: WorkspaceColumn): column is ColumnGrouping {
  return 'children' in column;
}

function getLeafProps(columns: WorkspaceColumn[]): string[] {
  return columns.flatMap(column => isGrouping(column)
    ? getLeafProps(column.children)
    : [String(column.prop)]);
}

function getFirstRank(column: WorkspaceColumn, rank: Map<string, number>) {
  const props = isGrouping(column) ? getLeafProps(column.children) : [String(column.prop)];
  return Math.min(...props.map(prop => rank.get(prop) ?? Number.MAX_SAFE_INTEGER));
}

export function loadHRWorkspace(storage?: StorageLike): HRWorkspaceState {
  try {
    const value = getStorage(storage)?.getItem(HR_WORKSPACE_STORAGE_KEY);
    const parsed = value ? JSON.parse(value) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function clearHRWorkspace(storage?: StorageLike) {
  try {
    getStorage(storage)?.removeItem(HR_WORKSPACE_STORAGE_KEY);
  } catch {
    // Storage may be disabled by browser privacy settings.
  }
}

export function getHRWorkspaceRowCount(state: HRWorkspaceState, allowed: readonly number[]) {
  return state.rowCount && allowed.includes(state.rowCount)
    ? state.rowCount
    : HR_DEFAULT_ROW_COUNT;
}

export function applyHRWorkspaceToColumns(
  columns: WorkspaceColumn[],
  state: HRWorkspaceState,
): WorkspaceColumn[] {
  const rank = new Map((state.columnOrder ?? []).map((prop, index) => [prop, index]));
  const sorting = new Map((state.sorting?.columns ?? []).map(column => [column.prop, column.order]));

  return columns
    .map(column => {
      if (isGrouping(column)) {
        return {
          ...column,
          children: applyHRWorkspaceToColumns(column.children, state),
        };
      }
      const prop = String(column.prop);
      return {
        ...column,
        size: state.columnWidths?.[prop] ?? column.size,
        order: sorting.get(prop),
      };
    })
    .sort((left, right) => getFirstRank(left, rank) - getFirstRank(right, rank));
}

function getColumnWidths(columns: ColumnRegular[]) {
  return Object.fromEntries(columns.flatMap(column => typeof column.size === 'number'
    ? [[String(column.prop), column.size]]
    : []));
}

function writeHRWorkspace(state: HRWorkspaceState, storage?: StorageLike) {
  try {
    getStorage(storage)?.setItem(HR_WORKSPACE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // The demo still works when storage is unavailable or full.
  }
}

export function createHRWorkspaceController(
  grid: HTMLRevoGridElement,
  initialState: HRWorkspaceState,
  onDirty: () => void,
  storage?: StorageLike,
): HRWorkspaceController {
  let draft: HRWorkspaceState = { ...initialState };

  const markDirty = () => onDirty();
  const onColumnDrag = (event: CustomEvent<{ columns: ColumnRegular[] }>) => {
    draft = { ...draft, columnOrder: event.detail.columns.map(column => String(column.prop)) };
    markDirty();
  };
  const onColumnResize = (event: CustomEvent<Record<number, ColumnRegular>>) => {
    draft = {
      ...draft,
      columnWidths: {
        ...draft.columnWidths,
        ...getColumnWidths(Object.values(event.detail)),
      },
    };
    markDirty();
  };
  const onSorting = (event: CustomEvent<{
    sorting?: Record<ColumnProp, 'asc' | 'desc' | undefined>;
    sortingOrder?: ColumnProp[];
  }>) => {
    const order = event.detail.sortingOrder ?? Object.keys(event.detail.sorting ?? {});
    const columns = order.flatMap(prop => {
      const value = event.detail.sorting?.[prop];
      return value ? [{ prop: String(prop), order: value }] : [];
    });
    draft = { ...draft, sorting: { columns } };
    markDirty();
  };
  const onFilter = (event: CustomEvent<{ collection: Record<string, FilterCollectionItem> }>) => {
    draft = { ...draft, filter: { collection: event.detail.collection } };
    markDirty();
  };

  grid.addEventListener('columndragend', onColumnDrag as EventListener);
  grid.addEventListener('aftercolumnresize', onColumnResize as EventListener);
  grid.addEventListener('aftersortingapply', onSorting as EventListener);
  grid.addEventListener('beforefilterapply', onFilter as EventListener);

  return {
    async save(settings) {
      const columns = await grid.getColumns();
      draft = {
        ...draft,
        ...settings,
        columnOrder: columns.map(column => String(column.prop)),
        columnWidths: getColumnWidths(columns),
      };
      writeHRWorkspace(draft, storage);
      return { ...draft };
    },
    clear() {
      draft = {};
      clearHRWorkspace(storage);
    },
    destroy() {
      grid.removeEventListener('columndragend', onColumnDrag as EventListener);
      grid.removeEventListener('aftercolumnresize', onColumnResize as EventListener);
      grid.removeEventListener('aftersortingapply', onSorting as EventListener);
      grid.removeEventListener('beforefilterapply', onFilter as EventListener);
    },
  };
}
