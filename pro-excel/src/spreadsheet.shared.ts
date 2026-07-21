import {
  FilterPlugin,
  getSourcePhysicalIndex,
  isGrouping,
  type CellTemplate,
  type BeforeSaveDataDetails,
  type Cell,
  type CellProps,
  type CellTemplateProp,
  type ColumnData,
  type ColumnGrouping,
  type ColumnProp,
  type ColumnRegular,
  type ColumnTemplateProp,
  type DataType,
  type DimensionCols,
  type DimensionRows,
  type FilterCollectionItem,
  type MultiFilterItem,
  type RangeArea,
  type RowHeaders,
} from '@revolist/revogrid';
import {
  createFormulaConditionalCellProperties,
  cellFlashArrowTemplate,
  columnTypeRenderer,
  createNamedRangeDropdown,
  progressLineWithValueRenderer,
  rowHeaders,
  sparklineRenderer,
  validationRenderer,
  type ColumnContextMenuOpenContext,
  type ColumnCollapsePlaceholder,
  type ContextMenuActionContext,
  type ContextMenuColumnGroup,
  type ContextMenuConfig,
  type ContextMenuItem,
  type ExportExcelEvent,
  type AutoFillStrategy,
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
import fileImportIcon from '@fortawesome/fontawesome-free/svgs/solid/file-import.svg?raw';
import magnifyingGlassIcon from '@fortawesome/fontawesome-free/svgs/solid/magnifying-glass.svg?raw';
import pasteIcon from '@fortawesome/fontawesome-free/svgs/solid/paste.svg?raw';
import scissorsIcon from '@fortawesome/fontawesome-free/svgs/solid/scissors.svg?raw';
import tableColumnsIcon from '@fortawesome/fontawesome-free/svgs/solid/table-columns.svg?raw';
import thumbtackIcon from '@fortawesome/fontawesome-free/svgs/solid/thumbtack.svg?raw';
import trashIcon from '@fortawesome/fontawesome-free/svgs/solid/trash.svg?raw';
import wandMagicSparklesIcon from '@fortawesome/fontawesome-free/svgs/solid/wand-magic-sparkles.svg?raw';
import xmarkIcon from '@fortawesome/fontawesome-free/svgs/solid/xmark.svg?raw';

export type SpreadsheetPreviewMode = 'smart-fill' | 'copy-preview';

export const SPREADSHEET_ACTION_ICONS = {
  reset: arrowsRotateIcon,
  newWorkbook: fileCirclePlusIcon,
  import: fileImportIcon,
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

export type SpreadsheetRow = DataType & {
  id: number;
  department: string;
  owner: string;
  jan: number;
  feb: number;
  mar: number;
  total: string;
  target: number;
  variance: string;
  margin: string;
  trend: number;
  status: string;
};

export type SpreadsheetBaseRow = {
  department: string;
  owner: string;
  jan: number;
  feb: number;
  mar: number;
  target: number;
  status: string;
};

export const SPREADSHEET_SHEETS = [
  { key: 'budget', label: 'Budget', description: 'Approved Q1 operating plan' },
  { key: 'stretch', label: 'Stretch plan', description: 'Higher target scenario' },
  { key: 'pipeline', label: 'Pipeline risk', description: 'Conservative close-rate scenario' },
] as const;

export type SpreadsheetSheetKey = typeof SPREADSHEET_SHEETS[number]['key'];
export type SpreadsheetWorkbookKey = SpreadsheetSheetKey | 'empty' | 'imported';

export type SpreadsheetInsight = {
  label: string;
  value: string;
  tone: 'neutral' | 'positive' | 'negative' | 'warning';
};

export type SpreadsheetWorkbook = {
  rows: DataType[];
  columns: ColumnData;
  pinnedBottomSource: DataType[];
  formulaNames: FormulaNamesConfig;
  cellMerge: MergeData[];
  imported: boolean;
  name: string;
  sheetKey: SpreadsheetWorkbookKey;
};

export type SpreadsheetXlsxReader = (file: File) => Promise<unknown[][]>;

export type SpreadsheetFormulaTokenType =
  | 'plain'
  | 'function'
  | 'reference'
  | 'number'
  | 'operator'
  | 'string'
  | 'name'
  | 'punctuation';

export type SpreadsheetFormulaToken = {
  type: SpreadsheetFormulaTokenType;
  value: string;
};

type SpreadsheetHeaderIconType = 'string' | 'currency' | 'decimal';

export type SpreadsheetContextMenuController = {
  getGrid: () => HTMLRevoGridElement | null | undefined;
  getWorkbook?: () => SpreadsheetWorkbook;
  setWorkbook?: (workbook: SpreadsheetWorkbook) => void;
  setClipboardStatus?: (message: string) => void;
  resetWorkbook?: () => void;
  exportWorkbook?: () => void | Promise<void>;
};

export type SpreadsheetFlashPlugin = {
  flashCells?: (
    detail: {
      type: 'rgRow';
      data: Record<number, Record<string, unknown>>;
      previousData?: Record<number, Record<string, unknown>>;
      eventTypes?: string[];
    },
    options?: {
      mode?: 'cell' | 'row' | 'cell-and-row';
      duration?: number;
      rowDuration?: number;
    },
  ) => void;
};

export function createSpreadsheetWorkbookFromGridSource(
  workbook: SpreadsheetWorkbook,
  rows?: DataType[],
): SpreadsheetWorkbook {
  if (!rows) {
    return workbook;
  }
  return {
    ...workbook,
    rows: [...rows],
    pinnedBottomSource: workbook.imported || workbook.sheetKey === 'empty'
      ? []
      : createSpreadsheetPinnedBottomSource(rows),
  };
}

export function createSpreadsheetEditCellKey(
  rowIndex: number,
  prop: string,
  rowType: string = 'rgRow',
): string {
  return `${rowType}:${rowIndex}:${prop}`;
}

export function isSpreadsheetDarkTheme(doc = typeof document !== 'undefined' ? document : undefined): boolean {
  const root = doc?.documentElement;
  return root?.getAttribute('data-theme') === 'dark' || Boolean(root?.classList.contains('dark'));
}

export function getSpreadsheetGridTheme(isDark = isSpreadsheetDarkTheme()): HTMLRevoGridElement['theme'] {
  return isDark ? 'dark' : 'default';
}

export function observeSpreadsheetTheme(
  onChange: (isDark: boolean) => void,
  doc = typeof document !== 'undefined' ? document : undefined,
) {
  onChange(isSpreadsheetDarkTheme(doc));
  const root = doc?.documentElement;
  if (!root || typeof MutationObserver === 'undefined') {
    return () => {};
  }

  const observer = new MutationObserver(() => {
    onChange(isSpreadsheetDarkTheme(doc));
  });
  observer.observe(root, {
    attributes: true,
    attributeFilter: ['data-theme', 'class'],
  });

  return () => observer.disconnect();
}

export const SPREADSHEET_WORKBOOK_NAME = 'RevoGrid Spreadsheet Workbench';
export const SPREADSHEET_DEMO_ID = 'spreadsheet-workbench';
export const SPREADSHEET_EXPORT_CONFIG: ExportExcelEvent = {
  sheetName: 'Spreadsheet Workbench',
  workbookName: 'revogrid-spreadsheet-workbench.xlsx',
};
export const SPREADSHEET_BASE_PLUGIN_LABELS = [
  'EventManagerPlugin',
  'HistoryPlugin',
  'CellFlashPlugin',
  'CollaborativePresencePlugin',
  'FormulaBarPlugin',
  'FormulaDependencyHighlightPlugin',
  'NamedRangesPlugin',
  'FormulaPlugin',
  'MultiRangeSelectionPlugin',
  'RowHeaderPlugin',
  'RowOrderPlugin',
  'ColumnMoveAdvancedPlugin',
  'ColumnCollapsePlugin',
  'ClipboardJsonPlugin',
  'ContextMenuPlugin',
  'ExportExcelPlugin',
  'AdvanceFilterPlugin',
  'FilterHeaderPlugin',
  'CellValidatePlugin',
  'CellMergePlugin',
  'SameValueMergePlugin',
  'TooltipPlugin',
  'ColumnHidePlugin',
  'ColumnStretchPlugin',
] as const;

export const SPREADSHEET_ROW_ORDER_CONFIG = {
  prop: 'department',
  preview: 'compact' as const,
  validateDrop: ({ type }: { type?: string }) => (
    type === 'rgRow'
      ? { valid: true as const }
      : { valid: false as const, reason: 'Pinned totals stay fixed.' }
  ),
};

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const PERCENT_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
});

