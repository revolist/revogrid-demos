/** Grid interaction guards, menus, clipboard actions, and mutation orchestration. */
import {
  FilterPlugin,
  getSourcePhysicalIndex,
  isGrouping,
  type BeforeSaveDataDetails,
  type Cell,
  type ColumnData,
  type ColumnGrouping,
  type ColumnProp,
  type ColumnRegular,
  type DataType,
  type DimensionCols,
  type DimensionRows,
  type FilterCollectionItem,
  type MultiFilterItem,
  type RangeArea,
} from '@revolist/revogrid';
import {
  type ColumnContextMenuOpenContext,
  type ContextMenuActionContext,
  type ContextMenuColumnGroup,
  type ContextMenuConfig,
  type ContextMenuItem,
  type FormulaNameDefinition,
  type FormulaNamesConfig,
  type HistoryConfig,
  type MergeData,
  type MultiRangeSelectionRange,
  type RowContextMenuOpenContext,
} from '@revolist/revogrid-pro';
import arrowDownIcon from '@fortawesome/fontawesome-free/svgs/solid/arrow-down.svg?raw';
import arrowDownZAIcon from '@fortawesome/fontawesome-free/svgs/solid/arrow-down-z-a.svg?raw';
import arrowRotateLeftIcon from '@fortawesome/fontawesome-free/svgs/solid/arrow-rotate-left.svg?raw';
import arrowRotateRightIcon from '@fortawesome/fontawesome-free/svgs/solid/arrow-rotate-right.svg?raw';
import arrowUpIcon from '@fortawesome/fontawesome-free/svgs/solid/arrow-up.svg?raw';
import arrowUpAZIcon from '@fortawesome/fontawesome-free/svgs/solid/arrow-up-a-z.svg?raw';
import arrowsRotateIcon from '@fortawesome/fontawesome-free/svgs/solid/arrows-rotate.svg?raw';
import boltIcon from '@fortawesome/fontawesome-free/svgs/solid/bolt.svg?raw';
import borderAllIcon from '@fortawesome/fontawesome-free/svgs/solid/border-all.svg?raw';
import broomIcon from '@fortawesome/fontawesome-free/svgs/solid/broom.svg?raw';
import bullseyeIcon from '@fortawesome/fontawesome-free/svgs/solid/bullseye.svg?raw';
import codeIcon from '@fortawesome/fontawesome-free/svgs/solid/code.svg?raw';
import copyIcon from '@fortawesome/fontawesome-free/svgs/solid/copy.svg?raw';
import eraserIcon from '@fortawesome/fontawesome-free/svgs/solid/eraser.svg?raw';
import eyeSlashIcon from '@fortawesome/fontawesome-free/svgs/solid/eye-slash.svg?raw';
import filterIcon from '@fortawesome/fontawesome-free/svgs/solid/filter.svg?raw';
import fileCirclePlusIcon from '@fortawesome/fontawesome-free/svgs/solid/file-circle-plus.svg?raw';
import fileExportIcon from '@fortawesome/fontawesome-free/svgs/solid/file-export.svg?raw';
import magnifyingGlassIcon from '@fortawesome/fontawesome-free/svgs/solid/magnifying-glass.svg?raw';
import pasteIcon from '@fortawesome/fontawesome-free/svgs/solid/paste.svg?raw';
import scissorsIcon from '@fortawesome/fontawesome-free/svgs/solid/scissors.svg?raw';
import tableColumnsIcon from '@fortawesome/fontawesome-free/svgs/solid/table-columns.svg?raw';
import thumbtackIcon from '@fortawesome/fontawesome-free/svgs/solid/thumbtack.svg?raw';
import trashIcon from '@fortawesome/fontawesome-free/svgs/solid/trash.svg?raw';
import wandMagicSparklesIcon from '@fortawesome/fontawesome-free/svgs/solid/wand-magic-sparkles.svg?raw';
import xmarkIcon from '@fortawesome/fontawesome-free/svgs/solid/xmark.svg?raw';
import { getSpreadsheetLeafColumns } from './columns';
import { SPREADSHEET_DEMO_ID } from './config';
import {
  createEmptySpreadsheetFormulaNames,
  createSpreadsheetFormulaNames,
  createSpreadsheetPinnedBottomSource,
} from './data';
import { createSpreadsheetColumns } from './workbook';
import { updateSpreadsheetColumnsByProps } from './presentation';
import { summarizeClipboardMatrix } from './status';
import {
  type SpreadsheetContextMenuController,
  type SpreadsheetFlashPlugin,
  type SpreadsheetWorkbook,
} from './models';

export const SPREADSHEET_ACTION_ICONS = {
  reset: arrowsRotateIcon,
  newWorkbook: fileCirclePlusIcon,
  export: fileExportIcon,
  undo: arrowRotateLeftIcon,
  redo: arrowRotateRightIcon,
  smartFill: wandMagicSparklesIcon,
  copyPreview: copyIcon,
  freeze: tableColumnsIcon,
  flash: boltIcon,
  find: magnifyingGlassIcon,
  clear: xmarkIcon,
} as const;

let spreadsheetClipboardText = '';

type SpreadsheetGridWithDemoProps = HTMLRevoGridElement & {
  hideColumns?: ColumnProp[];
  cellMerge?: MergeData[];
  formulaNames?: FormulaNamesConfig;
};

type SpreadsheetMultiRangeSelectionPlugin = {
  getSelectedRanges(): MultiRangeSelectionRange[];
  setSelectedRanges(
    ranges: MultiRangeSelectionRange[],
    activeIndex?: number,
  ): void;
};

const spreadsheetMultiRangeSelections = new WeakMap<
  HTMLRevoGridElement,
  MultiRangeSelectionRange[]
>();

type SpreadsheetActionCell = Pick<Cell, 'x' | 'y'> & {
  rowType?: DimensionRows;
  colType?: DimensionCols;
};

type SpreadsheetActionRange = RangeArea & {
  rowType?: DimensionRows;
  colType?: DimensionCols;
};

type SpreadsheetContextMenuItem = ContextMenuItem & {
  shortcut?: string;
  badge?: string;
};

type SpreadsheetEditEvent = Event & {
  detail?: BeforeSaveDataDetails;
};

/**
 * Preserves multi-range selection while a context menu receives focus.
 * Returns a cleanup callback for every DOM and grid listener installed here.
 */
