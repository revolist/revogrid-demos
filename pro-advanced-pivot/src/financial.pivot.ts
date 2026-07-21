import type { ColumnRegular, DataType, GridPlugin } from '@revolist/revogrid';
import NumberColumnType from '@revolist/revogrid-column-numeral';
import {
  type PivotConfig,
  type PivotConfigDimension,
  filterPivotSource,
  PivotPlugin,
} from '@revolist/revogrid-enterprise';
import {
  AdvanceFilterPlugin,
  ColumnCollapsePlugin,
  FilterHeaderPlugin,
  MultiRowHeaderPlugin,
  RowOddPlugin,
  RowSelectPlugin,
  SameValueMergePlugin,
  commonAggregators,
} from '@revolist/revogrid-pro';
import chartLineIcon from '@fortawesome/fontawesome-free/svgs/solid/chart-line.svg?raw';
import coinsIcon from '@fortawesome/fontawesome-free/svgs/solid/coins.svg?raw';
import percentIcon from '@fortawesome/fontawesome-free/svgs/solid/percent.svg?raw';
import boxesStackedIcon from '@fortawesome/fontawesome-free/svgs/solid/boxes-stacked.svg?raw';
import { FINANCIAL_DATA, type FinancialRow } from './financial-dataset';
import { createFinancialHeatmapColumnType } from './financial.heatmap';

export const FINANCIAL_COLUMN_TYPES = {
  currency: new NumberColumnType('$0,0.00'),
  number: new NumberColumnType('0,0.00'),
  integer: new NumberColumnType('0,0'),
  salesHeatmap: createFinancialHeatmapColumnType('Sales', 'currency'),
  profitHeatmap: createFinancialHeatmapColumnType('Profit', 'currency'),
  unitsHeatmap: createFinancialHeatmapColumnType('Units Sold', 'number'),
  grossSalesHeatmap: createFinancialHeatmapColumnType('Gross Sales', 'currency'),
  discountsHeatmap: createFinancialHeatmapColumnType('Discounts', 'currency'),
  cogsHeatmap: createFinancialHeatmapColumnType('COGS', 'currency'),
};

const currencyAggregators = {
  sum: commonAggregators.sum,
  avg: commonAggregators.avg,
  min: commonAggregators.min,
  max: commonAggregators.max,
};

const numberAggregators = {
  sum: commonAggregators.sum,
  avg: commonAggregators.avg,
};

const MONTH_ORDER = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const monthCompare: NonNullable<PivotConfigDimension['cellCompare']> = (_prop, a, b) =>
  MONTH_ORDER.indexOf(String(a.Month)) - MONTH_ORDER.indexOf(String(b.Month));

export const FINANCIAL_DIMENSIONS: PivotConfigDimension[] = [
  { prop: 'Country', sortable: true, order: 'asc', merge: true, filter: ['string', 'selection'] },
  { prop: 'Segment', sortable: true, order: 'asc', merge: true, filter: ['string', 'selection'] },
  { prop: 'Year', sortable: true, order: 'asc', columnType: 'integer', filter: ['number', 'selection'] },
  {
    prop: 'Month',
    sortable: true,
    order: 'asc',
    cellCompare: monthCompare,
    filter: ['string', 'selection'],
    filterOptions: [...MONTH_ORDER],
  },
  { prop: 'Product', sortable: true, filter: ['string', 'selection'] },
  {
    prop: 'Discount Band',
    sortable: true,
    filter: ['string', 'selection'],
    filterOptions: ['None', 'Low', 'Medium', 'High'],
  },
  {
    prop: 'Units Sold',
    sortable: true,
    columnType: 'unitsHeatmap',
    filter: ['number'],
    aggregators: numberAggregators,
  },
  {
    prop: 'Sales',
    sortable: true,
    columnType: 'salesHeatmap',
    filter: ['number'],
    aggregators: currencyAggregators,
  },
  {
    prop: 'Profit',
    sortable: true,
    columnType: 'profitHeatmap',
    filter: ['number'],
    aggregators: currencyAggregators,
  },
  {
    prop: 'Gross Sales',
    sortable: true,
    columnType: 'grossSalesHeatmap',
    filter: ['number'],
    aggregators: currencyAggregators,
  },
  {
    prop: 'Discounts',
    sortable: true,
    columnType: 'discountsHeatmap',
    filter: ['number'],
    aggregators: currencyAggregators,
  },
  {
    prop: 'COGS',
    sortable: true,
    columnType: 'cogsHeatmap',
    filter: ['number'],
    aggregators: currencyAggregators,
  },
  { prop: 'Date', sortable: true, filter: ['string'] },
];