const STATUS_VALUES = ['Committed', 'Forecast', 'Watch', 'Blocked'];
const DEPARTMENT_VALUES = [
  'Marketing',
  'Sales',
  'Support',
  'Research',
  'Operations',
  'Finance',
  'Platform',
  'Services',
];

const BASE_ROWS: SpreadsheetBaseRow[] = [
  { department: 'Marketing', owner: 'Avery Stone', jan: 128000, feb: 135000, mar: 149000, target: 395000, status: 'Forecast' },
  { department: 'Marketing', owner: 'Noah Reed', jan: 91000, feb: 98000, mar: 108000, target: 285000, status: 'Committed' },
  { department: 'Sales', owner: 'Riley Chen', jan: 188000, feb: 203000, mar: 226000, target: 610000, status: 'Committed' },
  { department: 'Sales', owner: 'Quinn Hart', jan: 155000, feb: 168000, mar: 181000, target: 525000, status: 'Watch' },
  { department: 'Platform', owner: 'Drew Wilson', jan: 146000, feb: 155000, mar: 166000, target: 452000, status: 'Forecast' },
  { department: 'Platform', owner: 'Kai Bell', jan: 132000, feb: 141000, mar: 153000, target: 405000, status: 'Committed' },
  { department: 'Support', owner: 'Morgan Lee', jan: 78000, feb: 84000, mar: 91000, target: 240000, status: 'Watch' },
  { department: 'Support', owner: 'Jamie Fox', jan: 69000, feb: 73000, mar: 76000, target: 215000, status: 'Forecast' },
  { department: 'Research', owner: 'Jordan Miles', jan: 96000, feb: 103000, mar: 114000, target: 330000, status: 'Forecast' },
  { department: 'Services', owner: 'Sam Rivera', jan: 83000, feb: 92000, mar: 99000, target: 282000, status: 'Blocked' },
  { department: 'Operations', owner: 'Taylor Brooks', jan: 64000, feb: 68000, mar: 73000, target: 198000, status: 'Committed' },
  { department: 'Finance', owner: 'Casey Patel', jan: 52000, feb: 57000, mar: 62000, target: 180000, status: 'Watch' },
  { department: 'Marketing', owner: 'Blake Turner', jan: 104000, feb: 111000, mar: 122000, target: 345000, status: 'Forecast' },
  { department: 'Sales', owner: 'Alex Morgan', jan: 172000, feb: 185000, mar: 197000, target: 570000, status: 'Committed' },
  { department: 'Platform', owner: 'Dana Kim', jan: 119000, feb: 127000, mar: 138000, target: 380000, status: 'Watch' },
  { department: 'Support', owner: 'Jesse Park', jan: 61000, feb: 66000, mar: 71000, target: 195000, status: 'Committed' },
  { department: 'Research', owner: 'Rowan Ellis', jan: 88000, feb: 94000, mar: 103000, target: 295000, status: 'Forecast' },
  { department: 'Finance', owner: 'Skyler Webb', jan: 47000, feb: 51000, mar: 56000, target: 162000, status: 'Committed' },
  { department: 'Services', owner: 'Cameron Ross', jan: 76000, feb: 82000, mar: 89000, target: 255000, status: 'Watch' },
  { department: 'Operations', owner: 'Reese Grant', jan: 58000, feb: 63000, mar: 68000, target: 185000, status: 'Forecast' },
  { department: 'Sales', owner: 'Avery Quinn', jan: 161000, feb: 174000, mar: 188000, target: 535000, status: 'Forecast' },
  { department: 'Marketing', owner: 'Phoenix Hall', jan: 97000, feb: 105000, mar: 114000, target: 320000, status: 'Watch' },
  { department: 'Platform', owner: 'River Nash', jan: 125000, feb: 134000, mar: 145000, target: 415000, status: 'Committed' },
  { department: 'Research', owner: 'Hayden Cruz', jan: 79000, feb: 86000, mar: 94000, target: 268000, status: 'Blocked' },
  { department: 'Support', owner: 'Finley Shaw', jan: 53000, feb: 57000, mar: 62000, target: 172000, status: 'Watch' },
  { department: 'Finance', owner: 'Emery Cole', jan: 44000, feb: 48000, mar: 52000, target: 152000, status: 'Forecast' },
  { department: 'Services', owner: 'Sage Burton', jan: 71000, feb: 78000, mar: 85000, target: 240000, status: 'Committed' },
  { department: 'Operations', owner: 'Harley Wade', jan: 67000, feb: 72000, mar: 78000, target: 210000, status: 'Watch' },
  { department: 'Marketing', owner: 'Kendall Price', jan: 115000, feb: 123000, mar: 134000, target: 370000, status: 'Committed' },
  { department: 'Sales', owner: 'Marlowe Cross', jan: 144000, feb: 157000, mar: 169000, target: 490000, status: 'Watch' },
  { department: 'Platform', owner: 'Elliot Hayes', jan: 138000, feb: 147000, mar: 158000, target: 440000, status: 'Forecast' },
  { department: 'Research', owner: 'Peyton Ford', jan: 92000, feb: 99000, mar: 108000, target: 310000, status: 'Committed' },
  { department: 'Support', owner: 'Lennon Ward', jan: 57000, feb: 61000, mar: 66000, target: 182000, status: 'Forecast' },
  { department: 'Finance', owner: 'Indigo Ray', jan: 49000, feb: 54000, mar: 59000, target: 170000, status: 'Watch' },
  { department: 'Services', owner: 'Zephyr Hunt', jan: 80000, feb: 87000, mar: 94000, target: 268000, status: 'Blocked' },
  { department: 'Operations', owner: 'Briar Stone', jan: 72000, feb: 77000, mar: 83000, target: 225000, status: 'Committed' },
  { department: 'Sales', owner: 'Cleo Marsh', jan: 133000, feb: 145000, mar: 158000, target: 450000, status: 'Committed' },
  { department: 'Marketing', owner: 'Remy Walsh', jan: 87000, feb: 93000, mar: 101000, target: 285000, status: 'Forecast' },
  { department: 'Research', owner: 'Wren Summers', jan: 74000, feb: 80000, mar: 88000, target: 255000, status: 'Watch' },
  { department: 'Operations', owner: 'Luca Vance', jan: 60000, feb: 65000, mar: 70000, target: 192000, status: 'Blocked' },
];