export function installSpreadsheetContextSelectionGuard(
  root: HTMLElement,
  getGrid: () => HTMLRevoGridElement | null | undefined,
) {
  const selectionGrid = getGrid() ?? root.querySelector<HTMLRevoGridElement>('revo-grid');
  let snapshot: {
    ranges: MultiRangeSelectionRange[];
    activeIndex: number;
    expiresAt: number;
  } | null = null;

  const syncSelectionCache = (event: Event) => {
    const grid = (event.currentTarget as HTMLRevoGridElement | null) ?? getGrid();
    const ranges = (event as CustomEvent<{ ranges?: MultiRangeSelectionRange[] }>).detail?.ranges;
    if (!grid || !ranges) {
      return;
    }
    spreadsheetMultiRangeSelections.set(
      grid,
      ranges.map(cloneSpreadsheetSelectionRange),
    );
  };

  const rememberSelection = (event: MouseEvent) => {
    if (event.button !== 2) {
      snapshot = null;
      return;
    }

    const trigger = event.target instanceof HTMLElement
      ? event.target.closest('.rgCell') as HTMLElement | null
      : null;
    if (!trigger || !root.contains(trigger)) {
      snapshot = null;
      return;
    }

    const grid = getGrid();
    const ranges = getCachedSpreadsheetSelectionRanges(grid);
    const cell = getSpreadsheetCellFromElement(trigger);
    const activeIndex = cell ? findSpreadsheetRangeIndexForCell(ranges, cell) : -1;
    const activeRange = activeIndex >= 0 ? ranges[activeIndex] : undefined;

    if (!activeRange || (ranges.length === 1 && isSingleSpreadsheetRange(activeRange.range))) {
      snapshot = null;
      return;
    }

    snapshot = {
      ranges: ranges.map(cloneSpreadsheetSelectionRange),
      activeIndex,
      expiresAt: Date.now() + 1200,
    };
  };

  const restoreSelection = async () => {
    const current = snapshot;
    if (!current || Date.now() > current.expiresAt) {
      snapshot = null;
      return;
    }

    const grid = getGrid();
    const plugin = await getSpreadsheetMultiRangeSelectionPlugin(grid);
    plugin?.setSelectedRanges(
      current.ranges.map(cloneSpreadsheetSelectionRange),
      current.activeIndex,
    );
  };

  const restoreSelectionForContextMenu = () => {
    void restoreSelection();
    window.setTimeout(() => void restoreSelection(), 0);
  };

  selectionGrid?.addEventListener('multirangeselectionchange', syncSelectionCache);
  root.addEventListener('mousedown', rememberSelection, true);
  root.addEventListener('contextmenu', restoreSelectionForContextMenu, true);

  return () => {
    selectionGrid?.removeEventListener('multirangeselectionchange', syncSelectionCache);
    root.removeEventListener('mousedown', rememberSelection, true);
    root.removeEventListener('contextmenu', restoreSelectionForContextMenu, true);
  };
}

async function getSpreadsheetMultiRangeSelectionPlugin(
  grid?: HTMLRevoGridElement | null,
): Promise<SpreadsheetMultiRangeSelectionPlugin | undefined> {
  const plugins = await grid?.getPlugins?.();
  const plugin = plugins?.find(isSpreadsheetMultiRangeSelectionPlugin);
  return isSpreadsheetMultiRangeSelectionPlugin(plugin) ? plugin : undefined;
}

function isSpreadsheetMultiRangeSelectionPlugin(
  plugin: unknown,
): plugin is SpreadsheetMultiRangeSelectionPlugin {
  return (
    typeof plugin === 'object' &&
    plugin !== null &&
    typeof (plugin as SpreadsheetMultiRangeSelectionPlugin).getSelectedRanges === 'function' &&
    typeof (plugin as SpreadsheetMultiRangeSelectionPlugin).setSelectedRanges === 'function'
  );
}

function getCachedSpreadsheetSelectionRanges(
  grid?: HTMLRevoGridElement | null,
) {
  return grid
    ? spreadsheetMultiRangeSelections.get(grid)?.map(cloneSpreadsheetSelectionRange) ?? []
    : [];
}

export function preventReadonlySpreadsheetEdit(
  event: Event,
  columns: ColumnData,
  onPrevent?: (message: string) => void,
) {
  const detail = (event as SpreadsheetEditEvent).detail;
  const column = resolveSpreadsheetEditColumn(detail, columns);
  if (!column || !isReadonlySpreadsheetColumn(column, detail)) {
    return false;
  }

  event.preventDefault();
  event.stopImmediatePropagation();
  onPrevent?.(`${getColumnLabel(column)} is read-only. Edit the input cells that feed this value.`);
  return true;
}

/** Installs readonly/edit guards and returns a disposer for their listeners. */
export function installSpreadsheetReadonlyEditGuard(
  grid: HTMLRevoGridElement,
  getColumns: () => ColumnData,
  onPrevent?: (message: string) => void,
) {
  const onReadonlyEdit = (event: Event) => {
    preventReadonlySpreadsheetEdit(event, getColumns(), onPrevent);
  };

  grid.addEventListener('beforeeditstart', onReadonlyEdit, true);
  grid.addEventListener('beforeedit', onReadonlyEdit, true);

  return () => {
    grid.removeEventListener('beforeeditstart', onReadonlyEdit, true);
    grid.removeEventListener('beforeedit', onReadonlyEdit, true);
  };
}

export function insertSpreadsheetRowFromPinnedDropdown(
  event: Event,
  controller: SpreadsheetContextMenuController,
) {
  const detail = (event as SpreadsheetEditEvent).detail;
  if (!isPinnedDepartmentDropdownEdit(detail)) {
    return false;
  }

  const department = String(detail.val ?? '').trim();
  if (!department) {
    return false;
  }

  const grid = controller.getGrid?.();
  const current = controller.getWorkbook?.();
  const columns = current?.columns ?? grid?.columns ?? [];
  const rows = [...(grid?.source ?? current?.rows ?? [])].map(row => ({ ...row }));
  const insertAt = rows.length;
  const nextRow = createBlankSpreadsheetContextRow(
    columns,
    rows,
    insertAt,
    current?.imported ?? false,
  );

  nextRow.department = department;
  rows.push(nextRow);
  event.preventDefault();
  applySpreadsheetRows(controller, rows);
  controller.setClipboardStatus?.(`Added ${department} row. Edit owner and inputs to complete the forecast.`);
  return true;
}