export const FINANCIAL_COLUMNS: ColumnRegular[] = FINANCIAL_DIMENSIONS.map((dimension) => ({
  ...dimension,
  size: dimension.size ?? 150,
}));

export const FINANCIAL_SHOWCASE_PLUGINS: GridPlugin[] = [
  FilterHeaderPlugin,
  RowSelectPlugin,
  SameValueMergePlugin,
  PivotPlugin,
  ColumnCollapsePlugin,
  MultiRowHeaderPlugin,
  AdvanceFilterPlugin,
  RowOddPlugin,
] as GridPlugin[];

export const FINANCIAL_MULTI_ROW_HEADER = {
  // Pivot row-axis headers contain sorting and filtering controls and should
  // retain their normal leaf-header geometry. Collapsed column groups opt in
  // to downward spanning independently through spanHeaderHeight.
  spanLeafHeaders: false,
} as const;

const SALES_OVERVIEW: PivotConfig = {
  dimensions: FINANCIAL_DIMENSIONS,
  rows: ['Country', 'Segment'],
  columns: ['Year', 'Month'],
  values: [
    { prop: 'Sales', aggregator: 'sum' },
    { prop: 'Profit', aggregator: 'sum' },
    { prop: 'Units Sold', aggregator: 'sum' },
  ],
  filters: ['Product', 'Discount Band'],
  filterSelections: { 'Discount Band': ['High'] },
  hasConfigurator: true,
  flatHeaders: false,
  collapsed: true,
  groupAggregations: true,
  columnCollapse: {
    enabled: true,
    collapsed: false,
    aggregator: {
      Sales: 'sum',
      Profit: 'sum',
      'Units Sold': 'sum',
    },
    placeholder: 'Period Total',
  },
  totals: {
    subtotals: true,
    grandTotal: true,
    subtotalLabel: 'Subtotal',
    grandTotalLabel: 'Grand Total',
  },
};

const PROFITABILITY: PivotConfig = {
  ...SALES_OVERVIEW,
  rows: ['Segment', 'Country'],
  columns: ['Year', 'Month'],
  values: [
    { prop: 'Profit', aggregator: 'sum' },
    { prop: 'Sales', aggregator: 'sum' },
    { prop: 'COGS', aggregator: 'sum' },
  ],
  filters: ['Product', 'Discount Band'],
  filterSelections: { 'Discount Band': ['Medium'] },
  columnCollapse: {
    enabled: true,
    collapsed: false,
    aggregator: { Profit: 'sum', Sales: 'sum', COGS: 'sum' },
    placeholder: 'Period Total',
  },
};

const PRODUCT_PERFORMANCE: PivotConfig = {
  ...SALES_OVERVIEW,
  rows: ['Product', 'Segment'],
  columns: ['Year', 'Country'],
  values: [
    { prop: 'Gross Sales', aggregator: 'sum' },
    { prop: 'Units Sold', aggregator: 'sum' },
    { prop: 'Discounts', aggregator: 'sum' },
  ],
  filters: ['Month', 'Discount Band'],
  filterSelections: { Month: ['December'] },
  columnCollapse: {
    enabled: true,
    collapsed: false,
    aggregator: { 'Gross Sales': 'sum', 'Units Sold': 'sum', Discounts: 'sum' },
    placeholder: 'Market Total',
  },
};