export function getSpreadsheetSheetLabel(sheetKey: SpreadsheetSheetKey) {
  return SPREADSHEET_SHEETS.find(sheet => sheet.key === sheetKey)?.label ?? 'Budget';
}

function createSpreadsheetScenarioRow(
  row: SpreadsheetBaseRow,
  index: number,
  sheetKey: SpreadsheetSheetKey,
): SpreadsheetBaseRow {
  if (sheetKey === 'stretch') {
    const lift = 1.05 + (index % 3) * 0.015;
    return {
      ...row,
      jan: roundMoney(row.jan * lift),
      feb: roundMoney(row.feb * (lift + 0.015)),
      mar: roundMoney(row.mar * (lift + 0.03)),
      target: roundMoney(row.target * 1.08),
      status: row.status === 'Blocked' ? 'Watch' : 'Forecast',
    };
  }

  if (sheetKey === 'pipeline') {
    const risk = 0.88 + (index % 4) * 0.025;
    return {
      ...row,
      jan: roundMoney(row.jan * risk),
      feb: roundMoney(row.feb * (risk + 0.03)),
      mar: roundMoney(row.mar * (risk + 0.055)),
      target: roundMoney(row.target * 1.02),
      status: index % 5 === 0 ? 'Blocked' : index % 2 === 0 ? 'Watch' : 'Forecast',
    };
  }

  return { ...row };
}

function roundMoney(value: number) {
  return Math.round(value / 1000) * 1000;
}

function rowNumber(index: number) {
  return index + 1;
}

export function createSpreadsheetScenarioFormulaRow(row: SpreadsheetBaseRow & { id: number }, index: number): SpreadsheetRow {
  const n = rowNumber(index);
  return {
    ...row,
    total: `=SUM(C${n}:E${n})`,
    variance: `=F${n}-G${n}`,
    margin: `=IF(G${n}=0,0,F${n}/G${n})`,
    trend: row.jan ? (row.mar - row.jan) / row.jan : 0,
  };
}

export function createSpreadsheetRows(sheetKey: SpreadsheetSheetKey = 'budget'): SpreadsheetRow[] {
  return BASE_ROWS.map((row, index) => createSpreadsheetScenarioFormulaRow({
    id: index + 1,
    ...createSpreadsheetScenarioRow(row, index, sheetKey),
  }, index));
}

export function createSpreadsheetFormulaNames(rows: DataType[]): FormulaNamesConfig {
  const lastRow = Math.max(rows.length, 1);
  return {
    rowIdProp: 'id',
    names: [
      { name: 'Actuals', scope: 'workbook', kind: 'range', ref: `C1:E${lastRow}` },
      { name: 'QuarterTotals', scope: 'workbook', kind: 'range', ref: `F1:F${lastRow}` },
      { name: 'Targets', scope: 'workbook', kind: 'range', ref: `G1:G${lastRow}` },
      { name: 'StatusList', scope: 'workbook', kind: 'range', ref: `K1:K${Math.min(lastRow, 4)}` },
      { name: 'DepartmentList', scope: 'workbook', kind: 'range', ref: `A1:A${Math.min(lastRow, 8)}` },
      { name: 'StretchTarget', scope: 'workbook', kind: 'constant', value: 1.08 },
      { name: 'PortfolioTotal', scope: 'workbook', kind: 'formula', value: '=SUM(QuarterTotals)' },
    ],
  };
}

function createImportedSpreadsheetFormulaNames(): FormulaNamesConfig {
  return {
    rowIdProp: 'id',
    names: [],
  };
}

export function createSpreadsheetPinnedBottomSource(rows: DataType[]): DataType[] {
  if (!rows.length) {
    return [];
  }
  const lastRow = rows.length;
  const totalRow = lastRow + 1;
  return [
    {
      department: `Total - ${lastRow} row${lastRow > 1 ? 's' : ''}`,
      owner: '',
      jan: `=SUM(C1:C${lastRow})`,
      feb: `=SUM(D1:D${lastRow})`,
      mar: `=SUM(E1:E${lastRow})`,
      total: `=SUM(F1:F${lastRow})`,
      target: `=SUM(G1:G${lastRow})`,
      variance: `=F${totalRow}-G${totalRow}`,
      margin: `=IF(G${totalRow}=0,0,F${totalRow}/G${totalRow})`,
      trend: 0,
      status: 'Live formulas',
    },
  ];
}

export function createSpreadsheetCellMerge(rows: DataType[], imported = false): MergeData[] {
  if (imported || !rows.length) {
    return [];
  }
  return [
    {
      row: 0,
      column: 0,
      rowType: 'rowPinEnd',
      colType: 'colPinStart',
      colSpan: 2,
    },
  ];
}