/** Creates framework-neutral row and column context-menu configurations. */
export function createSpreadsheetContextMenus(
  controller: SpreadsheetContextMenuController,
): {
  rowContextMenu: ContextMenuConfig;
  columnContextMenu: ContextMenuConfig;
} {
  const rowContextMenu: ContextMenuConfig = {
    resolve: (context) => {
      if (context.target !== 'row' || resolveRowIndexFromOpenContext(context) === undefined) {
        return null;
      }
      return {
        items: closeContextMenuItemsOnAction(createSpreadsheetRowContextItems(context, controller)),
      };
    },
    items: [],
  };

  const columnContextMenu: ContextMenuConfig = {
    anchorToTarget: true,
    resolve: (context) => {
      if (context.target !== 'column') {
        return null;
      }

      if (context.columnGroup) {
        return {
          items: closeContextMenuItemsOnAction(createSpreadsheetColumnGroupContextItems(context, controller)),
        };
      }

      if (!context.column) {
        return null;
      }

      return {
        items: closeContextMenuItemsOnAction(createSpreadsheetColumnContextItems(context, controller)),
      };
    },
    items: [],
  };

  return { rowContextMenu, columnContextMenu };
}

function createSpreadsheetRowContextItems(
  menu: RowContextMenuOpenContext,
  controller: SpreadsheetContextMenuController,
): ContextMenuItem[] {
  return [
    createSpreadsheetCellTitleItem(controller, menu),
    createSpreadsheetMenuItem({
      name: 'Cut',
      icon: scissorsIcon,
      shortcut: '⌘X',
      action: (_, focused, range, ___, context) => cutSelectedCells(controller, context, focused, range),
    }),
    createSpreadsheetMenuItem({
      name: 'Copy',
      icon: copyIcon,
      shortcut: '⌘C',
      action: (_, focused, range, ___, context) => copySelectedCells(controller, context, focused, range),
    }),
    createSpreadsheetMenuItem({
      name: 'Copy as JSON',
      icon: codeIcon,
      badge: 'Pro',
      action: (_, focused, range, ___, context) => copySelectedCellsAsJson(controller, context, focused, range),
    }),
    createSpreadsheetMenuItem({
      name: 'Paste values',
      icon: pasteIcon,
      shortcut: '⌘V',
      action: (_, focused, __, ___, context) => {
        void pasteSelectedCells(controller, context, focused);
      },
    }),
    createSpreadsheetMenuItem({
      name: 'Insert row above',
      icon: arrowUpIcon,
      class: 'spreadsheet-context-section-start',
      action: (_, focused, __, ___, context) => insertSpreadsheetRow(controller, context, focused, 'above'),
    }),
    createSpreadsheetMenuItem({
      name: 'Insert row below',
      icon: arrowDownIcon,
      action: (_, focused, __, ___, context) => insertSpreadsheetRow(controller, context, focused, 'below'),
    }),
    createSpreadsheetMenuItem({
      name: (focused, range) => {
        const selection = normalizeSpreadsheetRange(focused, range);
        const rows = selection ? selection.y1 - selection.y + 1 : 1;
        return rows > 1 ? `Delete ${rows} rows` : 'Delete row';
      },
      icon: trashIcon,
      class: 'spreadsheet-context-danger',
      action: (_, focused, range, ___, context) => deleteSpreadsheetRows(controller, context, focused, range),
    }),
    createSpreadsheetMenuItem({
      name: 'Clear contents',
      icon: broomIcon,
      class: 'spreadsheet-context-section-start',
      action: (_, focused, range, ___, context) => clearSelectedCells(controller, context, focused, range),
    }),
    createSpreadsheetMenuItem({
      name: 'Merge cells',
      icon: borderAllIcon,
      shortcut: '⌘M',
      class: 'spreadsheet-context-section-start',
      hidden: (_, focused, range) => {
        const selection = getSpreadsheetActionSelection(controller, {
          revogrid: menu.revogrid,
          providers: menu.providers,
          menu,
        }, focused, range);
        return !selection || (selection.x === selection.x1 && selection.y === selection.y1);
      },
      action: (_, focused, range, ___, context) => mergeSelectedCells(controller, context, focused, range),
    }),
    createSpreadsheetMenuItem({
      name: 'Unmerge cells',
      icon: eraserIcon,
      hidden: (_, focused) => !isActionCellMerged(controller, {
        revogrid: menu.revogrid,
        providers: menu.providers,
        menu,
      }, focused),
      action: (_, focused, range, ___, context) => unmergeSelectedCells(controller, context, focused, range),
    }),
    createSpreadsheetMenuItem({
      name: 'Create named range',
      icon: bullseyeIcon,
      shortcut: '⌘N',
      class: 'spreadsheet-context-section-start',
      action: (_, focused, range, ___, context) => createNamedRangeFromSelection(controller, context, focused, range),
    }),
    createSpreadsheetMenuItem({
      name: 'Reset workbook',
      icon: tableColumnsIcon,
      class: 'spreadsheet-context-section-start',
      action: () => controller.resetWorkbook?.(),
    }),
  ];
}

