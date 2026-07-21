import type {
  ColumnGrouping,
  ColumnProp,
  ColumnRegular,
  HyperFunc,
  VNode,
} from '@revolist/revogrid';
import {
  getSourcePhysicalIndex,
  isGrouping,
} from '@revolist/revogrid';
import {
  ColumnDropdown,
  ColumnGroupPanelPlugin,
  ColumnHidePlugin,
  ColumnStretchPlugin,
  ContextMenuPlugin,
  avatarTemplate,
  columnTypeRenderer,
  type ExcelExportCellData,
  type ExcelExportContextTransformer,
  type ExportExcelEvent,
  type ColumnContextMenuOpenContext,
  type ContextMenuActionContext,
  type ContextMenuConfig,
  type ContextMenuItem,
  type RowContextMenuOpenContext,
} from '@revolist/revogrid-pro';
import arrowDownZAIcon from '@fortawesome/fontawesome-free/svgs/solid/arrow-down-z-a.svg?raw';
import arrowUpAZIcon from '@fortawesome/fontawesome-free/svgs/solid/arrow-up-a-z.svg?raw';
import banIcon from '@fortawesome/fontawesome-free/svgs/solid/ban.svg?raw';
import checkIcon from '@fortawesome/fontawesome-free/svgs/solid/circle-check.svg?raw';
import copyIcon from '@fortawesome/fontawesome-free/svgs/solid/copy.svg?raw';
import eraserIcon from '@fortawesome/fontawesome-free/svgs/solid/eraser.svg?raw';
import eyeSlashIcon from '@fortawesome/fontawesome-free/svgs/solid/eye-slash.svg?raw';
import fileExcelIcon from '@fortawesome/fontawesome-free/svgs/solid/file-excel.svg?raw';
import thumbtackIcon from '@fortawesome/fontawesome-free/svgs/solid/thumbtack.svg?raw';
import trashIcon from '@fortawesome/fontawesome-free/svgs/solid/trash.svg?raw';
import {
  ECOMMERCE_COLUMNS,
  ECOMMERCE_COLUMNS_TYPES,
  ECOMMERCE_PLUGINS,
} from './sys-data/ecommerce.columns';

export const ecommerceAvatarProfiles = [
  { value: 'FN', label: 'Fiona Nguyen' },
  { value: 'ML', label: 'Marco Lee' },
  { value: 'FC', label: 'Faye Carter' },
  { value: 'MS', label: 'Maya Singh' },
  { value: 'MM', label: 'Mina Moore' },
  { value: 'FH', label: 'Felix Hall' },
  { value: 'CR', label: 'Cam Rivera' },
  { value: 'AN', label: 'Ari Novak' },
];

const EXCEL_HEADER_STYLE = {
  fontWeight: 'bold' as const,
  textColor: '#0f172a',
  backgroundColor: '#e2e8f0',
  borderColor: '#cbd5e1',
  borderStyle: 'thin',
  align: 'center' as const,
  alignVertical: 'center' as const,
  wrap: true,
};

const EXCEL_GROUP_HEADER_STYLE = {
  ...EXCEL_HEADER_STYLE,
  textColor: '#ffffff',
  backgroundColor: '#1f2937',
};

const EXCEL_TEXT_CELL_STYLE = {
  borderColor: '#e2e8f0',
  borderStyle: 'thin',
  alignVertical: 'center' as const,
};

const EXCEL_NUMERIC_CELL_STYLE = {
  ...EXCEL_TEXT_CELL_STYLE,
  align: 'right' as const,
};

const avatarExcelStyles = [
  { backgroundColor: '#dbeafe', textColor: '#1d4ed8' },
  { backgroundColor: '#fef3c7', textColor: '#92400e' },
  { backgroundColor: '#fce7f3', textColor: '#be185d' },
  { backgroundColor: '#e0e7ff', textColor: '#4338ca' },
  { backgroundColor: '#dcfce7', textColor: '#166534' },
  { backgroundColor: '#ffe4e6', textColor: '#be123c' },
  { backgroundColor: '#ede9fe', textColor: '#6d28d9' },
  { backgroundColor: '#ffedd5', textColor: '#c2410c' },
];

const genderExcelStyles = {
  Female: { backgroundColor: '#fdf2f8', textColor: '#be185d' },
  Male: { backgroundColor: '#eff6ff', textColor: '#2563eb' },
} as const;

const membershipExcelStyles = {
  Gold: { backgroundColor: '#fffbeb', textColor: '#b45309' },
  Silver: { backgroundColor: '#f8fafc', textColor: '#475569' },
  Bronze: { backgroundColor: '#fff7ed', textColor: '#c2410c' },
} as const;