export function createSpreadsheetColumns(rows: DataType[], formulaNames = createSpreadsheetFormulaNames(rows)): ColumnData {
  const columns: ColumnRegular[] = [
    {
      name: 'Department',
      prop: 'department',
      size: 120,
      merge: true,
      columnType: 'departmentDropdown',
      spreadsheetHeaderIconType: 'string',
      filter: ['selection'],
      flash: true,
      cellTemplate: departmentTemplate,
      cellProperties: () => ({ class: 'spreadsheet-cell-department' }),
    },
    {
      name: 'Owner',
      prop: 'owner',
      size: 140,
      spreadsheetHeaderIconType: 'string',
      filter: 'input',
      flash: true,
    },
    currencyColumn('Jan', 'jan'),
    currencyColumn('Feb', 'feb'),
    currencyColumn('Mar', 'mar'),
    {
      name: 'Q1',
      prop: 'total',
      size: 130,
      readonly: true,
      sealed: true,
      flash: true,
      spreadsheetHeaderIconType: 'currency',
      cellTemplate: currencyTemplate,
      cellProperties: createReadonlySpreadsheetNumberCellProperties(),
    },
    currencyColumn('Target', 'target', 125),
    {
      name: 'Variance',
      prop: 'variance',
      size: 130,
      readonly: true,
      flash: true,
      spreadsheetHeaderIconType: 'currency',
      cellTemplate: signedCurrencyTemplate,
    },
    {
      name: 'Margin',
      prop: 'margin',
      size: 110,
      readonly: true,
      flash: true,
      spreadsheetHeaderIconType: 'decimal',
      minValue: 90,
      maxValue: 110,
      thresholds: [
        { value: 102, className: 'high' },
        { value: 98, className: 'medium' },
        { value: 0, className: 'low' },
      ],
      cellTemplate: marginTemplate,
      cellProperties: createReadonlySpreadsheetNumberCellProperties(),
    },
    {
      name: 'Q1',
      prop: 'trend',
      size: 118,
      readonly: true,
      flash: true,
      spreadsheetHeaderIconType: 'decimal',
      minValue: 0,
      maxValue: 650000,
      thresholds: [
        { value: 420000, className: 'high' },
        { value: 240000, className: 'medium' },
        { value: 0, className: 'low' },
      ],
      cellTemplate: trendTemplate,
      cellProperties: createReadonlySpreadsheetNumberCellProperties(),
    },
    {
      name: 'Status',
      prop: 'status',
      size: 135,
      columnType: 'statusDropdown',
      spreadsheetHeaderIconType: 'string',
      filter: ['selection'],
      flash: true,
    },
  ];

  [columns[2], columns[3], columns[4]].forEach((column) => {
    column.columnProperties = createSpreadsheetHeaderProperties('spreadsheet-header-leaf-actual', column.columnProperties);
  });
  [columns[5], columns[9]].forEach((column) => {
    column.columnProperties = createSpreadsheetHeaderProperties('spreadsheet-header-leaf-q1', column.columnProperties);
  });

  columns[7].cellProperties = createReadonlySpreadsheetNumberCellProperties(createFormulaConditionalCellProperties(
    '=cellvalue<0',
    { class: 'spreadsheet-cell-negative' },
    { allSources: rows, columns, names: formulaNames.names },
  ));

  const departmentDropdown = createNamedRangeDropdown('DepartmentList', {
    allSources: rows,
    columns,
    names: formulaNames.names,
    label: value => String(value),
  }, {
    renderOption: (h, option) => departmentTemplate(h, { value: option.value }),
    renderSelectedValue: (h, selectedOptions, children) => (
      selectedOptions.length
        ? departmentTemplate(h, { value: selectedOptions[0]?.value })
        : children
    ),
  });
  const statusDropdown = createNamedRangeDropdown('StatusList', {
    allSources: rows,
    columns,
    names: formulaNames.names,
    label: value => String(value),
  }, {
    renderOption: (h, option) => statusTemplate(h, { value: option.value }),
    renderSelectedValue: (h, selectedOptions, children) => (
      selectedOptions.length
        ? statusTemplate(h, { value: selectedOptions[0]?.value })
        : children
    ),
  });

  (columns[0] as ColumnRegular & { dropdown?: unknown }).dropdown = mergeDropdownOptions(
    departmentDropdown,
    DEPARTMENT_VALUES,
  );
  (columns[10] as ColumnRegular & { dropdown?: unknown }).dropdown = mergeDropdownOptions(
    statusDropdown,
    STATUS_VALUES,
  );
  return createSpreadsheetColumnGroups(columns.map(column => ({
    ...column,
    columnTemplate: createSpreadsheetHeaderTypeTemplate(column.spreadsheetHeaderIconType ?? 'string'),
    columnProperties: createSpreadsheetHeaderProperties('spreadsheet-header-leaf', column.columnProperties),
  })));
}

function createEmptySpreadsheetColumns(columnCount: number): ColumnData {
  return Array.from({ length: columnCount }, (_, index): ColumnRegular => ({
    name: formatSpreadsheetColumnName(index),
    prop: `col${index + 1}`,
    size: index < 2 ? 140 : 118,
    filter: 'input',
    flash: true,
    columnTemplate: createSpreadsheetHeaderTypeTemplate('string'),
    columnProperties: createSpreadsheetHeaderProperties('spreadsheet-header-leaf'),
  }));
}

function createEmptySpreadsheetRows(rowCount: number, columns: ColumnData): DataType[] {
  const leafColumns = getSpreadsheetLeafColumns(columns);
  return Array.from({ length: rowCount }, (_, rowIndex) => {
    const row: DataType = { id: rowIndex + 1 };
    leafColumns.forEach((column) => {
      row[column.prop] = '';
    });
    return row;
  });
}

function formatSpreadsheetColumnName(index: number) {
  let remaining = index + 1;
  let label = '';
  while (remaining > 0) {
    const offset = (remaining - 1) % 26;
    label = String.fromCharCode(65 + offset) + label;
    remaining = Math.floor((remaining - offset - 1) / 26);
  }
  return label;
}

export function createSpreadsheetWorkbook(sheetKey: SpreadsheetSheetKey = 'budget'): SpreadsheetWorkbook {
  const rows = createSpreadsheetRows(sheetKey);
  const formulaNames = createSpreadsheetFormulaNames(rows);
  return {
    rows,
    formulaNames,
    columns: createSpreadsheetColumns(rows, formulaNames),
    pinnedBottomSource: createSpreadsheetPinnedBottomSource(rows),
    cellMerge: createSpreadsheetCellMerge(rows),
    imported: false,
    name: getSpreadsheetSheetLabel(sheetKey),
    sheetKey,
  };
}

export function createEmptySpreadsheetWorkbook(rowCount = 25, columnCount = 8): SpreadsheetWorkbook {
  const columns = createEmptySpreadsheetColumns(columnCount);
  const rows = createEmptySpreadsheetRows(rowCount, columns);
  return {
    rows,
    columns,
    pinnedBottomSource: [],
    formulaNames: createImportedSpreadsheetFormulaNames(),
    cellMerge: [],
    imported: false,
    name: 'Blank workbook',
    sheetKey: 'empty',
  };
}

const SPREADSHEET_FORMULA_TOKEN_PATTERN = /("(?:[^"]|"")*"|'(?:[^']|'')*'|\$?[A-Za-z]{1,3}\$?[1-9][0-9]*(?::\$?[A-Za-z]{1,3}\$?[1-9][0-9]*)?|[A-Za-z_\\][A-Za-z0-9_.\\]*(?=\s*\()|[A-Za-z_\\][A-Za-z0-9_.\\]*|\d+(?:\.\d+)?%?|[+\-*/^&=<>]+|[(),:])/g;

