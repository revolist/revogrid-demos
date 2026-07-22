/** Grid interaction guards, menus, clipboard actions, and mutation orchestration. */
import {
  getSourcePhysicalIndex,
  isGrouping,
  type Cell,
  type ColumnRegular,
  type DataType,
  type DimensionCols,
  type DimensionRows,
  type RangeArea,
} from '@revolist/revogrid';
import {
  type ContextMenuActionContext,
  type ContextMenuConfig,
  type ContextMenuItem,
  type MergeData,
  type MultiRangeSelectionRange,
  type RowContextMenuOpenContext,
} from '@revolist/revogrid-pro';
import { getSpreadsheetLeafColumns } from './columns';
import {
  arrowDownIcon,
  arrowUpIcon,
  borderAllIcon,
  broomIcon,
  copyIcon,
  eraserIcon,
  pasteIcon,
  scissorsIcon,
  trashIcon,
} from './interaction-icons';
import {
  createSpreadsheetColumnContextItems,
  createSpreadsheetColumnGroupContextItems,
} from './interaction-column-menu';
import {
  applySpreadsheetCellMerge,
  applySpreadsheetRows,
  createBlankSpreadsheetContextRow,
} from './interaction-workbook';
import {
  findSpreadsheetRangeIndexForCell,
  getCachedSpreadsheetSelectionRanges,
  getSpreadsheetCellFromElement,
  isSingleSpreadsheetRange,
  readSpreadsheetDataIndex,
} from './interaction-selection';
import { type SpreadsheetContextMenuController } from './models';
import { summarizeClipboardMatrix } from './status';

let spreadsheetClipboardText = '';

type SpreadsheetGridWithDemoProps = HTMLRevoGridElement & {
  cellMerge?: MergeData[];
};

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
};

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
  ];
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

function getColumnLabel(column: ColumnRegular) {
  return typeof column.name === 'string' && column.name.trim() ? column.name : String(column.prop);
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