const discountExcelStyles = {
  Applied: { backgroundColor: '#ecfdf5', textColor: '#047857' },
  None: { backgroundColor: '#f8fafc', textColor: '#64748b' },
} as const;

export const ecommerceColumnTypes = {
  ...ECOMMERCE_COLUMNS_TYPES,
  dropdown: ColumnDropdown,
};

export const ecommercePlugins = Array.from(
  new Set([
    ...ECOMMERCE_PLUGINS,
    ColumnGroupPanelPlugin,
    ContextMenuPlugin,
    ColumnHidePlugin,
    ColumnStretchPlugin,
  ]),
);

export type EcommerceContextMenuController = {
  getRows: () => any[];
  setRows: (rows: any[]) => void;
  getColumns: () => (ColumnRegular | ColumnGrouping)[];
  setColumns: (columns: (ColumnRegular | ColumnGrouping)[]) => void;
  getHiddenColumns: () => ColumnProp[];
  setHiddenColumns: (hiddenColumns: ColumnProp[]) => void;
  getGrid: () => HTMLRevoGridElement | null | undefined;
  getSelectedIndexes?: () => Set<number>;
  clearSelection?: () => void;
  exportExcel: () => void | Promise<void>;
};

export function normalizeEcommerceRows(rows: any[]) {
  return rows.map((row, index) => ({
    ...row,
    avatar:
      row.avatar ||
      ecommerceAvatarProfiles[index % ecommerceAvatarProfiles.length].value,
  }));
}

export function createEcommerceAnalyticsColumns(): (
  | ColumnRegular
  | ColumnGrouping
)[] {
  return ECOMMERCE_COLUMNS.map((column) => {
    if ('children' in column) {
      return {
        ...column,
        children: column.children.map(enhanceEcommerceColumn),
      };
    }
    return enhanceEcommerceColumn(column);
  });
}

export function createEcommerceExcelExportConfig(): ExportExcelEvent {
  return {
    sheetName: 'Customer Analytics',
    workbookName: 'customer-analytics.xlsx',
    writingOptions: {
      bookType: 'xlsx',
      compression: true,
    },
    exportTransformers: [styleEcommerceExcelHeaders],
  };
}

export function createEcommerceContextMenus(
  controller: EcommerceContextMenuController,
): {
  rowContextMenu: ContextMenuConfig;
  columnContextMenu: ContextMenuConfig;
} {
  const rowContextMenu: ContextMenuConfig = {
    resolve: (context) => {
      if (context.target !== 'row' || !resolveEcommerceRowFromOpenContext(context, controller)) {
        return null;
      }
    },
    items: [
      {
        name: 'Copy customer',
        icon: copyIcon,
        action: (_, focused, __, ___, context) => {
          const targets = resolveEcommerceRowTargetsFromActionContext(context, controller, focused);
          if (!targets.length) return;
          void copyText(targets.map((target) => createCustomerClipboardText(target.row)).join('\n\n'));
        },
      },
      {
        name: 'Duplicate customer',
        icon: copyIcon,
        class: 'project-context-section-start',
        action: (_, focused, __, ___, context) => {
          const targets = resolveEcommerceRowTargetsFromActionContext(context, controller, focused);
          if (!targets.length) return;
          const targetIds = new Set(targets.map((target) => getEcommerceRowId(target.row)));
          const rows = controller.getRows();
          controller.setRows(rows.flatMap((row) =>
            targetIds.has(getEcommerceRowId(row)) ? [row, duplicateEcommerceRow(row, rows)] : [row],
          ));
        },
      },
      {
        name: 'Mark discount applied',
        icon: checkIcon,
        action: (_, focused, __, ___, context) =>
          updateEcommerceRowFromMenu(context, controller, focused, (row) => ({
            ...row,
            'Discount Applied': true,
          })),
      },
      {
        name: 'Clear discount',
        icon: banIcon,
        action: (_, focused, __, ___, context) =>
          updateEcommerceRowFromMenu(context, controller, focused, (row) => ({
            ...row,
            'Discount Applied': false,
          })),
      },
      {
        name: 'Export analytics',
        icon: fileExcelIcon,
        class: 'project-context-section-start',
        action: () => {
          void controller.exportExcel();
        },
      },
      {
        name: 'Delete customer',
        icon: trashIcon,
        class: 'project-context-danger project-context-section-start',
        action: (_, focused, __, ___, context) => {
          const targets = resolveEcommerceRowTargetsFromActionContext(context, controller, focused);
          if (!targets.length) return;
          const targetIds = new Set(targets.map((target) => getEcommerceRowId(target.row)));
          controller.setRows(controller.getRows().filter((row) => !targetIds.has(getEcommerceRowId(row))));
          controller.clearSelection?.();
        },
      },
    ],
  };

  const columnContextMenu: ContextMenuConfig = {
    anchorToTarget: true,
    resolve: (context) => {
      if (context.target !== 'column' || !context.column || context.column.prop === '_checkbox') {
        return null;
      }
      return {
        items: closeColumnContextItemsOnAction(createEcommerceColumnContextItems(context, controller)),
      };
    },
    items: [],
  };

  return { rowContextMenu, columnContextMenu };
}