export function tokenizeSpreadsheetFormula(value: string): SpreadsheetFormulaToken[] {
  if (!value) {
    return [];
  }

  const tokens: SpreadsheetFormulaToken[] = [];
  let index = 0;
  for (const match of value.matchAll(SPREADSHEET_FORMULA_TOKEN_PATTERN)) {
    const token = match[0];
    const start = match.index ?? 0;
    if (start > index) {
      tokens.push({ type: 'plain', value: value.slice(index, start) });
    }
    tokens.push({ type: getSpreadsheetFormulaTokenType(token, value, start + token.length), value: token });
    index = start + token.length;
  }
  if (index < value.length) {
    tokens.push({ type: 'plain', value: value.slice(index) });
  }
  return tokens;
}

export function installSpreadsheetFormulaEditorHighlight(
  input: HTMLInputElement,
  overlay: HTMLElement,
  grid?: HTMLRevoGridElement | null,
) {
  // Keep a read-only syntax overlay in sync with the native input so selection,
  // keyboard editing, and FormulaBarPlugin ownership stay unchanged.
  const render = () => {
    renderSpreadsheetFormulaHighlight(overlay, input.value);
    overlay.parentElement?.classList.toggle('is-readonly', input.disabled);
  };
  const onFormulaBarChange = () => {
    window.requestAnimationFrame(render);
  };

  input.addEventListener('input', render);
  input.addEventListener('change', render);
  grid?.addEventListener('formulabarchange', onFormulaBarChange);
  window.requestAnimationFrame(render);

  return () => {
    input.removeEventListener('input', render);
    input.removeEventListener('change', render);
    grid?.removeEventListener('formulabarchange', onFormulaBarChange);
  };
}

function renderSpreadsheetFormulaHighlight(overlay: HTMLElement, value: string) {
  overlay.replaceChildren(...tokenizeSpreadsheetFormula(value).map((token) => {
    const span = document.createElement('span');
    span.className = `spreadsheet-formula-token spreadsheet-formula-token-${token.type}`;
    span.textContent = token.value;
    return span;
  }));
}