function createSpreadsheetColumnContextItems(
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

function createSpreadsheetColumnGroupContextItems(
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

function createSpreadsheetCellTitleItem(
  controller: SpreadsheetContextMenuController,
  menu: RowContextMenuOpenContext,
): ContextMenuItem {
  const name = getSpreadsheetActionTitle(controller, menu);
  return createSpreadsheetColumnTitleItem('Cell', name);
}

function createSpreadsheetMenuItem(item: SpreadsheetContextMenuItem): ContextMenuItem {
  return {
    ...item,
    template: (h, current, focused, range) => {
      const spreadsheetItem = current as SpreadsheetContextMenuItem;
      const label = typeof spreadsheetItem.name === 'function'
        ? spreadsheetItem.name(focused, range)
        : spreadsheetItem.name;

      return h('span', { class: 'spreadsheet-context-item' }, [
        ...(spreadsheetItem.icon
          ? [h('span', { class: { icon: true }, innerHTML: spreadsheetItem.icon })]
          : []),
        h('span', { class: 'spreadsheet-context-item__label' }, label),
        ...(spreadsheetItem.badge
          ? [h('span', { class: 'spreadsheet-context-item__badge' }, spreadsheetItem.badge)]
          : []),
        ...(spreadsheetItem.shortcut
          ? [h('kbd', { class: 'spreadsheet-context-item__shortcut' }, spreadsheetItem.shortcut)]
          : []),
      ]);
    },
  };
}

function closeContextMenuItemsOnAction(items: ContextMenuItem[]): ContextMenuItem[] {
  return items.map((item) => {
    if (!item.action || item.keepOpen) {
      return item;
    }
    return {
      ...item,
      action: (...args: Parameters<NonNullable<ContextMenuItem['action']>>) => {
        const close = args[3];
        close?.();
        const result = item.action?.(...args);
        window.setTimeout(() => close?.(), 0);
        return result;
      },
    };
  });
}

function copySelectedCells(
  controller: SpreadsheetContextMenuController,
  context: ContextMenuActionContext | undefined,
  focused?: Cell | null,
  range?: RangeArea | null,
) {
  const grid = context?.revogrid ?? controller.getGrid?.();
  if (!grid) {
    return;
  }

  const text = serializeSelectedCells(controller, grid, context, focused, range);
  if (!text) {
    return;
  }

  writeSpreadsheetClipboard(text);
  controller.setClipboardStatus?.(`Copied ${summarizeClipboardMatrix(parseSpreadsheetClipboardText(text))}.`);
}

function copySelectedCellsAsJson(
  controller: SpreadsheetContextMenuController,
  context: ContextMenuActionContext | undefined,
  focused?: Cell | null,
  range?: RangeArea | null,
) {
  const grid = context?.revogrid ?? controller.getGrid?.();
  if (!grid) {
    return;
  }

  const matrix = getSelectedCellMatrix(controller, grid, context, focused, range);
  if (!matrix.length) {
    return;
  }

  writeSpreadsheetClipboard(JSON.stringify(matrix, null, 2));
  controller.setClipboardStatus?.(`Copied ${summarizeClipboardMatrix(matrix)} as JSON.`);
}

function cutSelectedCells(
  controller: SpreadsheetContextMenuController,
  context: ContextMenuActionContext | undefined,
  focused?: Cell | null,
  range?: RangeArea | null,
) {
  copySelectedCells(controller, context, focused, range);
  clearSelectedCells(controller, context, focused, range, 'Cut cells to clipboard.');
}

async function pasteSelectedCells(
  controller: SpreadsheetContextMenuController,
  context: ContextMenuActionContext | undefined,
  focused?: Cell | null,
) {
  const grid = context?.revogrid ?? controller.getGrid?.();
  const origin = getActionCell(context, focused);
  if (!grid || !origin) {
    return;
  }

  const text = await readSpreadsheetClipboard();
  const matrix = parseSpreadsheetClipboardText(text);
  if (!matrix.length) {
    return;
  }

  const columns = getSpreadsheetActionColumns(grid, origin.colType);
  const source = [...(grid.source ?? [])].map(row => ({ ...row }));
  matrix.forEach((row, rowOffset) => {
    const targetRow = source[origin.y + rowOffset];
    if (!targetRow) {
      return;
    }

    row.forEach((value, columnOffset) => {
      const column = columns[origin.x + columnOffset];
      if (!column || column.readonly === true) {
        return;
      }
      targetRow[column.prop] = normalizePastedSpreadsheetValue(value, targetRow[column.prop]);
    });
  });

  applySpreadsheetRows(controller, source);
  controller.setClipboardStatus?.(`Pasted ${summarizeClipboardMatrix(matrix)}.`);
}

function clearSelectedCells(
  controller: SpreadsheetContextMenuController,
  context: ContextMenuActionContext | undefined,
  focused?: Cell | null,
  range?: RangeArea | null,
  status = 'Cleared selected cells.',
) {
  const grid = context?.revogrid ?? controller.getGrid?.();
  const selection = getSpreadsheetActionSelection(controller, context, focused, range);
  if (!grid || !selection) {
    return;
  }

  const columns = getSpreadsheetActionColumns(grid, selection.colType);
  const source = [...(grid.source ?? [])].map(row => ({ ...row }));

  for (let y = selection.y; y <= selection.y1; y++) {
    const physicalRow = resolvePhysicalRowIndex(y, context) ?? y;
    const row = source[physicalRow];
    if (!row) {
      continue;
    }

    for (let x = selection.x; x <= selection.x1; x++) {
      const column = columns[x];
      if (!column || column.readonly === true) {
        continue;
      }
      row[column.prop] = '';
    }
  }

  applySpreadsheetRows(controller, source);
  controller.setClipboardStatus?.(status);
}

function insertSpreadsheetRow(
  controller: SpreadsheetContextMenuController,
  context: ContextMenuActionContext | undefined,
  focused: Cell | null | undefined,
  position: 'above' | 'below',
) {
  const grid = context?.revogrid ?? controller.getGrid?.();
  const index = resolveRowIndexFromActionContext(context, focused);
  if (!grid || index === undefined) {
    return;
  }

  const rows = [...(grid.source ?? [])];
  const insertAt = position === 'above' ? index : index + 1;
  rows.splice(insertAt, 0, createBlankSpreadsheetContextRow(grid.columns ?? [], rows, insertAt, controller.getWorkbook?.()?.imported ?? false));
  applySpreadsheetRows(controller, rows);
  controller.setClipboardStatus?.(`Inserted row ${position}.`);
}

function deleteSpreadsheetRows(
  controller: SpreadsheetContextMenuController,
  context: ContextMenuActionContext | undefined,
  focused?: Cell | null,
  range?: RangeArea | null,
) {
  const grid = context?.revogrid ?? controller.getGrid?.();
  const index = resolveRowIndexFromActionContext(context, focused);
  if (!grid || index === undefined) {
    return;
  }

  const selection = getSpreadsheetActionSelection(controller, context, focused, range);
  const count = selection ? Math.max(1, selection.y1 - selection.y + 1) : 1;
  const deleteAt = selection ? resolvePhysicalRowIndex(selection.y, context) ?? index : index;
  const rows = [...(grid.source ?? [])];
  rows.splice(deleteAt, count);
  applySpreadsheetRows(controller, rows);
  controller.setClipboardStatus?.(count > 1 ? `Deleted ${count} rows.` : 'Deleted row.');
}

function mergeSelectedCells(
  controller: SpreadsheetContextMenuController,
  context: ContextMenuActionContext | undefined,
  focused?: Cell | null,
  range?: RangeArea | null,
) {
  const selection = getSpreadsheetActionSelection(controller, context, focused, range);
  if (!selection || (selection.x === selection.x1 && selection.y === selection.y1)) {
    return;
  }

  const merge: MergeData = {
    row: selection.y,
    column: selection.x,
    rowSpan: selection.y1 - selection.y + 1,
    colSpan: selection.x1 - selection.x + 1,
    rowType: selection.rowType ?? 'rgRow',
    colType: selection.colType ?? 'rgCol',
  };

  applySpreadsheetCellMerge(controller, (current) => [
    ...current.filter(item => !spreadsheetMergeOverlaps(item, merge)),
    merge,
  ]);
  controller.setClipboardStatus?.('Merged selected cells.');
}

function unmergeSelectedCells(
  controller: SpreadsheetContextMenuController,
  context: ContextMenuActionContext | undefined,
  focused?: Cell | null,
  range?: RangeArea | null,
) {
  const selection = getSpreadsheetActionSelection(controller, context, focused, range);
  if (!selection) {
    return;
  }

  const target: MergeData = {
    row: selection.y,
    column: selection.x,
    rowSpan: selection.y1 - selection.y + 1,
    colSpan: selection.x1 - selection.x + 1,
    rowType: selection.rowType ?? 'rgRow',
    colType: selection.colType ?? 'rgCol',
  };

  applySpreadsheetCellMerge(controller, current => current.filter(item => !spreadsheetMergeOverlaps(item, target)));
  controller.setClipboardStatus?.('Unmerged cells.');
}

function createNamedRangeFromSelection(
  controller: SpreadsheetContextMenuController,
  context: ContextMenuActionContext | undefined,
  focused?: Cell | null,
  range?: RangeArea | null,
) {
  const grid = context?.revogrid ?? controller.getGrid?.();
  const current = controller.getWorkbook?.();
  const selection = getSpreadsheetActionSelection(controller, context, focused, range);
  if (!grid || !current || !selection) {
    return;
  }

  const ref = getSpreadsheetSelectionA1Ref(grid, selection, context);
  if (!ref) {
    return;
  }

  const existingNames = current.formulaNames.names ?? [];
  const name = createNextSpreadsheetName(existingNames);
  const formulaNames: FormulaNamesConfig = {
    ...current.formulaNames,
    names: [
      ...existingNames,
      {
        name,
        scope: 'workbook',
        kind: 'range',
        ref,
        comment: 'Created from SpreadsheetWorkbench context menu',
      },
    ],
  };

  applySpreadsheetWorkbookToController(controller, {
    ...current,
    formulaNames,
    columns: current.imported
      ? current.columns
      : createSpreadsheetColumns(current.rows, formulaNames),
  });
  controller.setClipboardStatus?.(`Created named range ${name} (${ref}).`);
}

function serializeSelectedCells(
  controller: SpreadsheetContextMenuController,
  grid: HTMLRevoGridElement,
  context: ContextMenuActionContext | undefined,
  focused?: Cell | null,
  range?: RangeArea | null,
) {
  return getSelectedCellMatrix(controller, grid, context, focused, range)
    .map(row => row.join('\t'))
    .join('\n');
}

function getSelectedCellMatrix(
  controller: SpreadsheetContextMenuController,
  grid: HTMLRevoGridElement,
  context: ContextMenuActionContext | undefined,
  focused?: Cell | null,
  range?: RangeArea | null,
) {
  const selection = getSpreadsheetActionSelection(controller, context, focused, range);
  if (!selection) {
    return [];
  }

  const columns = getSpreadsheetActionColumns(grid, selection.colType);
  const rows = grid.source ?? [];
  const matrix: string[][] = [];

  for (let y = selection.y; y <= selection.y1; y++) {
    const physicalRow = resolvePhysicalRowIndex(y, context) ?? y;
    const row = rows[physicalRow];
    if (!row) {
      continue;
    }

    const values: string[] = [];
    for (let x = selection.x; x <= selection.x1; x++) {
      const column = columns[x];
      values.push(column ? String(row[column.prop] ?? '') : '');
    }
    matrix.push(values);
  }

  return matrix;
}

function parseSpreadsheetClipboardText(text: string): string[][] {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((row, index, rows) => row.length > 0 || index < rows.length - 1)
    .map(row => row.split('\t'));
}

function writeSpreadsheetClipboard(text: string) {
  spreadsheetClipboardText = text;
  if (navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(text).catch(() => undefined);
  }
}

async function readSpreadsheetClipboard() {
  if (navigator.clipboard?.readText) {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        spreadsheetClipboardText = text;
        return text;
      }
    } catch {
      // Fall back to the demo-local clipboard buffer below.
    }
  }
  return spreadsheetClipboardText;
}

