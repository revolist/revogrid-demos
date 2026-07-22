/** Column and column-group context-menu composition and actions. */
import {
  FilterPlugin,
  type ColumnGrouping,
  type ColumnProp,
  type ColumnRegular,
  type FilterCollectionItem,
  type MultiFilterItem,
} from '@revolist/revogrid';
import {
  type ColumnContextMenuOpenContext,
  type ContextMenuActionContext,
  type ContextMenuColumnGroup,
  type ContextMenuItem,
} from '@revolist/revogrid-pro';
import { getSpreadsheetLeafColumns } from './columns';
import {
  arrowDownZAIcon,
  arrowUpAZIcon,
  broomIcon,
  eraserIcon,
  eyeSlashIcon,
  filterIcon,
  thumbtackIcon,
} from './interaction-icons';
import { applySpreadsheetColumns } from './interaction-workbook';
import { type SpreadsheetContextMenuController } from './models';
import { updateSpreadsheetColumnsByProps } from './presentation';

type SpreadsheetGridWithHiddenColumns = HTMLRevoGridElement & {
  hideColumns?: ColumnProp[];
};

export function createSpreadsheetColumnContextItems(
  menu: ColumnContextMenuOpenContext,
  controller: SpreadsheetContextMenuController,
): ContextMenuItem[] {
  const column = menu.column;
  if (!column) {
    return [];
  }

  const columnName = getColumnLabel(column);
  const isPinned = Boolean(column.pin) || menu.columnType === 'colPinStart' || menu.columnType === 'colPinEnd';

  return [
    createSpreadsheetColumnTitleItem('Column', columnName),
    {
      name: 'Sort A to Z',
      icon: arrowUpAZIcon,
      class: 'spreadsheet-context-section-start',
      action: (_, __, ___, ____, context) => sortSpreadsheetColumn(context, column, 'asc'),
    },
    {
      name: 'Sort Z to A',
      icon: arrowDownZAIcon,
      action: (_, __, ___, ____, context) => sortSpreadsheetColumn(context, column, 'desc'),
    },
    {
      name: 'Clear sort',
      icon: eraserIcon,
      action: (_, __, ___, ____, context) => {
        void context?.revogrid.clearSorting();
      },
    },
    {
      name: 'Filter by this column',
      icon: filterIcon,
      class: 'spreadsheet-context-section-start',
      action: (_, __, ___, ____, context) => openSpreadsheetColumnFilter(context),
    },
    {
      name: 'Clear filters',
      icon: broomIcon,
      action: (_, __, ___, ____, context) => clearSpreadsheetFilters(context),
    },
    {
      name: 'Hide column',
      icon: eyeSlashIcon,
      class: 'spreadsheet-context-section-start',
      action: (_, __, ___, ____, context) => hideSpreadsheetColumns(context, [getActionColumn(context, column).prop]),
    },
    {
      name: isPinned ? 'Unpin column' : 'Pin column left',
      icon: thumbtackIcon,
      class: 'spreadsheet-context-section-start',
      action: (_, __, ___, ____, context) =>
        pinSpreadsheetColumns(controller, context, [getActionColumn(context, column).prop], isPinned ? undefined : 'colPinStart'),
    },
    !isPinned ? {
      name: 'Pin column right',
      icon: thumbtackIcon,
      action: (_, __, ___, ____, context) =>
        pinSpreadsheetColumns(controller, context, [getActionColumn(context, column).prop], 'colPinEnd'),
    } : undefined,
  ].filter(Boolean) as ContextMenuItem[];
}

export function createSpreadsheetColumnGroupContextItems(
  menu: ColumnContextMenuOpenContext,
  controller: SpreadsheetContextMenuController,
): ContextMenuItem[] {
  const group = menu.columnGroup;
  if (!group) {
    return [];
  }

  const columns = getSpreadsheetGroupLeafColumns(group);
  const props = columns.map(column => column.prop);
  const groupName = typeof group.name === 'string' && group.name.trim() ? group.name : 'Column group';
  const isPinned = columns.some(column => Boolean(column.pin))
    || menu.columnType === 'colPinStart'
    || menu.columnType === 'colPinEnd';

  return [
    createSpreadsheetColumnTitleItem('Column group', groupName),
    {
      name: 'Clear group filters',
      icon: broomIcon,
      class: 'spreadsheet-context-section-start',
      action: (_, __, ___, ____, context) => clearSpreadsheetFilters(context, props),
    },
    {
      name: 'Hide group columns',
      icon: eyeSlashIcon,
      action: (_, __, ___, ____, context) => hideSpreadsheetColumns(context, props),
    },
    {
      name: isPinned ? 'Unpin group' : 'Pin group left',
      icon: thumbtackIcon,
      class: 'spreadsheet-context-section-start',
      action: (_, __, ___, ____, context) =>
        pinSpreadsheetColumns(controller, context, props, isPinned ? undefined : 'colPinStart'),
    },
    !isPinned ? {
      name: 'Pin group right',
      icon: thumbtackIcon,
      action: (_, __, ___, ____, context) =>
        pinSpreadsheetColumns(controller, context, props, 'colPinEnd'),
    } : undefined,
  ].filter(Boolean) as ContextMenuItem[];
}