export function getVisibleEcommerceColumns(
  columns: (ColumnRegular | ColumnGrouping)[],
  hiddenColumns: ColumnProp[],
): (ColumnRegular | ColumnGrouping)[] {
  const hiddenColumnSet = new Set(hiddenColumns);
  const visibleColumns: (ColumnRegular | ColumnGrouping)[] = [];

  for (const column of columns) {
    if ('children' in column) {
      const children = getVisibleEcommerceColumns(
        column.children,
        hiddenColumns,
      );
      if (children.length) {
        visibleColumns.push({ ...column, children } as ColumnGrouping);
      }
      continue;
    }

    if (!column.prop || !hiddenColumnSet.has(column.prop)) {
      visibleColumns.push(column);
    }
  }

  return visibleColumns;
}

export function filterEcommerceRows(rows: any[], expression: string) {
  const query = expression.trim();
  if (!query) return rows;

  const parsed = parseToolbarExpression(query);
  if (!parsed.length) {
    const needle = normalizeSearch(query);
    return rows.filter((row) =>
      Object.values(row).some((value) => normalizeSearch(value).includes(needle)),
    );
  }

  return rows.filter((row) => evaluateToolbarExpression(row, parsed));
}

export function formatEcommerceTotalSpend(rows: any[]) {
  const value = rows.reduce((sum, row) => {
    const spend = Number.parseFloat(
      String(row['Total Spend']).replace(/[$,]/g, ''),
    );
    return Number.isFinite(spend) ? sum + spend : sum;
  }, 0);

  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 1,
  }).format(value);
}

export function getSelectedEcommerceIndexes(
  event: CustomEvent<HTMLRevoGridElementEventMap['rowselected']>,
  rows: any[],
) {
  const gridSource = ((event.target as HTMLRevoGridElement | null)?.source ?? []) as any[];
  const indexes = new Set<number>();

  event.detail.selected.forEach((selectedIndexes) => {
    selectedIndexes.forEach((selectedIndex) => {
      const selectedRow = gridSource[selectedIndex];
      const rowIndex = rows.findIndex((row) => getEcommerceRowId(row) === getEcommerceRowId(selectedRow));
      if (rowIndex >= 0) {
        indexes.add(rowIndex);
      }
    });
  });

  return indexes;
}

export function clearEcommerceSelection(grid: HTMLRevoGridElement | undefined | null) {
  grid?.dispatchEvent(new CustomEvent('rowallselectclick', {
    detail: { selected: false, type: 'rgCol' },
    bubbles: true,
    composed: true,
  }));
}

function createEcommerceColumnContextItems(
  menu: ColumnContextMenuOpenContext,
  controller: EcommerceContextMenuController,
): ContextMenuItem[] {
  const column = menu.column;
  if (!column) return [];

  const prop = column.prop;
  const isPinned = !!column.pin;
  const canHide = prop !== '_checkbox';
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
    {
      name: 'Sort ascending',
      icon: arrowUpAZIcon,
      class: 'project-context-section-start',
      action: (_, __, ___, ____, context) => {
        const activeColumn = getColumnActionContext(context)?.column ?? column;
        void controller.getGrid()?.updateColumnSorting(activeColumn, 'asc', false);
      },
    },
    {
      name: 'Sort descending',
      icon: arrowDownZAIcon,
      action: (_, __, ___, ____, context) => {
        const activeColumn = getColumnActionContext(context)?.column ?? column;
        void controller.getGrid()?.updateColumnSorting(activeColumn, 'desc', false);
      },
    },
    {
      name: 'Clear sorting',
      icon: eraserIcon,
      action: () => {
        void controller.getGrid()?.clearSorting();
      },
    },
    canHide ? {
      name: 'Hide column',
      icon: eyeSlashIcon,
      class: 'project-context-section-start',
      action: (_, __, ___, ____, context) => {
        const activeColumn = getColumnActionContext(context)?.column ?? column;
        controller.setHiddenColumns(Array.from(new Set([
          ...controller.getHiddenColumns(),
          activeColumn.prop,
        ])));
      },
    } : undefined,
    {
      name: isPinned ? 'Unpin column' : 'Pin column left',
      icon: thumbtackIcon,
      action: (_, __, ___, ____, context) => {
        const activeColumn = getColumnActionContext(context)?.column ?? column;
        controller.setColumns(updateEcommerceColumnsByProp(
          controller.getColumns(),
          activeColumn.prop,
          (target) => {
            if (isPinned) {
              const { pin: _pin, ...rest } = target;
              return rest;
            }
            return { ...target, pin: 'colPinStart' };
          },
        ));
      },
    },
    {
      name: 'Export analytics',
      icon: fileExcelIcon,
      class: 'project-context-section-start',
      action: () => {
        void controller.exportExcel();
      },
    },
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
        close?.();
        const result = item.action?.(...args);
        window.setTimeout(() => close?.(), 0);
        return result;
      },
    };
  });
}