export type FinancialPresetId = 'sales' | 'profitability' | 'product';

export interface FinancialPreset {
  id: FinancialPresetId;
  label: string;
  description: string;
}

export const FINANCIAL_PRESETS: FinancialPreset[] = [
  {
    id: 'sales',
    label: 'Sales Overview',
    description: 'Compare monthly revenue and demand across markets and segments.',
  },
  {
    id: 'profitability',
    label: 'Profitability',
    description: 'See which segments convert revenue into profit most effectively.',
  },
  {
    id: 'product',
    label: 'Product Performance',
    description: 'Understand which products drive volume, gross sales, and discounts.',
  },
];

export interface FinancialKpi {
  label: string;
  value: string;
  detail: string;
  icon: string;
  tone: 'sales' | 'profit' | 'margin' | 'units';
}

function prepareKpiIcon(svg: string) {
  return svg.replace(
    '<svg ',
    '<svg width="20" height="20" fill="currentColor" aria-hidden="true" focusable="false" ',
  );
}

const compactCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const compactNumber = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const percentNumber = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});


export function getFinancialKpis(
  rows: FinancialRow[],
  preset: FinancialPresetId = 'sales',
): FinancialKpi[] {
  const summary = rows.reduce(
    (result, row) => ({
      sales: result.sales + row.Sales,
      profit: result.profit + row.Profit,
      units: result.units + row['Units Sold'],
      grossSales: result.grossSales + row['Gross Sales'],
      discounts: result.discounts + row.Discounts,
      cogs: result.cogs + row.COGS,
    }),
    { sales: 0, profit: 0, units: 0, grossSales: 0, discounts: 0, cogs: 0 },
  );
  const years = new Set(rows.map((row) => row.Year));
  const markets = new Set(rows.map((row) => row.Country));
  const products = new Set(rows.map((row) => row.Product));

  if (preset === 'sales') {
    return [
      {
        label: 'Net Sales',
        value: compactCurrency.format(summary.sales),
        detail: `${rows.length.toLocaleString('en-US')} transactions`,
        icon: prepareKpiIcon(chartLineIcon),
        tone: 'sales',
      },
      {
        label: 'Profit',
        value: compactCurrency.format(summary.profit),
        detail: `${years.size} fiscal years`,
        icon: prepareKpiIcon(coinsIcon),
        tone: 'profit',
      },
      {
        label: 'Profit Margin',
        value: percentNumber.format(summary.sales ? summary.profit / summary.sales : 0),
        detail: 'Profit ÷ net sales',
        icon: prepareKpiIcon(percentIcon),
        tone: 'margin',
      },
      {
        label: 'Units Sold',
        value: compactNumber.format(summary.units),
        detail: `${markets.size} global markets`,
        icon: prepareKpiIcon(boxesStackedIcon),
        tone: 'units',
      },
    ];
  }

  if (preset === 'profitability') {
    return [
      {
        label: 'Profit',
        value: compactCurrency.format(summary.profit),
        detail: `${years.size} fiscal years`,
        icon: prepareKpiIcon(coinsIcon),
        tone: 'profit',
      },
      {
        label: 'Profit Margin',
        value: percentNumber.format(summary.sales ? summary.profit / summary.sales : 0),
        detail: 'Profit ÷ net sales',
        icon: prepareKpiIcon(percentIcon),
        tone: 'margin',
      },
      {
        label: 'COGS',
        value: compactCurrency.format(summary.cogs),
        detail: `${markets.size} global markets`,
        icon: prepareKpiIcon(boxesStackedIcon),
        tone: 'units',
      },
      {
        label: 'Gross Margin',
        value: percentNumber.format(
          summary.grossSales ? (summary.grossSales - summary.cogs) / summary.grossSales : 0,
        ),
        detail: 'Gross sales less COGS',
        icon: prepareKpiIcon(chartLineIcon),
        tone: 'sales',
      },
    ];
  }

  return [
    {
      label: 'Gross Sales',
      value: compactCurrency.format(summary.grossSales),
      detail: `${rows.length.toLocaleString('en-US')} transactions`,
      icon: prepareKpiIcon(chartLineIcon),
      tone: 'sales',
    },
    {
      label: 'Units Sold',
      value: compactNumber.format(summary.units),
      detail: `${products.size} products`,
      icon: prepareKpiIcon(boxesStackedIcon),
      tone: 'units',
    },
    {
      label: 'Discounts',
      value: compactCurrency.format(summary.discounts),
      detail: 'Gross-to-net reductions',
      icon: prepareKpiIcon(coinsIcon),
      tone: 'profit',
    },
    {
      label: 'Discount Rate',
      value: percentNumber.format(
        summary.grossSales ? summary.discounts / summary.grossSales : 0,
      ),
      detail: 'Discounts ÷ gross sales',
      icon: prepareKpiIcon(percentIcon),
      tone: 'margin',
    },
  ];
}

