import type { ColumnData, ColumnProp, ColumnRegular } from '@revolist/revogrid';
import type { ContextMenuActionContext } from '@revolist/revogrid-pro';
import type { ProjectBulkAction, ProjectGroupProp, ProjectRow, ProjectSortValue } from './types';
import { withTimelineProgress } from './data';
import { clearHeaderFilterInputValues, findHeaderFilterControl } from './dom';
import { projectFilterConfig } from './filters';
import {
  projectDepartmentOptions,
  projectOwnerProfiles,
  projectPriorityOptions,
  projectRiskOptions,
  projectSections,
  projectSortOptions,
  projectStatusOptions,
} from './options';

export function resolveProjectSort(value: ProjectSortValue) {
  if (!value) return null;
  const [prop, order] = value.split(':') as [ColumnProp, 'asc' | 'desc'];
  return { prop, order };
}

export function resolveProjectSortValueFromConfig(detail: unknown): ProjectSortValue {
  const columns = Array.isArray((detail as { columns?: unknown })?.columns)
    ? (detail as { columns: Array<{ prop?: unknown; order?: unknown }> }).columns
    : [];
  const column = columns[0];
  const order = column?.order === 'asc' || column?.order === 'desc' ? column.order : '';
  const prop = column?.prop === undefined ? '' : String(column.prop);
  const value = order ? `${prop}:${order}` as ProjectSortValue : '';

  return projectSortOptions.some((option) => option.value === value) ? value : '';
}

export async function applyProjectSort(grid: HTMLRevoGridElement | undefined | null, columns: ColumnRegular[], value: ProjectSortValue) {
  if (!grid) return;
  const sort = resolveProjectSort(value);
  if (!sort) {
    await grid.clearSorting();
    return;
  }
  const column = columns.find((col) => col.prop === sort.prop);
  if (column) await grid.updateColumnSorting(column, sort.order, false);
}

export function getSelectedProjectIndexes(event: CustomEvent<HTMLRevoGridElementEventMap['rowselected']>) {
  const indexes = new Set<number>();
  event.detail.selected.forEach((set) => {
    set.forEach((index) => indexes.add(index));
  });
  return indexes;
}

export function getProjectSelectionLabel(selected: number, total: number) {
  return `${selected} / ${total}`;
}

export function applyProjectBulkAction(
  rows: ProjectRow[],
  selectedIndexes: Set<number>,
  action: ProjectBulkAction,
  groupBy: ProjectGroupProp = '',
): ProjectRow[] {
  if (!selectedIndexes.size) return rows;
  if (action === 'delete') {
    return orderProjectRowsForGrouping(rows.filter((_, index) => !selectedIndexes.has(index)), groupBy);
  }
  const nextRows: ProjectRow[] = rows.map((row, index): ProjectRow => {
    if (!selectedIndexes.has(index)) return row;
    if (action === 'markReady') {
      const progress = Math.max(row.progress, 85);
      return { ...row, status: 'Ready', section: 'Launch ready', progress, timeline: withTimelineProgress(row.timeline, progress) };
    }
    if (action === 'markBlocked') {
      const progress = Math.min(row.progress, 10);
      return { ...row, status: 'Blocked', section: 'Blocked', risk: 'High', progress, timeline: withTimelineProgress(row.timeline, progress) };
    }
    return { ...row, section: 'Launch ready', status: row.status === 'Blocked' ? 'In Review' : row.status };
  });

  return orderProjectRowsForGrouping(nextRows, groupBy);
}

export function orderProjectRowsForGrouping(rows: ProjectRow[], groupBy: ProjectGroupProp): ProjectRow[] {
  const orderedValues = getProjectGroupOrder(groupBy);
  if (!orderedValues.length) return rows;

  const order = new Map(orderedValues.map((value, index) => [value, index]));
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const aOrder = order.get(String(a.row[groupBy])) ?? Number.MAX_SAFE_INTEGER;
      const bOrder = order.get(String(b.row[groupBy])) ?? Number.MAX_SAFE_INTEGER;
      return aOrder === bOrder ? a.index - b.index : aOrder - bOrder;
    })
    .map(({ row }) => row);
}

