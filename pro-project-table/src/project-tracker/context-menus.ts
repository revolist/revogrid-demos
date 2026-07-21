import { getSourcePhysicalIndex, isGrouping, type ColumnProp } from '@revolist/revogrid';
import type { ColumnContextMenuOpenContext, ContextMenuActionContext, ContextMenuConfig, ContextMenuItem, RowContextMenuOpenContext } from '@revolist/revogrid-pro';
import arrowDownZAIcon from '@fortawesome/fontawesome-free/svgs/solid/arrow-down-z-a.svg?raw';
import arrowUpAZIcon from '@fortawesome/fontawesome-free/svgs/solid/arrow-up-a-z.svg?raw';
import banIcon from '@fortawesome/fontawesome-free/svgs/solid/ban.svg?raw';
import checkIcon from '@fortawesome/fontawesome-free/svgs/solid/circle-check.svg?raw';
import clearIcon from '@fortawesome/fontawesome-free/svgs/solid/circle-xmark.svg?raw';
import copyIcon from '@fortawesome/fontawesome-free/svgs/solid/copy.svg?raw';
import eraserIcon from '@fortawesome/fontawesome-free/svgs/solid/eraser.svg?raw';
import eyeSlashIcon from '@fortawesome/fontawesome-free/svgs/solid/eye-slash.svg?raw';
import filterIcon from '@fortawesome/fontawesome-free/svgs/solid/filter.svg?raw';
import rocketIcon from '@fortawesome/fontawesome-free/svgs/solid/rocket.svg?raw';
import thumbtackIcon from '@fortawesome/fontawesome-free/svgs/solid/thumbtack.svg?raw';
import trashIcon from '@fortawesome/fontawesome-free/svgs/solid/trash.svg?raw';
import type { ProjectContextMenuController, ProjectRow, ProjectSortValue } from './types';
import { applyProjectSort, clearProjectFilters, openProjectColumnHeaderFilter, orderProjectRowsForGrouping, updateProjectColumnsByProp } from './actions';
import { PROJECT_COLUMN_ADD_PROP } from './columns';
import { projectHideableColumns, projectSortOptions } from './options';
import { formatProjectBudget } from './summary';
import { withTimelineProgress } from './data';
import { toProjectHiddenColumns } from './utils';

export function createProjectContextMenus(controller: ProjectContextMenuController): {
  rowContextMenu: ContextMenuConfig;
  columnContextMenu: ContextMenuConfig;
} {
  const rowContextMenu: ContextMenuConfig = {
    resolve: (context) => {
      if (context.target !== 'row' || !resolveProjectRowFromOpenContext(context, controller)) {
        return null;
      }
    },
    items: [
      {
        name: 'Duplicate project',
        icon: copyIcon,
        class: 'project-context-section-primary',
        action: (_, focused, __, ___, context) => {
          const targets = resolveProjectRowTargetsFromActionContext(context, controller, focused);
          if (!targets.length) return;
          const targetIds = new Set(targets.map((target) => target.row.id));
          const rows = controller.getRows();
          setProjectRowsFromContextMenu(
            controller,
            rows.flatMap((row) => targetIds.has(row.id) ? [row, duplicateProjectRow(row)] : [row]),
          );
        },
      },
      {
        name: 'Mark ready',
        icon: checkIcon,
        class: 'project-context-section-start',
        action: (_, focused, __, ___, context) => updateProjectRowFromMenu(context, controller, focused, markProjectReady),
      },
      {
        name: 'Block project',
        icon: banIcon,
        action: (_, focused, __, ___, context) => updateProjectRowFromMenu(context, controller, focused, blockProject),
      },
      {
        name: 'Move to launch',
        icon: rocketIcon,
        action: (_, focused, __, ___, context) => updateProjectRowFromMenu(context, controller, focused, moveProjectToLaunch),
      },
      {
        name: 'Delete project',
        icon: trashIcon,
        class: 'project-context-danger project-context-section-start',
        action: (_, focused, __, ___, context) => {
          const targets = resolveProjectRowTargetsFromActionContext(context, controller, focused);
          if (!targets.length) return;
          const targetIds = new Set(targets.map((target) => target.row.id));
          setProjectRowsFromContextMenu(controller, controller.getRows().filter((row) => !targetIds.has(row.id)));
          controller.clearSelection();
        },
      },
    ],
  };

  const columnContextMenu: ContextMenuConfig = {
    anchorToTarget: true,
    resolve: (context) => {
      if (context.target !== 'column' || !context.column) {
        return null;
      }

      if (context.column.prop === PROJECT_COLUMN_ADD_PROP) {
        return null;
      }

      if (context.column.prop === '_selected') {
        return {
          items: [
            {
              name: 'Clear selection',
              icon: clearIcon,
              action: (_, __, ___, close) => {
                closeColumnContextMenu(close);
                controller.clearSelection();
              },
            },
          ],
        };
      }

      return {
        items: closeColumnContextItemsOnAction(createProjectColumnContextItems(context, controller)),
      };
    },
    items: [],
  };

  return { rowContextMenu, columnContextMenu };
}