export function resolveFinancialKpiPreset(config: PivotConfig): FinancialPresetId {
  const measures = new Set(config.values.map(({ prop }) => String(prop)));
  if (measures.has('Gross Sales') || measures.has('Discounts')) return 'product';
  if (measures.has('COGS')) return 'profitability';
  return 'sales';
}

const PRESET_CONFIGS: Record<FinancialPresetId, PivotConfig> = {
  sales: SALES_OVERVIEW,
  profitability: PROFITABILITY,
  product: PRODUCT_PERFORMANCE,
};

export function createFinancialPreset(id: FinancialPresetId = 'sales'): PivotConfig {
  const config = PRESET_CONFIGS[id];
  return {
    ...config,
    dimensions: config.dimensions?.map((dimension) => ({ ...dimension })),
    rows: [...config.rows],
    columns: [...(config.columns || [])],
    values: config.values.map((value) => ({ ...value })),
    filters: [...(config.filters || [])],
    filterSelections: Object.fromEntries(
      Object.entries(config.filterSelections || {}).map(([prop, selection]) => [
        prop,
        [...(selection || [])],
      ]),
    ),
    totals: config.totals ? { ...config.totals } : undefined,
    columnCollapse: typeof config.columnCollapse === 'object'
      ? {
          ...config.columnCollapse,
          aggregator:
            typeof config.columnCollapse.aggregator === 'object'
              ? { ...config.columnCollapse.aggregator }
              : config.columnCollapse.aggregator,
        }
      : config.columnCollapse,
  };
}

export const FINANCIAL_SHOWCASE_PIVOT = createFinancialPreset();

export function resolveFinancialRows(rows?: DataType[]): FinancialRow[] {
  return rows?.length ? rows as FinancialRow[] : FINANCIAL_DATA;
}

export function applyFinancialPivotOptions(
  config: PivotConfig | null,
  data: DataType[],
  configuratorVisible = true,
): PivotConfig | undefined {
  if (!config) return undefined;

  const rows = config.rows || [];
  const nextConfig: PivotConfig = {
    ...config,
    rows,
    hasConfigurator: configuratorVisible,
  };

  if (typeof nextConfig.expanded === 'undefined') {
    nextConfig.expanded = getInitialExpandedGroups(filterPivotSource(data, nextConfig), rows);
  }

  return nextConfig;
}

function getInitialExpandedGroups(data: DataType[], rows: Array<string | number>) {
  const expanded: Record<string, boolean> = {};
  const groupingDepth = Math.max(0, rows.length - 1);

  data.forEach((row) => {
    const path: unknown[] = [];
    for (let index = 0; index < groupingDepth; index += 1) {
      path.push(row[rows[index]] ?? null);
      expanded[path.join(',')] = true;
    }
  });

  return expanded;
}