function getSpreadsheetFormulaTokenType(token: string, source: string, endIndex: number): SpreadsheetFormulaTokenType {
  if (/^["']/.test(token)) {
    return 'string';
  }
  if (/^\$?[A-Za-z]{1,3}\$?[1-9][0-9]*(?::\$?[A-Za-z]{1,3}\$?[1-9][0-9]*)?$/.test(token)) {
    return 'reference';
  }
  if (/^\d/.test(token)) {
    return 'number';
  }
  if (/^[+\-*/^&=<>]+$/.test(token)) {
    return 'operator';
  }
  if (/^[(),:]$/.test(token)) {
    return 'punctuation';
  }
  if (/^[A-Za-z_\\][A-Za-z0-9_.\\]*$/.test(token)) {
    return source.slice(endIndex).trimStart().startsWith('(') ? 'function' : 'name';
  }
  return 'plain';
}

export function getSpreadsheetPluginLabels(previewMode: SpreadsheetPreviewMode = 'smart-fill'): string[] {
  return [
    ...SPREADSHEET_BASE_PLUGIN_LABELS.slice(0, 8),
    ...(previewMode === 'smart-fill'
      ? ['AutoFillPlugin', 'AutoFillPreviewPlugin']
      : ['RangeCopyPreviewPlugin']),
    ...SPREADSHEET_BASE_PLUGIN_LABELS.slice(8),
  ];
}

export function createSpreadsheetDisplayColumns(
  workbook: SpreadsheetWorkbook,
  options: { freezePane?: boolean; searchQuery?: string } = {},
): ColumnData {
  const frozenColumns = options.freezePane !== false
    ? setSpreadsheetFreezePane(workbook.columns, true)
    : workbook.columns;
  return applySpreadsheetSearchHighlight(frozenColumns, options.searchQuery ?? '');
}

export function createSpreadsheetRowHeaders(): RowHeaders {
  return {
    ...rowHeaders({
      showHeaderFocusBtn: false,
      rowDrag: ({ type }) => type === 'rgRow',
    }),
    size: 48,
  };
}

export async function installSpreadsheetAutofillStrategy(grid: HTMLRevoGridElement | null | undefined) {
  const plugins = await grid?.getPlugins?.();
  const autofillPlugin = plugins?.find(plugin => (
    plugin?.constructor?.name === 'AutoFillPlugin'
    && typeof (plugin as { registerStrategy?: unknown }).registerStrategy === 'function'
  )) as { registerStrategy: (strategy: AutoFillStrategy) => void } | undefined;

  if (!autofillPlugin || registeredSpreadsheetAutofillPlugins.has(autofillPlugin)) {
    return;
  }

  autofillPlugin.registerStrategy(spreadsheetCurrencyCopyAutofillStrategy);
  registeredSpreadsheetAutofillPlugins.add(autofillPlugin);
}

const spreadsheetCurrencyCopyAutofillStrategy: AutoFillStrategy = (
  selectedData,
  _direction,
  targetRange,
  context,
) => {
  if (!context) {
    return null;
  }

  const sourceColumns = getSpreadsheetAutofillColumns(context.oldRange, context);
  const targetColumns = getSpreadsheetAutofillColumns(context.newRange, context);
  const allColumns = [...sourceColumns, ...targetColumns];
  if (!allColumns.length || !allColumns.every(column => SPREADSHEET_AUTOFILL_CURRENCY_PROPS.has(column.prop))) {
    return null;
  }

  // Budget actuals are currency inputs. Copy raw numeric values instead of
  // treating month values as an arithmetic sequence.
  return repeatSpreadsheetMatrix(selectedData, targetRange);
};

function getSpreadsheetAutofillColumns(
  range: RangeArea,
  context: NonNullable<Parameters<AutoFillStrategy>[3]>,
): ColumnRegular[] {
  const columns: ColumnRegular[] = [];
  for (let x = range.x; x <= range.x1; x += 1) {
    const column = context.providers.column.getColumn(x, context.colType) as ColumnRegular | undefined;
    if (column) {
      columns.push(column);
    }
  }
  return columns;
}

function repeatSpreadsheetMatrix<T>(selectedData: T[][], targetRange: RangeArea): T[][] {
  const values = selectedData.flat();
  if (!values.length) {
    return [];
  }

  const rows = targetRange.y1 - targetRange.y + 1;
  const cols = targetRange.x1 - targetRange.x + 1;
  return Array.from({ length: rows }, (_, rowIndex) => (
    Array.from({ length: cols }, (_, colIndex) => values[(rowIndex * cols + colIndex) % values.length])
  ));
}

export function summarizeSpreadsheetRowHeaderFocus(
  event: Event,
  columns: ColumnData,
) {
  const detail = (event as SpreadsheetRowFocusEvent).detail;
  if (detail?.providers?.type && detail.providers.type !== 'rgRow') {
    return;
  }
  const rowIndex = Number(detail?.rowIndex);
  if (!Number.isInteger(rowIndex) || rowIndex < 0) {
    return;
  }
  const columnCount = Math.max(getSpreadsheetLeafColumns(columns).length, 1);
  return summarizeSelection([
    {
      x: 0,
      y: rowIndex,
      x1: columnCount - 1,
      y1: rowIndex,
    },
  ]);
}

export function setSpreadsheetFreezePane(columns: ColumnData, freezePane: boolean): ColumnData {
  const props = getSpreadsheetFreezeProps(columns);
  if (!props.size) {
    return columns;
  }

  return updateSpreadsheetColumnsByProps(columns, props, (column) => {
    if (!freezePane) {
      const { pin: _pin, ...rest } = column;
      return rest;
    }
    return { ...column, pin: 'colPinStart' };
  });
}

export function createSpreadsheetInsights(workbook: SpreadsheetWorkbook): SpreadsheetInsight[] {
  if (workbook.imported) {
    const leafColumns = getSpreadsheetLeafColumns(workbook.columns);
    const filledCells = workbook.rows.reduce((total, row) => (
      total + leafColumns.filter(column => String(row[column.prop] ?? '').trim() !== '').length
    ), 0);
    return [
      { label: 'Imported rows', value: String(workbook.rows.length), tone: 'neutral' },
      { label: 'Inferred columns', value: String(leafColumns.length), tone: 'neutral' },
      { label: 'Filled values', value: String(filledCells), tone: 'positive' },
    ];
  }
  if (workbook.sheetKey === 'empty') {
    const leafColumns = getSpreadsheetLeafColumns(workbook.columns);
    const filledCells = workbook.rows.reduce((total, row) => (
      total + leafColumns.filter(column => String(row[column.prop] ?? '').trim() !== '').length
    ), 0);
    return [
      { label: 'Blank rows', value: String(workbook.rows.length), tone: 'neutral' },
      { label: 'Columns', value: String(leafColumns.length), tone: 'neutral' },
      { label: 'Filled values', value: String(filledCells), tone: filledCells ? 'positive' : 'neutral' },
    ];
  }

  const actualTotal = workbook.rows.reduce((total, row) => (
    total + numberValue(row.jan) + numberValue(row.feb) + numberValue(row.mar)
  ), 0);
  const targetTotal = workbook.rows.reduce((total, row) => total + numberValue(row.target), 0);
  const gap = actualTotal - targetTotal;
  const atRisk = workbook.rows.filter(row => ['Watch', 'Blocked'].includes(String(row.status))).length;

  return [
    { label: 'Q1 actuals', value: formatCurrencyValue(actualTotal), tone: 'positive' },
    { label: 'Gap to target', value: formatCurrencyValue(gap), tone: gap < 0 ? 'negative' : 'positive' },
    { label: 'At risk rows', value: String(atRisk), tone: atRisk ? 'warning' : 'neutral' },
  ];
}

export function countSpreadsheetSearchMatches(
  rows: DataType[],
  columns: ColumnData,
  searchQuery: string,
): number {
  const query = normalizeSpreadsheetSearchQuery(searchQuery);
  if (!query) {
    return 0;
  }

  const leafColumns = getSpreadsheetLeafColumns(columns);
  return rows.reduce((total, row) => (
    total + leafColumns.filter(column => doesSpreadsheetValueMatchSearch(row[column.prop], query)).length
  ), 0);
}

export function formatSpreadsheetSearchStatus(searchQuery: string, matches: number) {
  const query = searchQuery.trim();
  if (!query) {
    return 'Find is ready';
  }
  return `${matches} match${matches === 1 ? '' : 'es'} for "${query}"`;
}

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

type SpreadsheetColumnGrouping = ColumnGrouping & {
  columnProperties?: ColumnRegular['columnProperties'];
  collapsible?: boolean;
  collapsed?: boolean;
  placeholder?: string | ColumnCollapsePlaceholder;
};

const SPREADSHEET_AUTOFILL_CURRENCY_PROPS = new Set<ColumnProp>(['jan', 'feb', 'mar', 'target']);
const registeredSpreadsheetAutofillPlugins = new WeakSet<object>();

type SpreadsheetEditEvent = Event & {
  detail?: BeforeSaveDataDetails;
};

type SpreadsheetRowFocusEvent = Event & {
  detail?: {
    rowIndex?: number;
    providers?: {
      type?: string;
    };
  };
};

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
    ? createImportedSpreadsheetFormulaNames()
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
    const n = rowNumber(insertAt);
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

function updateSpreadsheetColumnsByProps(
  columns: ColumnData,
  props: Set<ColumnProp>,
  updater: (column: ColumnRegular) => ColumnRegular,
): ColumnData {
  return columns.map(column => {
    if (isSpreadsheetColumnGroup(column)) {
      return {
        ...column,
        children: updateSpreadsheetColumnsByProps(column.children, props, updater),
      };
    }

    return props.has(column.prop) ? updater({ ...column }) : column;
  });
}

function getSpreadsheetFreezeProps(columns: ColumnData) {
  const leaves = getSpreadsheetLeafColumns(columns);
  const namedFreezeProps = leaves
    .filter(column => column.prop === 'department' || column.prop === 'owner')
    .map(column => column.prop);
  const freezeProps = namedFreezeProps.length ? namedFreezeProps : leaves.slice(0, 2).map(column => column.prop);
  return new Set(freezeProps);
}

function applySpreadsheetSearchHighlight(columns: ColumnData, searchQuery: string): ColumnData {
  const query = normalizeSpreadsheetSearchQuery(searchQuery);
  if (!query) {
    return columns;
  }

  return columns.map((column) => {
    if (isSpreadsheetColumnGroup(column)) {
      return {
        ...column,
        children: applySpreadsheetSearchHighlight(column.children, query),
      };
    }

    const originalCellProperties = column.cellProperties;
    return {
      ...column,
      cellProperties(model: CellTemplateProp) {
        const props = (originalCellProperties?.(model) ?? {}) as CellProps;
        return doesSpreadsheetValueMatchSearch(model.value ?? model.model?.[model.prop], query)
          ? appendSpreadsheetCellClass(props, 'spreadsheet-cell-search-hit')
          : props;
      },
    };
  });
}

function appendSpreadsheetCellClass(props: CellProps, className: string): CellProps {
  const classNames = className.split(/\s+/).filter(Boolean);
  if (!classNames.length) {
    return props;
  }
  const currentClass = props.class;
  if (!currentClass) {
    return { ...props, class: classNames.join(' ') };
  }

  if (typeof currentClass === 'string') {
    return { ...props, class: `${currentClass} ${classNames.join(' ')}` };
  }

  return {
    ...props,
    class: classNames.reduce<Record<string, boolean>>((classes, name) => {
      classes[name] = true;
      return classes;
    }, { ...currentClass }),
  };
}

function normalizeSpreadsheetSearchQuery(searchQuery: string) {
  return searchQuery.trim().toLowerCase();
}

function doesSpreadsheetValueMatchSearch(value: unknown, query: string) {
  return query ? String(value ?? '').toLowerCase().includes(query) : false;
}

function numberValue(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
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

function hasMultiCellSelection(focused?: Cell | null, range?: RangeArea | null) {
  const selection = normalizeSpreadsheetRange(focused, range);
  return !!selection && (selection.x !== selection.x1 || selection.y !== selection.y1);
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

export function getSpreadsheetLeafColumns(columns: ColumnData): ColumnRegular[] {
  const leaves: ColumnRegular[] = [];
  columns.forEach((column) => {
    if (isSpreadsheetColumnGroup(column)) {
      leaves.push(...getSpreadsheetLeafColumns(column.children));
      return;
    }
    leaves.push(column as ColumnRegular);
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

function createSpreadsheetHeaderProperties(
  className: string,
  original?: ColumnRegular['columnProperties'],
): ColumnRegular['columnProperties'] {
  return (data) => appendSpreadsheetCellClass(
    (original?.(data) ?? {}) as CellProps,
    className,
  );
}

function createSpreadsheetHeaderTypeTemplate(type: SpreadsheetHeaderIconType): ColumnRegular['columnTemplate'] {
  return (h, column: ColumnTemplateProp) => columnTypeRenderer(h, {
    ...column,
    columnType: type,
  });
}

function createReadonlySpreadsheetCellProperties(
  original?: ColumnRegular['cellProperties'],
): ColumnRegular['cellProperties'] {
  return (model) => appendSpreadsheetCellClass(
    appendSpreadsheetCellClass((original?.(model) ?? {}) as CellProps, 'spreadsheet-formula-cell'),
    'spreadsheet-cell-readonly',
  );
}

function createSpreadsheetNumberCellProperties(
  original?: ColumnRegular['cellProperties'],
): ColumnRegular['cellProperties'] {
  return (model) => appendSpreadsheetCellClass(
    (original?.(model) ?? {}) as CellProps,
    'spreadsheet-cell-number',
  );
}

function createReadonlySpreadsheetNumberCellProperties(
  original?: ColumnRegular['cellProperties'],
): ColumnRegular['cellProperties'] {
  return createReadonlySpreadsheetCellProperties(createSpreadsheetNumberCellProperties(original));
}

export async function readSpreadsheetWorkbookFromXlsx(
  file: File,
  readXlsxFile: SpreadsheetXlsxReader,
): Promise<SpreadsheetWorkbook> {
  const sheetRows = await readXlsxFile(file);
  return createImportedSpreadsheetWorkbook(sheetRows, file.name);
}

export function createImportedSpreadsheetWorkbook(
  sheetRows: unknown[][],
  fileName = 'Imported workbook',
): SpreadsheetWorkbook {
  const nonEmptyRows = sheetRows.filter(row => row.some(cell => normalizeImportedCell(cell) !== ''));
  if (!nonEmptyRows.length) {
    return {
      rows: [],
      columns: [],
      pinnedBottomSource: [],
      formulaNames: createImportedSpreadsheetFormulaNames(),
      cellMerge: [],
      imported: true,
      name: fileName,
      sheetKey: 'imported',
    };
  }

  const headers = nonEmptyRows[0].map((cell, index) => normalizeHeader(cell, index));
  const columns = createImportedColumns(headers);
  const rows = nonEmptyRows.slice(1).map((row, rowIndex) => {
    const item: DataType = { id: rowIndex + 1 };
    columns.forEach((column, index) => {
      item[column.prop] = normalizeImportedCell(row[index]);
    });
    return item;
  });

  return {
    rows,
    columns,
    pinnedBottomSource: [],
    formulaNames: createImportedSpreadsheetFormulaNames(),
    cellMerge: [],
    imported: true,
    name: fileName,
    sheetKey: 'imported',
  };
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

function createSpreadsheetColumnGroups(columns: ColumnRegular[]): ColumnData {
  const [
    departmentColumn,
    ownerColumn,
    janColumn,
    febColumn,
    marColumn,
    totalColumn,
    targetColumn,
    varianceColumn,
    marginColumn,
    trendColumn,
    statusColumn,
  ] = columns;

  const planningGroup: SpreadsheetColumnGrouping = {
    name: 'Planning',
    columnProperties: createSpreadsheetHeaderProperties('spreadsheet-header-group spreadsheet-header-group-root'),
    children: [departmentColumn, ownerColumn],
  };
  const actualsGroup: SpreadsheetColumnGrouping = {
    name: 'Actuals',
    collapsible: true,
    collapsed: false,
    placeholder: {
      value: spreadsheetActualsCollapsedValue,
      cellTemplate: spreadsheetActualsCollapsedCellTemplate,
      cellProperties: createSpreadsheetNumberCellProperties(),
    },
    columnProperties: createSpreadsheetHeaderProperties('spreadsheet-header-group spreadsheet-header-group-root spreadsheet-header-group-actuals'),
    children: [janColumn, febColumn, marColumn],
  };
  const formulaGroup: SpreadsheetColumnGrouping = {
    name: 'Formula outputs',
    collapsible: true,
    collapsed: false,
    placeholder: 'Formula columns hidden',
    columnProperties: createSpreadsheetHeaderProperties('spreadsheet-header-group spreadsheet-header-group-root spreadsheet-header-group-formulas'),
    children: [totalColumn, targetColumn],
  };
  const metricsGroup: SpreadsheetColumnGrouping = {
    name: 'Metrics',
    columnProperties: createSpreadsheetHeaderProperties('spreadsheet-header-group spreadsheet-header-group-root spreadsheet-header-group-metrics'),
    children: [varianceColumn, marginColumn],
  };
  const trendGroup: SpreadsheetColumnGrouping = {
    name: 'Trend',
    columnProperties: createSpreadsheetHeaderProperties('spreadsheet-header-group spreadsheet-header-group-root spreadsheet-header-group-trend'),
    children: [trendColumn],
  };
  const governanceGroup: SpreadsheetColumnGrouping = {
    name: 'Governance',
    columnProperties: createSpreadsheetHeaderProperties('spreadsheet-header-group spreadsheet-header-group-root spreadsheet-header-group-governance'),
    children: [statusColumn],
  };

  return [planningGroup, actualsGroup, formulaGroup, metricsGroup, trendGroup, governanceGroup];
}

export function createSpreadsheetExportExcelConfig() {
  return {
    allowDrag: true,
    allowedExtensions: ['.csv'],
  };
}

type SpreadsheetRangeSummary = RangeArea | { range: RangeArea };

export function summarizeSelection(ranges: SpreadsheetRangeSummary[]) {
  const normalizedRanges = ranges
    .map(range => ('range' in range ? range.range : range))
    .filter(Boolean);

  if (!normalizedRanges.length) {
    return 'No ranges selected';
  }
  const cells = normalizedRanges.reduce(
    (total, range) => total + (Math.abs(range.x1 - range.x) + 1) * (Math.abs(range.y1 - range.y) + 1),
    0,
  );
  return `${normalizedRanges.length} range${normalizedRanges.length === 1 ? '' : 's'} selected, ${cells} cells`;
}

export function summarizeClipboardMatrix(matrix: unknown[][] | undefined) {
  if (!matrix?.length) {
    return 'Clipboard is empty';
  }
  return `${matrix.length} rows x ${matrix[0]?.length ?? 0} columns`;
}

export function formatWorkbookStatus(workbook: SpreadsheetWorkbook) {
  if (workbook.imported) {
    return workbook.rows.length
      ? `Imported ${workbook.rows.length} rows from ${workbook.name}`
      : `No values found in ${workbook.name}`;
  }
  if (workbook.sheetKey === 'empty') {
    const leafColumns = getSpreadsheetLeafColumns(workbook.columns);
    return `${workbook.name}: ${workbook.rows.length} blank rows x ${leafColumns.length} columns`;
  }
  return `${workbook.name}: ${workbook.rows.length} live rows with formulas and named ranges`;
}

function currencyColumn(name: string, prop: keyof SpreadsheetRow, size = 118): ColumnRegular {
  const cellTemplate = createSpreadsheetFeedFlashTemplate(currencyTemplate);
  const validation = validationRenderer({
    template: cellTemplate,
    severity: 'error',
    indicatorPlacement: 'corner',
    messagePlacement: 'tooltip',
    invalidProperties: () => ({ class: 'spreadsheet-cell-invalid' }),
  });
  return {
    name,
    prop,
    size,
    filter: 'number',
    flash: true,
    spreadsheetHeaderIconType: 'currency',
    cellTemplate: validation.cellTemplate,
    cellProperties: createSpreadsheetNumberCellProperties(validation.cellProperties),
    validate: isNonNegativeNumber,
    validationTooltip: value => isNonNegativeNumber(value) ? undefined : 'Enter a non-negative number.',
  };
}

function createSpreadsheetFeedFlashTemplate(template: ColumnRegular['cellTemplate']) {
  return cellFlashArrowTemplate(template, {
    className: 'spreadsheet-feed-flash',
    arrowClassName: 'spreadsheet-feed-arrow',
  });
}

function createImportedColumns(headers: string[]): ColumnRegular[] {
  const used = new Map<string, number>();
  return headers.map((header, index) => {
    const base = toColumnProp(header || `Column ${index + 1}`) || `col_${index + 1}`;
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    const prop = count ? `${base}_${count + 1}` : base;
    return {
      name: header || `Column ${index + 1}`,
      prop,
      size: index === 0 ? 170 : 135,
      filter: 'input',
      flash: true,
      columnTemplate: createSpreadsheetHeaderTypeTemplate('string'),
      columnProperties: createSpreadsheetHeaderProperties('spreadsheet-header-leaf'),
    };
  });
}

function normalizeHeader(cell: unknown, index: number) {
  const value = normalizeImportedCell(cell);
  return value ? String(value) : `Column ${index + 1}`;
}

function normalizeImportedCell(cell: unknown): string | number | boolean {
  if (cell instanceof Date) {
    return cell.toISOString().slice(0, 10);
  }
  if (cell === null || typeof cell === 'undefined') {
    return '';
  }
  if (typeof cell === 'number' || typeof cell === 'boolean') {
    return cell;
  }
  return String(cell);
}

function toColumnProp(header: string) {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function mergeDropdownOptions(dropdown: { source: Array<{ value: unknown; label: string }> }, values: string[]) {
  const existing = new Set(dropdown.source.map(option => String(option.value)));
  return {
    ...dropdown,
    source: [
      ...dropdown.source,
      ...values
        .filter(value => !existing.has(value))
        .map(value => ({ value, label: value })),
    ],
  };
}

function isNonNegativeNumber(value: unknown) {
  const numeric = Number(value);
  return value !== '' && Number.isFinite(numeric) && numeric >= 0;
}

function currencyTemplate(h: any, { value }: { value?: unknown }) {
  return h('span', { class: 'spreadsheet-money' }, formatCurrencyValue(value));
}

function departmentTemplate(h: any, { value }: { value?: unknown }) {
  return h('span', { class: 'spreadsheet-department-tag' }, String(value ?? ''));
}

function signedCurrencyTemplate(h: any, { value }: { value?: unknown }) {
  const numeric = Number(value);
  return h(
    'span',
    { class: numeric < 0 ? 'spreadsheet-money spreadsheet-money-negative' : 'spreadsheet-money spreadsheet-money-positive' },
    formatCurrencyValue(value),
  );
}

function spreadsheetActualsCollapsedCellTemplate(_h: any, schema: CellTemplateProp) {
  return _h('span', { class: 'spreadsheet-money' }, formatCurrencyValue(spreadsheetActualsCollapsedValue(schema)));
}

function spreadsheetActualsCollapsedValue(schema: CellTemplateProp) {
  const row = schema.model as Partial<SpreadsheetRow>;
  return ['jan', 'feb', 'mar'].reduce((total, prop) => {
    const numeric = Number(row?.[prop as keyof SpreadsheetRow]);
    return Number.isFinite(numeric) ? total + numeric : total;
  }, 0);
}

function marginTemplate(h: Parameters<CellTemplate>[0], schema: CellTemplateProp) {
  const value = schema.value;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return h('span', { class: 'spreadsheet-margin spreadsheet-margin-empty' }, String(value ?? ''));
  }
  const percentValue = Math.round(numeric * 1000) / 10;
  return progressLineWithValueRenderer(h, {
    ...schema,
    value: percentValue,
  });
}

function trendTemplate(h: Parameters<CellTemplate>[0], schema: CellTemplateProp) {
  const value = schema.value;
  const numeric = Number(value);
  const label = Number.isFinite(numeric) ? PERCENT_FORMATTER.format(numeric) : String(value ?? '');
  const tone = numeric < 0 ? 'down' : numeric < 0.08 ? 'flat' : 'up';
  const row = schema.model as Partial<SpreadsheetRow>;
  const sparkline = sparklineRenderer?.(h, {
    ...schema,
    value: createSpreadsheetTrendSeries(row),
  });
  return h('span', { class: `spreadsheet-trend spreadsheet-trend-${tone}` }, [
    h('span', { class: 'spreadsheet-trend-sparkline', 'aria-hidden': 'true' }, sparkline),
    h('span', { class: 'spreadsheet-trend-value' }, label),
  ]);
}

function createSpreadsheetTrendSeries(row: Partial<SpreadsheetRow>) {
  const actuals = [row.jan, row.feb, row.mar]
    .map(value => Number(value))
    .filter(value => Number.isFinite(value));
  const target = Number(row.target);
  if (Number.isFinite(target)) {
    actuals.push(target);
  }
  return actuals;
}

function statusTemplate(h: any, { value }: { value?: unknown }) {
  const status = String(value ?? '');
  return h('span', { class: `spreadsheet-status spreadsheet-status-${toColumnProp(status)}` }, status);
}

function formatCurrencyValue(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return String(value ?? '');
  }
  return CURRENCY_FORMATTER.format(numeric);
}