function createProjectColumnContextItems(
  menu: ColumnContextMenuOpenContext,
  controller: ProjectContextMenuController,
): ContextMenuItem[] {
  const column = menu.column;
  if (!column) return [];

  const prop = column.prop;
  if (prop === PROJECT_COLUMN_ADD_PROP) {
    return [];
  }
  const canSort = column.sortable !== false;
  const canFilter = column.filter !== false;
  const canHide = projectHideableColumns.some((item) => item.prop === prop);
  const isPinned = !!column.pin;
  const columnName = typeof column.name === 'string' && column.name.trim()
    ? column.name
    : String(prop);

  return [
    {
      name: columnName,
      class: 'project-context-column-title',
      keepOpen: true,
      template: (h) => h('span', { class: 'project-context-column-title__inner' }, [
        h('span', { class: 'project-context-column-title__eyebrow' }, 'Column'),
        h('span', { class: 'project-context-column-title__name' }, columnName),
      ]),
    },
    canSort ? {
      name: 'Sort ascending',
      icon: arrowUpAZIcon,
      class: 'project-context-section-start',
      action: (_, __, ___, ____, context) => {
        const activeColumn = getColumnActionContext(context)?.column ?? column;
        controller.setSortBy?.(toProjectSortValue(activeColumn.prop, 'asc'));
        void controller.getGrid()?.updateColumnSorting(activeColumn, 'asc', false);
      },
    } : undefined,
    canSort ? {
      name: 'Sort descending',
      icon: arrowDownZAIcon,
      action: (_, __, ___, ____, context) => {
        const activeColumn = getColumnActionContext(context)?.column ?? column;
        controller.setSortBy?.(toProjectSortValue(activeColumn.prop, 'desc'));
        void controller.getGrid()?.updateColumnSorting(activeColumn, 'desc', false);
      },
    } : undefined,
    canSort ? {
      name: 'Clear sorting',
      icon: eraserIcon,
      action: () => {
        controller.setSortBy?.('');
        void controller.getGrid()?.clearSorting();
      },
    } : undefined,
    canFilter ? {
      name: 'Open header filter',
      icon: filterIcon,
      class: 'project-context-section-start',
      action: (_, __, ___, ____, context) => openProjectColumnHeaderFilter(context),
    } : undefined,
    canFilter ? {
      name: 'Clear filters',
      icon: eraserIcon,
      action: () => clearProjectFilters(controller.getGrid()),
    } : undefined,
    canHide ? {
      name: 'Hide column',
      icon: eyeSlashIcon,
      class: 'project-context-section-start',
      action: (_, __, ___, ____, context) => {
        const activeColumn = getColumnActionContext(context)?.column ?? column;
        const next = Array.from(new Set([...controller.getHiddenColumns(), activeColumn.prop]));
        controller.setHiddenColumns(next);
      },
    } : undefined,
    prop !== '_selected' ? {
      name: isPinned ? 'Unpin column' : 'Pin column left',
      icon: thumbtackIcon,
      action: (_, __, ___, ____, context) => {
        const activeColumn = getColumnActionContext(context)?.column ?? column;
        const nextColumns = updateProjectColumnsByProp(controller.getColumns(), activeColumn.prop, (target) => {
          if (isPinned) {
            const { pin: _pin, ...rest } = target;
            return rest;
          }
          return { ...target, pin: 'colPinStart' };
        });
        controller.setColumns(nextColumns);
      },
    } : undefined,
  ].filter(Boolean) as ContextMenuItem[];
}

function closeColumnContextItemsOnAction(items: ContextMenuItem[]): ContextMenuItem[] {
  return items.map((item) => {
    if (!item.action || item.keepOpen) {
      return item;
    }

    return {
      ...item,
      action: (...args: Parameters<NonNullable<ContextMenuItem['action']>>) => {
        const close = args[3];
        closeColumnContextMenu(close);
        const result = item.action?.(...args);
        closeColumnContextMenu(close);
        return result;
      },
    };
  });
}

function closeColumnContextMenu(close?: () => void) {
  close?.();
  window.setTimeout(() => close?.(), 0);
}