function getColumnActionContext(
  context?: ContextMenuActionContext,
): ColumnContextMenuOpenContext | undefined {
  return context?.menu?.target === 'column' ? context.menu : undefined;
}

function updateEcommerceColumnsByProp(
  columns: (ColumnRegular | ColumnGrouping)[],
  prop: ColumnProp,
  updater: (column: ColumnRegular) => ColumnRegular,
): (ColumnRegular | ColumnGrouping)[] {
  return columns.map((column) => {
    if ('children' in column) {
      return {
        ...column,
        children: updateEcommerceColumnsByProp(column.children, prop, updater) as ColumnRegular[],
      };
    }
    return column.prop === prop ? updater({ ...column }) : column;
  });
}

function updateEcommerceRowFromMenu(
  context: ContextMenuActionContext | undefined,
  controller: EcommerceContextMenuController,
  focused: { y: number } | null | undefined,
  updater: (row: any) => any,
) {
  const targets = resolveEcommerceRowTargetsFromActionContext(context, controller, focused);
  if (!targets.length) return;
  const targetIds = new Set(targets.map((target) => getEcommerceRowId(target.row)));
  controller.setRows(controller.getRows().map((row) =>
    targetIds.has(getEcommerceRowId(row)) ? updater(row) : row,
  ));
}

function resolveEcommerceRowTargetsFromActionContext(
  context: ContextMenuActionContext | undefined,
  controller: EcommerceContextMenuController,
  focused?: { y: number } | null,
) {
  const clicked = resolveEcommerceRowFromActionContext(context, controller, focused);
  if (!clicked) return [];

  const selectedIndexes = controller.getSelectedIndexes?.() ?? new Set<number>();
  if (!selectedIndexes.has(clicked.index)) {
    return [clicked];
  }

  const rows = controller.getRows();
  return [...selectedIndexes]
    .sort((a, b) => a - b)
    .map((index) => rows[index] ? { row: rows[index], index } : null)
    .filter((target): target is { row: any; index: number } => !!target);
}

function resolveEcommerceRowFromActionContext(
  context: ContextMenuActionContext | undefined,
  controller: EcommerceContextMenuController,
  focused?: { y: number } | null,
) {
  const menu = context?.menu;
  if (menu?.target === 'row') {
    return resolveEcommerceRowFromOpenContext(menu, controller);
  }
  return resolveEcommerceRowFromVirtualIndex(focused?.y, controller);
}

function resolveEcommerceRowFromOpenContext(
  context: RowContextMenuOpenContext,
  controller: EcommerceContextMenuController,
) {
  const target = context.triggerElement.closest?.('.rgCell, .rgRow') ?? context.triggerElement;
  const rawIndex = target.getAttribute?.('data-rgrow') ?? target.getAttribute?.('data-rgRow');
  const virtualIndex = rawIndex == null ? undefined : Number(rawIndex);
  return resolveEcommerceRowFromVirtualIndex(
    virtualIndex,
    controller,
    context.providers.data.stores.rgRow.store,
  );
}

function resolveEcommerceRowFromVirtualIndex(
  virtualIndex: number | undefined,
  controller: EcommerceContextMenuController,
  dataStore?: any,
) {
  if (virtualIndex === undefined || Number.isNaN(virtualIndex)) return null;
  const physicalIndex = dataStore ? getSourcePhysicalIndex(dataStore, virtualIndex) : virtualIndex;
  const source = dataStore?.get?.('source') ?? controller.getGrid()?.source ?? controller.getRows();
  const sourceRow = source?.[physicalIndex];
  if (!sourceRow || isGrouping(sourceRow)) return null;
  const index = controller.getRows().findIndex((row) =>
    getEcommerceRowId(row) === getEcommerceRowId(sourceRow),
  );
  if (index < 0) return null;
  return { row: controller.getRows()[index], index };
}