function getProjectGroupOrder(groupBy: ProjectGroupProp) {
  if (groupBy === 'section') return projectSections;
  if (groupBy === 'status') return projectStatusOptions.map((option) => option.value);
  if (groupBy === 'priority') return projectPriorityOptions.map((option) => option.value);
  if (groupBy === 'risk') return projectRiskOptions.map((option) => option.value);
  if (groupBy === 'department') return projectDepartmentOptions.map((option) => option.value);
  if (groupBy === 'owner') return projectOwnerProfiles.map((option) => option.value);
  return [];
}

export function syncProjectProgressEdit(rows: ProjectRow[], detail: unknown): ProjectRow[] {
  return syncProjectCellEdit(rows, detail);
}

export function syncProjectCellEdit(rows: ProjectRow[], detail: unknown): ProjectRow[] {
  if (!isSingleProjectEdit(detail)) return rows;

  const prop = detail.prop;
  const editedId = typeof detail.model?.id === 'string' ? detail.model.id : '';
  const value = prop === 'progress'
    ? Math.max(0, Math.min(100, Number(detail.val ?? 0)))
    : detail.val;
  let changed = false;

  const nextRows = rows.map((row, index) => {
    const isEditedRow = editedId ? row.id === editedId : index === detail.rowIndex;
    if (!isEditedRow) return row;

    const currentValue = (row as Record<string, unknown>)[prop];
    if (JSON.stringify(currentValue) === JSON.stringify(value)) {
      return row;
    }

    changed = true;
    const nextRow = {
      ...row,
      [prop]: value,
    } as ProjectRow;

    if (prop === 'progress') {
      nextRow.timeline = withTimelineProgress(row.timeline, Number(value));
    }

    return nextRow;
  });

  return changed ? nextRows : rows;
}

function isSingleProjectEdit(detail: unknown): detail is { prop: string; val: unknown; rowIndex: number; model?: ProjectRow } {
  if (!detail || typeof detail !== 'object') return false;
  if (!('prop' in detail) || (detail as { prop?: unknown }).prop === undefined) return false;
  return 'val' in detail;
}

export function updateProjectColumnsByProp(
  columns: ColumnData,
  prop: ColumnProp,
  updater: (column: ColumnRegular) => ColumnRegular,
): ColumnData {
  return columns.map((column) => {
    if ('children' in column && Array.isArray(column.children)) {
      return {
        ...column,
        children: updateProjectColumnsByProp(column.children, prop, updater),
      };
    }

    if (!('prop' in column)) {
      return column;
    }

    if (column.prop !== prop) {
      return column;
    }

    return updater({ ...column });
  });
}

export function clearProjectSelection(grid: HTMLRevoGridElement | undefined | null) {
  grid?.dispatchEvent(new CustomEvent('rowallselectclick', {
    detail: { selected: false, type: 'rgCol' },
    bubbles: true,
    composed: true,
  }));
}

export function clearProjectFilters(grid: HTMLRevoGridElement | undefined | null) {
  if (!grid) return;
  grid.dispatchEvent(new CustomEvent('filter', {
    detail: {},
    bubbles: true,
    composed: true,
  }));
  grid.filter = {
    ...projectFilterConfig,
    multiFilterItems: {},
  };
  clearHeaderFilterInputValues(grid);
}

export function focusFirstProjectHeaderFilter(grid: HTMLRevoGridElement | undefined | null) {
  const target = findHeaderFilterControl(grid);
  target?.focus();
  target?.click();
}

export function openProjectStatusHeaderFilter(grid: HTMLRevoGridElement | undefined | null) {
  const target = findHeaderFilterControl(grid, 'Filter Status');
  target?.focus();
  target?.click();
}

export function openProjectColumnHeaderFilter(context?: ContextMenuActionContext) {
  const menu = context?.menu?.target === 'column' ? context.menu : undefined;
  const grid = context?.revogrid ?? menu?.revogrid;
  const column = menu?.column;
  const title = column?.name ? `Filter ${column.name}` : undefined;
  const prop = column?.prop === undefined ? undefined : String(column.prop);
  const target = findHeaderFilterControl(grid, title, prop);

  target?.focus();
  target?.click();
}