function getColumnActionContext(context?: ContextMenuActionContext): ColumnContextMenuOpenContext | undefined {
  return context?.menu?.target === 'column' ? context.menu : undefined;
}

function toProjectSortValue(prop: ColumnProp, order: 'asc' | 'desc'): ProjectSortValue {
  const value = `${String(prop)}:${order}` as ProjectSortValue;
  return projectSortOptions.some((option) => option.value === value) ? value : '';
}

function updateProjectRowFromMenu(
  context: ContextMenuActionContext | undefined,
  controller: ProjectContextMenuController,
  focused: { y: number } | null | undefined,
  updater: (row: ProjectRow) => ProjectRow,
) {
  const targets = resolveProjectRowTargetsFromActionContext(context, controller, focused);
  if (!targets.length) return;
  const targetIds = new Set(targets.map((target) => target.row.id));
  setProjectRowsFromContextMenu(controller, controller.getRows().map((row) => targetIds.has(row.id) ? updater(row) : row));
}

function setProjectRowsFromContextMenu(controller: ProjectContextMenuController, rows: ProjectRow[]) {
  controller.setRows(orderProjectRowsForGrouping(rows, controller.getGroupBy?.() ?? ''));
}

function resolveProjectRowTargetsFromActionContext(
  context: ContextMenuActionContext | undefined,
  controller: ProjectContextMenuController,
  focused?: { y: number } | null,
) {
  const clicked = resolveProjectRowFromActionContext(context, controller, focused);
  if (!clicked) return [];

  const selectedIndexes = controller.getSelectedIndexes?.() ?? new Set<number>();
  if (!selectedIndexes.has(clicked.index)) {
    return [clicked];
  }

  const rows = controller.getRows();
  return [...selectedIndexes]
    .sort((a, b) => a - b)
    .map((index) => rows[index] ? { row: rows[index], index } : null)
    .filter((target): target is { row: ProjectRow; index: number } => !!target);
}

function resolveProjectRowFromActionContext(
  context: ContextMenuActionContext | undefined,
  controller: ProjectContextMenuController,
  focused?: { y: number } | null,
) {
  const menu = context?.menu;
  if (menu?.target === 'row') {
    return resolveProjectRowFromOpenContext(menu, controller);
  }
  return resolveProjectRowFromVirtualIndex(focused?.y, controller);
}

function resolveProjectRowFromOpenContext(
  context: RowContextMenuOpenContext,
  controller: ProjectContextMenuController,
) {
  const target = context.triggerElement.closest?.('.rgCell, .rgRow') ?? context.triggerElement;
  const rawIndex = target.getAttribute?.('data-rgrow') ?? target.getAttribute?.('data-rgRow');
  const virtualIndex = rawIndex === undefined || rawIndex === null ? undefined : Number(rawIndex);
  return resolveProjectRowFromVirtualIndex(virtualIndex, controller, context.providers.data.stores.rgRow.store);
}

function resolveProjectRowFromVirtualIndex(
  virtualIndex: number | undefined,
  controller: ProjectContextMenuController,
  dataStore?: any,
) {
  if (virtualIndex === undefined || Number.isNaN(virtualIndex)) return null;
  const grid = controller.getGrid();
  const physicalIndex = dataStore ? getSourcePhysicalIndex(dataStore, virtualIndex) : virtualIndex;
  const source = dataStore?.get?.('source') ?? grid?.source ?? controller.getRows();
  const sourceRow = source?.[physicalIndex];
  if (!sourceRow || isGrouping(sourceRow)) return null;
  const index = controller.getRows().findIndex((row) => row.id === sourceRow.id);
  if (index < 0) return null;
  return { row: controller.getRows()[index], index };
}

function duplicateProjectRow(row: ProjectRow): ProjectRow {
  const id = `${row.id}-copy-${Date.now().toString(36)}`;
  return {
    ...row,
    id,
    task: `${row.task} copy`,
  };
}

function markProjectReady(row: ProjectRow): ProjectRow {
  const progress = Math.max(row.progress, 85);
  return {
    ...row,
    status: 'Ready',
    section: 'Launch ready',
    progress,
    timeline: withTimelineProgress(row.timeline, progress),
  };
}

function blockProject(row: ProjectRow): ProjectRow {
  const progress = Math.min(row.progress, 10);
  return {
    ...row,
    status: 'Blocked',
    section: 'Blocked',
    risk: 'High',
    progress,
    timeline: withTimelineProgress(row.timeline, progress),
  };
}

function moveProjectToLaunch(row: ProjectRow): ProjectRow {
  return {
    ...row,
    section: 'Launch ready',
    status: row.status === 'Blocked' ? 'In Review' : row.status,
  };
}