function duplicateEcommerceRow(row: any, rows: any[]) {
  return {
    ...row,
    'Customer ID': createDuplicateCustomerId(row, rows),
  };
}

function createDuplicateCustomerId(row: any, rows: any[]) {
  const base = String(row['Customer ID'] ?? 'CUSTOMER');
  const existing = new Set(rows.map((item) => String(item['Customer ID'] ?? '')));
  let index = 1;
  let next = `${base}-COPY`;
  while (existing.has(next)) {
    index += 1;
    next = `${base}-COPY-${index}`;
  }
  return next;
}

function getEcommerceRowId(row: any) {
  return String(row?.['Customer ID'] ?? row?.id ?? '');
}

function createCustomerClipboardText(row: any) {
  return [
    `Customer ID: ${row['Customer ID'] ?? ''}`,
    `Customer: ${row.avatar ?? ''}`,
    `Gender: ${row.Gender ?? ''}`,
    `City: ${row.City ?? ''}`,
    `Membership: ${row['Membership Type'] ?? ''}`,
    `Total Spend: ${formatCurrency(row['Total Spend'])}`,
  ].join('\n');
}

async function copyText(value: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
  }
}

function enhanceEcommerceColumn(column: ColumnRegular): ColumnRegular {
  if (column.prop === '_checkbox') return { ...column, size: 54 };
  column = {
    ...column,
    columnTemplate: (h, data) => columnTypeRenderer(h, {
      ...data,
      columnType: getEcommerceHeaderType(column.prop),
    }),
  };
  const excelExport = createBaseExcelExport(column);
  if (column.prop === 'Customer ID') {
    return {
      ...column,
      name: 'ID',
      size: 86,
      filter: ['slider'],
      excelExport: {
        ...excelExport,
        cellProperties: ({ value }) => ({
          value: String(value ?? ''),
          type: String,
          ...EXCEL_TEXT_CELL_STYLE,
          textColor: '#475569',
          align: 'center',
          format: '@',
        }),
      },
      cellTemplate: (h, { value }) =>
        h('span', { class: 'analytics-id' }, String(value)),
    };
  }
  if (column.prop === 'avatar') {
    return {
      ...column,
      name: 'Customer',
      size: 112,
      filter: ['selection'],
      columnType: 'dropdown',
      cellTemplate: ColumnDropdown.cellTemplate,
      cellProperties: ColumnDropdown.cellProperties,
      excelExport: {
        ...excelExport,
        cellProperties: ({ value, rowIndex }) => {
          const profile = ecommerceAvatarProfiles.find(
            (item) => item.value === value,
          );
          const index = ecommerceAvatarProfiles.findIndex(
            (item) => item.value === value,
          );
          return createBadgeExcelCell({
            value: profile ? `${profile.value} - ${profile.label}` : String(value ?? ''),
            ...(avatarExcelStyles[Math.max(index, rowIndex, 0) % avatarExcelStyles.length]),
          });
        },
      },
      dropdown: {
        source: ecommerceAvatarProfiles,
        renderSelectedValue: (h, selectedOptions, children) => {
          const value = String(selectedOptions[0]?.value || '');
          const index = ecommerceAvatarProfiles.findIndex(
            (profile) => profile.value === value,
          );
          return h(
            'span',
            { class: 'analytics-avatar-select' },
            [
              avatarTemplate(h, {
                className: 'analytics-avatar',
                index,
                initials: value,
                label: selectedOptions[0]?.label,
                size: 32,
                value,
              }),
              children,
            ],
          );
        },
        renderOption: (h, option) => {
          const index = ecommerceAvatarProfiles.findIndex(
            (profile) => profile.value === option.value,
          );
          return h(
            'span',
            { class: 'analytics-avatar-option' },
            [
              avatarTemplate(h, {
                className: 'analytics-avatar',
                index,
                initials: String(option.value ?? ''),
                label: option.label,
                size: 32,
                value: option.value,
              }),
              h('span', null, option.label),
            ],
          );
        },
      },
    };
  }
  if (column.prop === 'Gender') {
    return {
      ...column,
      size: 130,
      filter: ['selection'],
      columnType: 'dropdown',
      cellTemplate: ColumnDropdown.cellTemplate,
      cellProperties: ColumnDropdown.cellProperties,
      excelExport: {
        ...excelExport,
        cellProperties: ({ value }) => {
          const label = String(value ?? '');
          return createBadgeExcelCell({
            value: label,
            ...(genderExcelStyles[label as keyof typeof genderExcelStyles] ?? {}),
          });
        },
      },
      dropdown: {
        source: ['Male', 'Female'].map((value) => ({ value, label: value })),
        renderSelectedValue: (h, selectedOptions, children) =>
          h(
            'span',
            {
              class: `analytics-pill analytics-pill--${String(selectedOptions[0]?.label).toLowerCase()}`,
            },
            [selectedOptions[0]?.label, children],
          ),
        renderOption: (h, option) =>
          h(
            'span',
            {
              class: `analytics-dropdown-option analytics-pill analytics-pill--${String(option.label).toLowerCase()}`,
            },
            option.label,
          ),
      },
    };
  }
  if (column.prop === 'City') {
    return {
      ...column,
      size: 168,
      excelExport,
      cellTemplate: (h, { value }) =>
        h('span', { class: 'analytics-city' }, String(value)),
    };
  }
  if (column.prop === 'Membership Type') {
    return {
      ...column,
      size: 176,
      columnType: 'dropdown',
      cellTemplate: ColumnDropdown.cellTemplate,
      cellProperties: ColumnDropdown.cellProperties,
      excelExport: {
        ...excelExport,
        cellProperties: ({ value }) => {
          const label = String(value ?? '');
          return createBadgeExcelCell({
            value: label,
            ...(membershipExcelStyles[label as keyof typeof membershipExcelStyles] ?? {}),
          });
        },
      },
      dropdown: {
        source: ['Gold', 'Silver', 'Bronze'].map((value) => ({
          value,
          label: value,
        })),
        renderSelectedValue: (h, selectedOptions, children) =>
          h(
            'span',
            {
              class: `analytics-tier analytics-tier--${String(selectedOptions[0]?.label).toLowerCase()}`,
            },
            [selectedOptions[0]?.label, children],
          ),
        renderOption: (h, option) =>
          h(
            'span',
            {
              class: `analytics-dropdown-option analytics-tier analytics-tier--${String(option.label).toLowerCase()}`,
            },
            option.label,
          ),
      },
    };
  }
  if (column.prop === 'Lifetime Value') {
    return {
      ...column,
      size: 168,
      excelExport: createNumericExcelExport(column, '$#,##0'),
      cellTemplate: (h, { value }) =>
        h('span', { class: 'analytics-money' }, formatCurrency(value)),
    };
  }
  if (column.prop === 'Age') {
    return {
      ...column,
      size: 104,
      excelExport: createNumericExcelExport(column, '0'),
      cellTemplate: (h, { value }) =>
        h('span', { class: 'analytics-number' }, String(value)),
    };
  }
  if (column.prop === 'Average Rating') {
    return {
      ...column,
      size: 164,
      excelExport: {
        ...createNumericExcelExport(column, '0.0'),
        cellProperties: ({ value }) => {
          const numeric = parseNumber(value);
          if (numeric === undefined) {
            return {
              value: String(value ?? ''),
              type: String,
              ...EXCEL_TEXT_CELL_STYLE,
            };
          }
          return {
            value: numeric,
            type: Number,
            format: '0.0',
            ...EXCEL_NUMERIC_CELL_STYLE,
            textColor: '#92400e',
            backgroundColor: '#fffbeb',
          };
        },
      },
      cellTemplate: renderAnalyticsStars,
    };
  }
  if (column.prop === 'Discount Applied') {
    return {
      ...column,
      size: 130,
      columnType: 'dropdown',
      cellTemplate: ColumnDropdown.cellTemplate,
      cellProperties: ColumnDropdown.cellProperties,
      excelExport: {
        ...excelExport,
        cellProperties: ({ value }) => {
          const label = value === true ? 'Applied' : 'None';
          return createBadgeExcelCell({
            value: label,
            ...discountExcelStyles[label],
          });
        },
      },
      dropdown: {
        source: [
          { value: true, label: 'Applied' },
          { value: false, label: 'None' },
        ],
        renderSelectedValue: (h, selectedOptions, children) => {
          const enabled = selectedOptions[0]?.value === true;
          return h(
            'span',
            {
              class: `analytics-discount analytics-discount--${enabled ? 'yes' : 'no'}`,
            },
            [selectedOptions[0]?.label, children],
          );
        },
        renderOption: (h, option) =>
          h(
            'span',
            {
              class: `analytics-dropdown-option analytics-discount analytics-discount--${option.value === true ? 'yes' : 'no'}`,
            },
            option.label,
          ),
      },
    };
  }
  if (column.prop === 'Spend Change (%)') {
    return {
      ...column,
      size: 178,
      excelExport: {
        ...createNumericExcelExport(column, '+0.0%;-0.0%;0.0%'),
        cellProperties: ({ value }) => {
          const numeric = parseNumber(value);
          if (numeric === undefined) {
            return {
              value: String(value ?? ''),
              type: String,
              ...EXCEL_TEXT_CELL_STYLE,
            };
          }
          return {
            value: numeric,
            type: Number,
            format: '+0.0%;-0.0%;0.0%',
            ...EXCEL_NUMERIC_CELL_STYLE,
            textColor: numeric >= 0 ? '#047857' : '#be123c',
            backgroundColor: numeric >= 0 ? '#ecfdf5' : '#fff1f2',
          };
        },
      },
      cellTemplate: renderAnalyticsChange,
    };
  }
  if (column.prop === 'Total Spend') {
    return {
      ...column,
      size: 152,
      excelExport: createNumericExcelExport(column, '$#,##0'),
      cellTemplate: (h, { value }) =>
        h('span', { class: 'analytics-money' }, formatCurrency(value)),
    };
  }
  return { ...column, excelExport };
}