function createSpreadsheetColumnTitleItem(eyebrow: string, name: string): ContextMenuItem {
  return {
    name,
    class: 'spreadsheet-context-column-title',
    keepOpen: true,
    template: (h) => h('span', { class: 'spreadsheet-context-column-title__inner' }, [
      h('span', { class: 'spreadsheet-context-column-title__eyebrow' }, eyebrow),
      h('span', { class: 'spreadsheet-context-column-title__name' }, name),
    ]),
  };
}

function sortSpreadsheetColumn(
  context: ContextMenuActionContext | undefined,
  fallback: ColumnRegular,
  order: 'asc' | 'desc',
) {
  const column = getActionColumn(context, fallback);
  void context?.revogrid.updateColumnSorting(
    {
      prop: column.prop,
      cellCompare: column.cellCompare,
    },
    order,
    false,
  );
}

function openSpreadsheetColumnFilter(context: ContextMenuActionContext | undefined) {
  const menu = context?.menu?.target === 'column' ? context.menu : undefined;
  const target = menu?.triggerElement.closest?.('.rgHeaderCell') ?? menu?.triggerElement;
  const filterControl = target?.querySelector?.([
    '.filter-img',
    '.filter-button',
    '.rv-filter',
    '[part="filter"]',
    '[aria-label^="Filter"]',
  ].join(', ')) as HTMLElement | null | undefined;
  filterControl?.focus?.();
  filterControl?.click?.();
}

function clearSpreadsheetFilters(context: ContextMenuActionContext | undefined, props?: ColumnProp[]) {
  const grid = context?.revogrid;
  if (!grid) {
    return;
  }

  const nextFilterItems = props?.length
    ? omitSpreadsheetRecordProps(getCurrentSpreadsheetFilterItems(context), props)
    : {} as MultiFilterItem;
  const filterPlugin = context?.providers.plugins.getByClass(FilterPlugin);
  void filterPlugin?.onFilterChange?.(nextFilterItems);
  grid.dispatchEvent(new CustomEvent('filter', {
    detail: nextFilterItems,
    bubbles: true,
    composed: true,
  }));
  if (grid.filter && typeof grid.filter === 'object') {
    const collection = props?.length
      ? omitSpreadsheetRecordProps<FilterCollectionItem>(
        (grid.filter as { collection?: Record<string, FilterCollectionItem> }).collection ?? {},
        props,
      )
      : {};
    grid.filter = {
      ...grid.filter,
      multiFilterItems: nextFilterItems,
      collection: collection as Record<ColumnProp, FilterCollectionItem>,
    };
  }
}

function getCurrentSpreadsheetFilterItems(context: ContextMenuActionContext | undefined): MultiFilterItem {
  const filterPlugin = context?.providers.plugins.getByClass(FilterPlugin) as { multiFilterItems?: MultiFilterItem } | undefined;
  const gridFilter = context?.revogrid.filter as { multiFilterItems?: MultiFilterItem } | undefined;
  return { ...(filterPlugin?.multiFilterItems ?? gridFilter?.multiFilterItems ?? {}) };
}

function omitSpreadsheetRecordProps<T>(items: Record<string, T>, props: ColumnProp[]) {
  const next = { ...items };
  props.forEach(prop => {
    delete next[String(prop)];
  });
  return next;
}

function hideSpreadsheetColumns(
  context: ContextMenuActionContext | undefined,
  props: ColumnProp[],
) {
  const grid = context?.revogrid as SpreadsheetGridWithHiddenColumns | undefined;
  if (!grid) {
    return;
  }
  grid.hideColumns = Array.from(new Set([...(grid.hideColumns ?? []), ...props]));
}

function pinSpreadsheetColumns(
  controller: SpreadsheetContextMenuController,
  context: ContextMenuActionContext | undefined,
  props: ColumnProp[],
  pin: ColumnRegular['pin'] | undefined,
) {
  const grid = context?.revogrid ?? controller.getGrid?.();
  const currentColumns = controller.getWorkbook?.()?.columns ?? grid?.columns ?? [];
  const nextColumns = updateSpreadsheetColumnsByProps(currentColumns, new Set(props), (column) => {
    if (!pin) {
      const { pin: _pin, ...rest } = column;
      return rest;
    }
    return { ...column, pin };
  });
  applySpreadsheetColumns(controller, nextColumns);
}

function getActionColumn(context: ContextMenuActionContext | undefined, fallback: ColumnRegular) {
  return context?.menu?.target === 'column' && context.menu.column ? context.menu.column : fallback;
}

function getColumnLabel(column: ColumnRegular) {
  return typeof column.name === 'string' && column.name.trim() ? column.name : String(column.prop);
}

function getSpreadsheetGroupLeafColumns(group: ContextMenuColumnGroup): ColumnRegular[] {
  const leaves: ColumnRegular[] = [];
  group.children.forEach((child) => {
    if (isSpreadsheetColumnGroup(child)) {
      leaves.push(...getSpreadsheetLeafColumns(child.children));
      return;
    }
    leaves.push(child as ColumnRegular);
  });
  return leaves;
}


function isSpreadsheetColumnGroup(column: ColumnGrouping | ColumnRegular): column is ColumnGrouping {
  return Array.isArray((column as ColumnGrouping).children);
}