function normalizePastedSpreadsheetValue(value: string, currentValue: unknown) {
  if (typeof currentValue === 'number' && value.trim() !== '') {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }
  return value;
}

function applySpreadsheetRows(controller: SpreadsheetContextMenuController, rows: DataType[]) {
  const current = controller.getWorkbook?.();
  if (!current) {
    const grid = controller.getGrid?.();
    if (grid) {
      grid.source = rows;
    }
    return;
  }

  const formulaNames = current.imported
    ? createEmptySpreadsheetFormulaNames()
    : createSpreadsheetFormulaNames(rows);
  const columns = current.imported
    ? current.columns
    : createSpreadsheetColumns(rows, formulaNames);
  const pinnedBottomSource = current.imported
    ? []
    : createSpreadsheetPinnedBottomSource(rows);
  const cellMerge = trimSpreadsheetCellMerge(
    current.cellMerge,
    rows.length,
    getSpreadsheetLeafColumns(columns).length,
  );

  applySpreadsheetWorkbookToController(controller, {
    ...current,
    rows,
    formulaNames,
    columns,
    pinnedBottomSource,
    cellMerge,
  });
}

function applySpreadsheetCellMerge(
  controller: SpreadsheetContextMenuController,
  updater: (current: MergeData[]) => MergeData[],
) {
  const current = controller.getWorkbook?.();
  const grid = controller.getGrid?.() as SpreadsheetGridWithDemoProps | null | undefined;
  const nextMerge = updater([...(current?.cellMerge ?? grid?.cellMerge ?? [])]);

  if (current) {
    applySpreadsheetWorkbookToController(controller, {
      ...current,
      cellMerge: nextMerge,
    });
    return;
  }

  if (grid) {
    grid.cellMerge = nextMerge;
  }
}

function applySpreadsheetColumns(
  controller: SpreadsheetContextMenuController,
  columns: ColumnData,
) {
  const current = controller.getWorkbook?.();
  const grid = controller.getGrid?.();
  if (current) {
    applySpreadsheetWorkbookToController(controller, {
      ...current,
      columns,
    });
    return;
  }
  if (grid) {
    grid.columns = columns;
  }
}

function applySpreadsheetWorkbookToController(
  controller: SpreadsheetContextMenuController,
  workbook: SpreadsheetWorkbook,
) {
  controller.setWorkbook?.(workbook);
  const grid = controller.getGrid?.() as SpreadsheetGridWithDemoProps | null | undefined;
  if (!grid) {
    return;
  }

  grid.formulaNames = workbook.formulaNames;
  grid.source = workbook.rows;
  grid.pinnedBottomSource = workbook.pinnedBottomSource;
  grid.columns = workbook.columns;
  grid.cellMerge = workbook.cellMerge;
}