function getEcommerceHeaderType(prop: ColumnRegular['prop']) {
  switch (prop) {
    case 'Customer ID':
      return 'id';
    case 'Age':
      return 'integer';
    case 'Lifetime Value':
    case 'Total Spend':
      return 'currency';
    case 'Average Rating':
    case 'Spend Change (%)':
      return 'decimal';
    case 'Discount Applied':
      return 'boolean';
    default:
      return 'string';
  }
}

function createBaseExcelExport(column: ColumnRegular) {
  return {
    columnProperties: () => ({
      ...EXCEL_HEADER_STYLE,
      value: String(column.name ?? column.prop ?? ''),
    }),
    cellProperties: ({ value }: { value: unknown }) => ({
      value: value == null ? '' : String(value),
      type: String,
      ...EXCEL_TEXT_CELL_STYLE,
    }),
  };
}

function createNumericExcelExport(column: ColumnRegular, format: string) {
  return {
    ...createBaseExcelExport(column),
    cellProperties: ({ value }: { value: unknown }) => {
      const numeric = parseNumber(value);
      if (numeric === undefined) {
        return {
          value: String(value ?? ''),
          type: String,
          ...EXCEL_TEXT_CELL_STYLE,
        };
      }
      return {
        value: numeric,
        type: Number,
        format,
        ...EXCEL_NUMERIC_CELL_STYLE,
      };
    },
  };
}

