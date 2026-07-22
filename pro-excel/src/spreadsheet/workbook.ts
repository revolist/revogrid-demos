/** Workbook and column-schema construction, templates, and formatting. */
import type {
  CellProps,
  CellTemplate,
  CellTemplateProp,
  ColumnData,
  ColumnGrouping,
  ColumnRegular,
  ColumnTemplateProp,
  DataType,
} from '@revolist/revogrid';
import {
  cellFlashArrowTemplate,
  columnTypeRenderer,
  createFormulaConditionalCellProperties,
  createNamedRangeDropdown,
  evaluateRawValuesFormula,
  progressLineWithValueRenderer,
  sparklineRenderer,
  validationRenderer,
  type ColumnCollapsePlaceholder,
} from '@revolist/revogrid-pro';
import { appendSpreadsheetCellClass, getSpreadsheetLeafColumns } from './columns';
import {
  DEPARTMENT_VALUES,
  STATUS_VALUES,
  createEmptySpreadsheetFormulaNames,
  createSpreadsheetCellMerge,
  createSpreadsheetFormulaNames,
  createSpreadsheetPinnedBottomSource,
  createSpreadsheetRows,
  getSpreadsheetSheetLabel,
} from './data';
import { mergeDropdownOptions } from './dropdown';
import type {
  SpreadsheetRow,
  SpreadsheetSheetKey,
  SpreadsheetWorkbook,
} from './models';

type SpreadsheetColumnGrouping = ColumnGrouping & {
  columnProperties?: ColumnRegular['columnProperties'];
  collapsible?: boolean;
  collapsed?: boolean;
  placeholder?: string | ColumnCollapsePlaceholder;
};

type SpreadsheetHeaderIconType = 'string' | 'currency' | 'decimal';

/**
 * Reconciles live grid rows into workbook state and refreshes derived totals.
 * Imported and blank workbooks intentionally remain without pinned summaries.
 */
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

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const PERCENT_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
});

/** Builds the grouped, formatted, and editable column schema for workbook rows. */
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
      filter: ['selection'],
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
      filter: ['slider'],
      filterPlaceholder: 'Range',
      cellParser: model => spreadsheetFormulaValue(model.margin, rows, columns, formulaNames.names),
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

/** Creates a complete scenario workbook ready to bind to RevoGrid. */
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
    formulaNames: createEmptySpreadsheetFormulaNames(),
    cellMerge: [],
    imported: false,
    name: 'Blank workbook',
    sheetKey: 'empty',
  };
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

function toColumnProp(header: string) {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function isNonNegativeNumber(value: unknown) {
  const numeric = Number(value);
  return value !== '' && Number.isFinite(numeric) && numeric >= 0;
}

function currencyTemplate(h: any, { value }: { value?: unknown }) {
  return h('span', { class: 'spreadsheet-money' }, formatCurrencyValue(value));
}

function departmentTemplate(h: any, { value }: { value?: unknown }) {
  if (value === '' || value === null || value === undefined) {
    return '';
  }
  return h('span', { class: 'spreadsheet-department-tag' }, String(value));
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

function spreadsheetFormulaValue(
  value: unknown,
  rows: DataType[],
  columns: ColumnRegular[],
  names: ReturnType<typeof createSpreadsheetFormulaNames>['names'],
) {
  return typeof value === 'string' && value.startsWith('=')
    ? evaluateRawValuesFormula(value, rows, columns, { names })
    : value;
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

export function formatCurrencyValue(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return String(value ?? '');
  }
  return CURRENCY_FORMATTER.format(numeric);
}