function createBlankSpreadsheetContextRow(
  columns: ColumnData,
  rows: DataType[],
  insertAt: number,
  imported: boolean,
): DataType {
  const props = getSpreadsheetLeafColumns(columns).map(column => column.prop);
  if (!imported && hasBudgetWorkbookProps(props)) {
    const n = insertAt + 1;
    return {
      id: createNextSpreadsheetRowId(rows),
      department: 'New department',
      owner: 'Unassigned',
      jan: 0,
      feb: 0,
      mar: 0,
      total: `=SUM(C${n}:E${n})`,
      target: 0,
      variance: `=F${n}-G${n}`,
      margin: `=IF(G${n}=0,0,F${n}/G${n})`,
      status: 'Forecast',
    };
  }

  return props.reduce<DataType>((row, prop) => {
    row[prop] = String(prop) === 'id' ? createNextSpreadsheetRowId(rows) : '';
    return row;
  }, {});
}

function createNextSpreadsheetRowId(rows: DataType[]) {
  return rows.reduce((max, row) => {
    const value = Number(row?.id);
    return Number.isFinite(value) && value > max ? value : max;
  }, 0) + 1;
}

function hasBudgetWorkbookProps(props: ColumnProp[]) {
  const propSet = new Set(props.map(prop => String(prop)));
  return ['department', 'owner', 'jan', 'feb', 'mar', 'total', 'target', 'variance', 'margin', 'status']
    .every(prop => propSet.has(prop));
}

function trimSpreadsheetCellMerge(merge: MergeData[], rowCount: number, columnCount: number) {
  return merge.filter((item) => {
    if (item.rowType && item.rowType !== 'rgRow') {
      return true;
    }
    if (item.colType && item.colType !== 'rgCol') {
      return true;
    }
    return item.row >= 0
      && item.column >= 0
      && item.row < rowCount
      && item.column < columnCount;
  });
}

function spreadsheetMergeOverlaps(a: MergeData, b: MergeData) {
  const aRowType = a.rowType ?? 'rgRow';
  const bRowType = b.rowType ?? 'rgRow';
  const aColType = a.colType ?? 'rgCol';
  const bColType = b.colType ?? 'rgCol';
  if (aRowType !== bRowType || aColType !== bColType) {
    return false;
  }

  const aY1 = a.row + (a.rowSpan ?? 1) - 1;
  const aX1 = a.column + (a.colSpan ?? 1) - 1;
  const bY1 = b.row + (b.rowSpan ?? 1) - 1;
  const bX1 = b.column + (b.colSpan ?? 1) - 1;
  return a.row <= bY1 && aY1 >= b.row && a.column <= bX1 && aX1 >= b.column;
}

function spreadsheetMergeContainsCell(merge: MergeData, cell: SpreadsheetActionCell) {
  const rowType = merge.rowType ?? 'rgRow';
  const colType = merge.colType ?? 'rgCol';
  if ((cell.rowType ?? 'rgRow') !== rowType || (cell.colType ?? 'rgCol') !== colType) {
    return false;
  }

  const y1 = merge.row + (merge.rowSpan ?? 1) - 1;
  const x1 = merge.column + (merge.colSpan ?? 1) - 1;
  return cell.y >= merge.row
    && cell.y <= y1
    && cell.x >= merge.column
    && cell.x <= x1;
}

function isActionCellMerged(
  controller: SpreadsheetContextMenuController,
  context: ContextMenuActionContext | undefined,
  focused?: Cell | null,
) {
  const cell = getActionCell(context, focused);
  if (!cell) {
    return false;
  }

  const grid = (context?.revogrid ?? controller.getGrid?.()) as SpreadsheetGridWithDemoProps | null | undefined;
  const merges = controller.getWorkbook?.()?.cellMerge ?? grid?.cellMerge ?? [];
  return merges.some(merge => spreadsheetMergeContainsCell(merge, cell));
}

function getSpreadsheetActionTitle(
  controller: SpreadsheetContextMenuController,
  menu: RowContextMenuOpenContext,
) {
  const grid = menu.revogrid ?? controller.getGrid?.();
  const cell = getSpreadsheetCellFromElement(menu.triggerElement.closest?.('.rgCell') as HTMLElement | null | undefined);
  if (!grid || !cell) {
    return 'Selection';
  }

  const columns = getSpreadsheetActionColumns(grid, cell.colType);
  const column = columns[cell.x];
  const source = grid.source ?? [];
  const rowIndex = resolvePhysicalRowIndex(cell.y, menu) ?? cell.y;
  const row = source[rowIndex];
  const columnLabel = column ? getColumnLabel(column) : `Column ${cell.x + 1}`;
  const rowLabel = getSpreadsheetContextRowLabel(row, rowIndex);
  return rowLabel ? `${columnLabel} · ${rowLabel}` : columnLabel;
}