function createBadgeExcelCell({
  value,
  backgroundColor = '#f8fafc',
  textColor = '#334155',
}: {
  value: string;
  backgroundColor?: string;
  textColor?: string;
}) {
  return {
    value,
    type: String,
    ...EXCEL_TEXT_CELL_STYLE,
    backgroundColor,
    textColor,
    fontWeight: 'bold' as const,
    align: 'center' as const,
  };
}

function styleEcommerceExcelHeaders(
  context: Parameters<ExcelExportContextTransformer>[0],
) {
  context.cellRows = context.cellRows.map((row, rowIndex) => {
    if (rowIndex >= context.headerRowsCount) {
      return row;
    }
    const style = rowIndex === 0 && context.headerRowsCount > 1
      ? EXCEL_GROUP_HEADER_STYLE
      : EXCEL_HEADER_STYLE;
    return row.map((cell) => styleExcelHeaderCell(cell, style));
  });
}

function styleExcelHeaderCell(
  cell: ExcelExportCellData,
  style: typeof EXCEL_HEADER_STYLE,
): ExcelExportCellData {
  if (!cell || typeof cell !== 'object' || cell instanceof Date || Array.isArray(cell)) {
    return cell;
  }
  return {
    ...style,
    ...cell,
    value: cell.value,
  };
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  const parsed = Number.parseFloat(String(value).replace(/[$,%\s,]/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function renderAnalyticsStars(h: HyperFunc<VNode>, { value }: any) {
  const numericValue = Number(value) || 0;
  const filled = Math.round(numericValue);
  return h(
    'span',
    { class: 'analytics-stars', title: `${numericValue.toFixed(1)} rating` },
    [
      ...Array.from({ length: 5 }, (_, index) =>
        h('span', {
          class:
            index < filled
              ? 'analytics-star analytics-star--filled'
              : 'analytics-star',
        }),
      ),
      h('strong', null, numericValue.toFixed(1)),
    ],
  );
}

function renderAnalyticsChange(
  h: HyperFunc<VNode>,
  { value, model, column }: any,
) {
  const rawValue = Number(model?.[column.prop]) || Number(value) || 0;
  const positive = rawValue >= 0;
  return h(
    'span',
    { class: `analytics-change analytics-change--${positive ? 'up' : 'down'}` },
    [
      h(
        'span',
        { class: 'analytics-change__bar' },
        h('span', {
          style: { width: `${Math.min(100, Math.abs(rawValue) * 100)}%` },
        }),
      ),
      h('strong', null, `${positive ? '+' : ''}${(rawValue * 100).toFixed(1)}%`),
    ],
  );
}

function formatCurrency(value: unknown) {
  const numericValue = Number.parseFloat(String(value).replace(/[$,]/g, ''));
  if (!Number.isFinite(numericValue)) return String(value ?? '');
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(numericValue);
}

type ParsedFilterToken =
  | { kind: 'condition'; field: string; operator: string; value: string }
  | { kind: 'relation'; relation: 'and' | 'or' };

function parseToolbarExpression(expression: string): ParsedFilterToken[] {
  return expression
    .split(/\s+(and|or)\s+/i)
    .filter(Boolean)
    .map((part) => {
      const relation = part.trim().toLowerCase();
      if (relation === 'and' || relation === 'or') {
        return { kind: 'relation', relation } as ParsedFilterToken;
      }

      const match = part.match(
        /^\s*(.+?)\s+(eq|equals|=|neq|not\s+eq|!=|contains|notcontains|not\s+contains|gt|gte|lt|lte|>|>=|<|<=)\s+(.+?)\s*$/i,
      );
      if (!match) return null;

      return {
        kind: 'condition',
        field: normalizeFieldName(match[1]),
        operator: match[2].toLowerCase().replace(/\s+/g, ''),
        value: stripQuotes(match[3]),
      } as ParsedFilterToken;
    })
    .filter((token): token is ParsedFilterToken => Boolean(token));
}

function evaluateToolbarExpression(row: any, tokens: ParsedFilterToken[]) {
  let result: boolean | null = null;
  let relation: 'and' | 'or' = 'and';

  for (const token of tokens) {
    if (token.kind === 'relation') {
      relation = token.relation;
      continue;
    }

    const next = matchesCondition(row, token);
    result =
      result === null ? next : relation === 'or' ? result || next : result && next;
  }

  return result ?? true;
}

function matchesCondition(
  row: any,
  token: Extract<ParsedFilterToken, { kind: 'condition' }>,
) {
  const actual = getFieldValue(row, token.field);
  const actualText = normalizeSearch(actual);
  const expectedText = normalizeSearch(token.value);
  const actualNumber = Number.parseFloat(String(actual).replace(/[$,%\s,]/g, ''));
  const expectedNumber = Number.parseFloat(
    String(token.value).replace(/[$,%\s,]/g, ''),
  );

  switch (token.operator) {
    case 'eq':
    case 'equals':
    case '=':
      return actualText === expectedText;
    case 'neq':
    case 'noteq':
    case '!=':
      return actualText !== expectedText;
    case 'contains':
      return actualText.includes(expectedText);
    case 'notcontains':
      return !actualText.includes(expectedText);
    case 'gt':
    case '>':
      return (
        Number.isFinite(actualNumber) &&
        Number.isFinite(expectedNumber) &&
        actualNumber > expectedNumber
      );
    case 'gte':
    case '>=':
      return (
        Number.isFinite(actualNumber) &&
        Number.isFinite(expectedNumber) &&
        actualNumber >= expectedNumber
      );
    case 'lt':
    case '<':
      return (
        Number.isFinite(actualNumber) &&
        Number.isFinite(expectedNumber) &&
        actualNumber < expectedNumber
      );
    case 'lte':
    case '<=':
      return (
        Number.isFinite(actualNumber) &&
        Number.isFinite(expectedNumber) &&
        actualNumber <= expectedNumber
      );
    default:
      return actualText.includes(expectedText);
  }
}

function getFieldValue(row: any, field: string) {
  const exactKey = Object.keys(row).find((key) => normalizeFieldName(key) === field);
  return exactKey ? row[exactKey] : '';
}

function normalizeFieldName(value: unknown) {
  return String(value).trim().toLowerCase();
}

function normalizeSearch(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function stripQuotes(value: string) {
  return value.trim().replace(/^["']|["']$/g, '');
}