function getSpreadsheetContextRowLabel(row: DataType | undefined, rowIndex: number) {
  const department = typeof row?.department === 'string' ? row.department.trim() : '';
  const owner = typeof row?.owner === 'string' ? row.owner.trim() : '';
  if (department && owner) {
    return `${department} / ${owner}`;
  }
  return owner || department || `Row ${rowIndex + 1}`;
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
  const grid = context?.revogrid as SpreadsheetGridWithDemoProps | undefined;
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

function resolveSpreadsheetEditColumn(
  detail: BeforeSaveDataDetails | undefined,
  columns: ColumnData,
) {
  if (detail?.column) {
    return detail.column;
  }
  if (detail?.prop === undefined) {
    return;
  }
  return getSpreadsheetLeafColumns(columns).find(column => column.prop === detail.prop);
}

function isReadonlySpreadsheetColumn(
  column: ColumnRegular,
  detail: BeforeSaveDataDetails | undefined,
) {
  if ((column as ColumnRegular & { dropdown?: unknown }).dropdown) {
    return false;
  }
  if (column.readonly === true) {
    return true;
  }
  if (typeof column.readonly !== 'function' || !detail) {
    return false;
  }

  try {
    return Boolean(column.readonly(detail));
  } catch {
    return false;
  }
}

function isPinnedDepartmentDropdownEdit(
  detail: BeforeSaveDataDetails | undefined,
) {
  return detail?.type === 'rowPinEnd'
    && String(detail.prop) === 'department'
    && detail.val !== undefined
    && detail.val !== null;
}

function getSpreadsheetActionSelection(
  controller: SpreadsheetContextMenuController,
  context: ContextMenuActionContext | undefined,
  focused?: Cell | null,
  range?: RangeArea | null,
) {
  const grid = context?.revogrid ?? controller.getGrid?.();
  const actionCell = getActionCell(context, focused);
  const selectedRange = getSpreadsheetSelectedActionRange(
    grid,
    actionCell,
  );
  return selectedRange ?? normalizeSpreadsheetRange(actionCell, range);
}

function getSpreadsheetSelectedActionRange(
  grid: HTMLRevoGridElement | null | undefined,
  cell?: SpreadsheetActionCell,
) {
  const ranges = getCachedSpreadsheetSelectionRanges(grid);
  if (!ranges.length) {
    return;
  }

  const activeIndex = cell ? findSpreadsheetRangeIndexForCell(ranges, cell) : -1;
  const activeRange = activeIndex >= 0 ? ranges[activeIndex] : ranges[ranges.length - 1];
  if (!activeRange || (ranges.length === 1 && isSingleSpreadsheetRange(activeRange.range))) {
    return;
  }

  return normalizeSpreadsheetRange(undefined, activeRange.range, activeRange);
}

function normalizeSpreadsheetRange(
  focused?: SpreadsheetActionCell | null,
  range?: RangeArea | null,
  type?: Pick<MultiRangeSelectionRange, 'rowType' | 'colType'>,
): SpreadsheetActionRange | undefined {
  const rowType = type?.rowType ?? focused?.rowType;
  const colType = type?.colType ?? focused?.colType;
  if (range) {
    return {
      x: Math.min(range.x, range.x1),
      y: Math.min(range.y, range.y1),
      x1: Math.max(range.x, range.x1),
      y1: Math.max(range.y, range.y1),
      rowType,
      colType,
    };
  }
  if (!focused) {
    return;
  }
  return {
    x: focused.x,
    y: focused.y,
    x1: focused.x,
    y1: focused.y,
    rowType,
    colType,
  };
}

function getActionCell(
  context: ContextMenuActionContext | undefined,
  focused?: Cell | null,
): SpreadsheetActionCell | undefined {
  const cellElement = context?.menu?.triggerElement.closest?.('.rgCell') as HTMLElement | null | undefined;
  const actionCell = getSpreadsheetCellFromElement(cellElement);
  if (actionCell) {
    return actionCell;
  }
  return focused ? { x: focused.x, y: focused.y } : undefined;
}

function getSpreadsheetCellFromElement(element: HTMLElement | null | undefined): SpreadsheetActionCell | undefined {
  const row = readSpreadsheetDataIndex(element, ['data-rgrow', 'data-rgRow']);
  const column = readSpreadsheetDataIndex(element, ['data-rgcol', 'data-rgCol']);
  if (row !== undefined && column !== undefined) {
    const dataProvider = element?.closest?.('revogr-data') as HTMLElement | null | undefined;
    const rowType = readSpreadsheetRowType(dataProvider?.getAttribute('type'));
    const colType = readSpreadsheetColumnType(dataProvider?.getAttribute('col-type'));
    return { x: column, y: row, rowType, colType };
  }
}

function findSpreadsheetRangeIndexForCell(
  ranges: MultiRangeSelectionRange[],
  cell: SpreadsheetActionCell,
) {
  return ranges.findIndex(item => (
    isDataSelectionRange(item)
    && spreadsheetRangeMatchesCellProvider(item, cell)
    && spreadsheetRangeContainsCell(item.range, cell)
  ));
}

function isDataSelectionRange(range: Pick<MultiRangeSelectionRange, 'rowType' | 'colType'>) {
  return range.rowType === 'rgRow' && isSpreadsheetColumnType(range.colType);
}

function spreadsheetRangeMatchesCellProvider(
  range: Pick<MultiRangeSelectionRange, 'rowType' | 'colType'>,
  cell: SpreadsheetActionCell,
) {
  return (!cell.rowType || range.rowType === cell.rowType)
    && (!cell.colType || range.colType === cell.colType);
}

function spreadsheetRangeContainsCell(range: RangeArea, cell: Pick<Cell, 'x' | 'y'>) {
  const normalized = normalizeSpreadsheetRange(undefined, range);
  return Boolean(
    normalized
    && cell.x >= normalized.x
    && cell.x <= normalized.x1
    && cell.y >= normalized.y
    && cell.y <= normalized.y1,
  );
}

function isSingleSpreadsheetRange(range: RangeArea) {
  const normalized = normalizeSpreadsheetRange(undefined, range);
  return !normalized || (normalized.x === normalized.x1 && normalized.y === normalized.y1);
}

function cloneSpreadsheetSelectionRange(range: MultiRangeSelectionRange): MultiRangeSelectionRange {
  return {
    rowType: range.rowType,
    colType: range.colType,
    range: { ...range.range },
  };
}

function readSpreadsheetRowType(value: string | null | undefined): DimensionRows | undefined {
  return value === 'rgRow' || value === 'rowPinStart' || value === 'rowPinEnd'
    ? value
    : undefined;
}

function readSpreadsheetColumnType(value: string | null | undefined): DimensionCols | undefined {
  return isSpreadsheetColumnType(value) ? value : undefined;
}

function isSpreadsheetColumnType(value: unknown): value is DimensionCols {
  return value === 'rgCol' || value === 'colPinStart' || value === 'colPinEnd';
}

function readSpreadsheetDataIndex(element: HTMLElement | null | undefined, names: string[]) {
  if (!element) {
    return;
  }
  for (const name of names) {
    const value = element.getAttribute(name);
    if (value !== null) {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? undefined : parsed;
    }
  }
}

function getRowSource(context?: ContextMenuActionContext | RowContextMenuOpenContext) {
  const actionContext = context && !('target' in context) ? context : undefined;
  const openContext = context
    ? 'target' in context
      ? context
      : context.menu
    : undefined;
  const providers = openContext?.providers ?? actionContext?.providers;
  const revogrid = openContext?.revogrid ?? actionContext?.revogrid;
  const store = providers?.data.stores.rgRow.store;
  const storeRows = store?.get?.('source') as DataType[] | undefined;
  const gridRows = revogrid?.source as DataType[] | undefined;
  const useStoreRows = Boolean(storeRows?.length || !gridRows?.length);

  return {
    store: useStoreRows ? store : undefined,
    rows: useStoreRows ? storeRows ?? [] : gridRows ?? [],
  };
}

function resolveRowIndexFromOpenContext(context: RowContextMenuOpenContext) {
  const target = context.triggerElement.closest?.('.rgCell, .rgRow') ?? context.triggerElement;
  const virtualIndex = readSpreadsheetDataIndex(target as HTMLElement, ['data-rgrow', 'data-rgRow']);
  return resolvePhysicalRowIndex(virtualIndex, context);
}

function resolveRowIndexFromActionContext(
  context: ContextMenuActionContext | undefined,
  focused?: Cell | null,
) {
  if (context?.menu?.target === 'row') {
    return resolveRowIndexFromOpenContext(context.menu);
  }
  return resolvePhysicalRowIndex(focused?.y, context);
}

function resolvePhysicalRowIndex(
  virtualIndex: number | undefined,
  context?: ContextMenuActionContext | RowContextMenuOpenContext,
) {
  if (virtualIndex === undefined || Number.isNaN(virtualIndex)) {
    return;
  }
  const { rows, store } = getRowSource(context);
  const physicalIndex = store ? getSourcePhysicalIndex(store, virtualIndex) : virtualIndex;
  const row = rows[physicalIndex];
  return row && !isGrouping(row) ? physicalIndex : undefined;
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

function getSpreadsheetActionColumns(
  grid: Pick<HTMLRevoGridElement, 'columns'>,
  colType?: DimensionCols,
) {
  const leaves = getSpreadsheetLeafColumns(grid.columns ?? []);
  if (colType === 'colPinStart') {
    return leaves.filter(column => column.pin === 'colPinStart');
  }
  if (colType === 'colPinEnd') {
    return leaves.filter(column => column.pin === 'colPinEnd');
  }
  if (colType === 'rgCol') {
    return leaves.filter(column => !column.pin);
  }
  return leaves;
}

function getSpreadsheetAbsoluteColumnIndex(
  grid: Pick<HTMLRevoGridElement, 'columns'>,
  colType: DimensionCols | undefined,
  localIndex: number,
) {
  const leaves = getSpreadsheetLeafColumns(grid.columns ?? []);
  const column = getSpreadsheetActionColumns(grid, colType)[localIndex];
  if (!column) {
    return;
  }
  const absoluteIndex = leaves.findIndex(candidate => candidate.prop === column.prop);
  return absoluteIndex >= 0 ? absoluteIndex : undefined;
}

function getSpreadsheetSelectionA1Ref(
  grid: HTMLRevoGridElement,
  selection: SpreadsheetActionRange,
  context: ContextMenuActionContext | undefined,
) {
  const startColumn = getSpreadsheetAbsoluteColumnIndex(grid, selection.colType, selection.x);
  const endColumn = getSpreadsheetAbsoluteColumnIndex(grid, selection.colType, selection.x1);
  const startRow = resolvePhysicalRowIndex(selection.y, context) ?? selection.y;
  const endRow = resolvePhysicalRowIndex(selection.y1, context) ?? selection.y1;
  if (startColumn === undefined || endColumn === undefined) {
    return;
  }

  const from = formatSpreadsheetA1Address(
    Math.min(startColumn, endColumn),
    Math.min(startRow, endRow),
  );
  const to = formatSpreadsheetA1Address(
    Math.max(startColumn, endColumn),
    Math.max(startRow, endRow),
  );
  return from === to ? from : `${from}:${to}`;
}

function formatSpreadsheetA1Address(column: number, row: number) {
  let remaining = column + 1;
  let letters = '';
  while (remaining > 0) {
    const remainder = (remaining - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    remaining = Math.floor((remaining - 1) / 26);
  }
  return `${letters}${row + 1}`;
}

function createNextSpreadsheetName(names: FormulaNameDefinition[]) {
  const existing = new Set(names.map(item => item.name.toLowerCase()));
  let index = 1;
  while (existing.has(`selection${index}`)) {
    index++;
  }
  return `Selection${index}`;
}

function isSpreadsheetColumnGroup(column: ColumnGrouping | ColumnRegular): column is ColumnGrouping {
  return Array.isArray((column as ColumnGrouping).children);
}

export function createSpreadsheetHistoryConfig(sourceId = SPREADSHEET_DEMO_ID): HistoryConfig {
  return {
    sourceId,
    maxStackSize: 80,
    clearOnSourceChange: true,
    clearOnFilterChange: false,
    clearOnSortingChange: false,
    clearOnRowOrderChange: false,
  };
}

export function createSpreadsheetEventManagerConfig() {
  return {
    applyEventsToSource: true,
  };
}

export function createSpreadsheetCellFlashConfig() {
  return {
    duration: 850,
    rowDuration: 1200,
    queue: 'merge' as const,
    mode: 'cell-and-row' as const,
    clearOnSourceChange: false,
    aria: true,
  };
}

export function flashSpreadsheetSampleCells(
  plugin: SpreadsheetFlashPlugin | undefined,
  workbook: SpreadsheetWorkbook,
) {
  if (!plugin?.flashCells) {
    return 'Cell flash plugin is not ready yet.';
  }

  const row = workbook.rows[0];
  if (!row) {
    return 'No visible row is available to flash.';
  }

  const columns = getSpreadsheetLeafColumns(workbook.columns)
    .filter(column => column.readonly !== true)
    .slice(0, 3);
  if (!columns.length) {
    return 'No editable cells are available to flash.';
  }

  const data: Record<string, unknown> = {};
  const previousData: Record<string, unknown> = {};
  columns.forEach((column, index) => {
    const value = row[column.prop];
    data[String(column.prop)] = value;
    previousData[String(column.prop)] = createSpreadsheetFlashPreviousValue(value, index);
  });

  plugin.flashCells({
    type: 'rgRow',
    data: { 0: data },
    previousData: { 0: previousData },
    eventTypes: ['spreadsheet-demo-flash'],
  }, {
    mode: 'cell-and-row',
    duration: 1250,
    rowDuration: 1450,
  });

  const labels = columns.map(getColumnLabel).join(', ');
  return `Flashed ${labels} in row 1.`;
}

export function createSpreadsheetFormulaDependencyHighlightConfig() {
  return {
    dependencyClass: 'spreadsheet-dependency-cell',
    formulaCellClass: 'spreadsheet-dependency-active-cell',
    dependencyColors: ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#0891b2', '#ca8a04'],
    includeNamedRanges: true,
  };
}

function createSpreadsheetFlashPreviousValue(value: unknown, offset: number) {
  if (typeof value === 'number') {
    return value + (offset % 2 === 0 ? -1000 : 1000);
  }
  if (typeof value === 'string' && value.trim()) {
    return `${value} previous`;
  }
  if (typeof value === 'boolean') {
    return !value;
  }
  return '__previous__';
}

export function createSpreadsheetExportExcelConfig() {
  return {
    allowDrag: true,
    allowedExtensions: ['.csv'],
  };
}
