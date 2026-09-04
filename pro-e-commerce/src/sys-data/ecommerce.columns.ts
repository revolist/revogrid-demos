import type {
  BasePlugin,
  ColumnGrouping,
  ColumnRegular,
  HyperFunc,
  VNode,
} from '@revolist/revogrid';
import {
  AdvanceFilterPlugin,
  ColumnGroupPanelPlugin,
  ExportExcelPlugin,
  FilterHeaderPlugin,
  RowSelectPlugin,
  SummaryChartHeaderPlugin,
  barChartRenderer,
  pieChartRenderer,
  summaryHeaderRenderer,
} from '@revolist/revogrid-pro';

export const ECOMMERCE_FILTER_BY_PROP: Readonly<Record<string, ColumnRegular['filter']>> = {
  'Customer ID': ['string'],
  Customer: ['fuzzy'],
  Gender: ['selection'],
  City: ['facetedList'],
  'Membership Type': ['chipBadgeToggles'],
  Age: ['slider'],
  'Lifetime Value': ['histogramBrush'],
  'Average Rating': ['ratingProgressThreshold'],
  'Discount Applied': ['triStateBoolean'],
  'Spend Change (%)': ['statisticalPresets'],
  'Total Spend': ['histogramBrush'],
  'Order Date': ['calendarRange'],
  'Created At': ['timelineBrush'],
  'Order Status': ['facetedList'],
  'Product Category': ['selection'],
  SKU: ['tokenList'],
  Tags: ['arrayTags'],
  Country: ['selection'],
  Currency: ['selection'],
};

export const ECOMMERCE_COLUMNS: (ColumnRegular | ColumnGrouping)[] = [
  {
    name: 'Personal',
    children: [
      {
        prop: '_checkbox',
        rowSelect: true,
        readonly: true,
        filter: false,
        size: 54,
      },
      { prop: 'Customer ID', name: 'ID', filter: ECOMMERCE_FILTER_BY_PROP['Customer ID'] },
      { prop: 'Customer', name: 'Customer', filter: ECOMMERCE_FILTER_BY_PROP.Customer },
      {
        prop: 'Gender',
        name: 'Gender',
        filter: ECOMMERCE_FILTER_BY_PROP.Gender,
        summaryVNode: (h: HyperFunc<VNode>, summary: Record<string, number>) => {
          const names = Object.keys(summary).sort().filter(Boolean);
          return pieChartRenderer(h, {
            value: names.map((name) => ({
              name,
              value: summary[name],
              color: name === 'Male' ? '#008620' : '#ffc107',
            })),
          });
        },
      },
      {
        prop: 'Lifetime Value',
        name: 'Lifetime Value',
        filter: ECOMMERCE_FILTER_BY_PROP['Lifetime Value'],
        summaryVNode: (h: HyperFunc<VNode>, summary: Record<string, number>) =>
          renderDistribution(h, summary, 60, 20),
      },
      {
        prop: 'Age',
        name: 'Age',
        filter: ECOMMERCE_FILTER_BY_PROP.Age,
        summaryVNode: (h: HyperFunc<VNode>, summary: Record<string, number>) =>
          renderDistribution(h, summary, 40, 10),
      },
      {
        prop: 'City',
        name: 'City',
        filter: ECOMMERCE_FILTER_BY_PROP.City,
        summaryVNode: (h: HyperFunc<VNode>, summary: Record<string, number>) =>
          summaryHeaderRenderer(h, summary, { maxItems: 1 }),
      },
      {
        prop: 'Membership Type',
        name: 'Membership Type',
        filter: ECOMMERCE_FILTER_BY_PROP['Membership Type'],
        summaryVNode: (h: HyperFunc<VNode>, summary: Record<string, number>) =>
          summaryHeaderRenderer(h, summary, { maxItems: 1 }),
      },
    ],
  },
  {
    name: 'Spending',
    children: [
      {
        prop: 'Average Rating',
        name: 'Average Rating',
        filter: ECOMMERCE_FILTER_BY_PROP['Average Rating'],
        summaryVNode: (h: HyperFunc<VNode>, summary: Record<string, number>) =>
          renderDistribution(h, summary, 35, 10),
      },
      {
        prop: 'Discount Applied',
        name: 'Discount',
        filter: ECOMMERCE_FILTER_BY_PROP['Discount Applied'],
        summaryVNode: (h: HyperFunc<VNode>, summary: Record<string, number>) => {
          const names = Object.keys(summary).filter(Boolean);
          return pieChartRenderer(h, {
            value: names.map((name) => ({ name, value: summary[name] })),
          });
        },
      },
      {
        prop: 'Spend Change (%)',
        name: 'Spend Change',
        filter: ECOMMERCE_FILTER_BY_PROP['Spend Change (%)'],
        summaryVNode: (h: HyperFunc<VNode>, summary: Record<string, number>) =>
          renderEcommerceNumericAggregate(h, summary, 'average'),
      },
      {
        prop: 'Total Spend',
        name: 'Total Spend',
        filter: ECOMMERCE_FILTER_BY_PROP['Total Spend'],
        summaryVNode: (h: HyperFunc<VNode>, summary: Record<string, number>) =>
          renderEcommerceNumericAggregate(h, summary, 'sum'),
      },
    ],
  },
  {
    name: 'Commerce',
    children: [
      { prop: 'Order Date', name: 'Order date', filter: ECOMMERCE_FILTER_BY_PROP['Order Date'] },
      { prop: 'Created At', name: 'Created at', filter: ECOMMERCE_FILTER_BY_PROP['Created At'] },
      { prop: 'Order Status', name: 'Status', filter: ECOMMERCE_FILTER_BY_PROP['Order Status'] },
      { prop: 'Product Category', name: 'Category', filter: ECOMMERCE_FILTER_BY_PROP['Product Category'] },
      { prop: 'SKU', name: 'SKU', filter: ECOMMERCE_FILTER_BY_PROP.SKU },
      { prop: 'Tags', name: 'Tags', filter: ECOMMERCE_FILTER_BY_PROP.Tags },
      { prop: 'Country', name: 'Country', filter: ECOMMERCE_FILTER_BY_PROP.Country },
      { prop: 'Currency', name: 'Currency', filter: ECOMMERCE_FILTER_BY_PROP.Currency },
    ],
  },
];

function renderDistribution(
  h: HyperFunc<VNode>,
  summary: Record<string, number>,
  high: number,
  medium: number,
) {
  return barChartRenderer(h, {
    value: Object.keys(summary).sort().map((key) => summary[key]),
    column: {
      barPosition: 'top',
      minValue: 0,
      thresholds: [
        { value: high, className: 'high' },
        { value: medium, className: 'medium' },
        { value: 0, className: 'low' },
      ],
    },
  });
}

export function renderEcommerceNumericAggregate(
  h: HyperFunc<VNode>,
  summary: Record<string, number>,
  mode: 'average' | 'sum',
) {
  let count = 0;
  let sum = 0;

  for (const [rawValue, occurrences] of Object.entries(summary)) {
    const value = rawValue === 'Other' ? 0 : Number(rawValue);
    if (!Number.isFinite(value) || !Number.isFinite(occurrences)) continue;

    count += occurrences;
    sum += value * occurrences;
  }

  const value = mode === 'average' && count > 0 ? sum / count : sum;
  const label = mode === 'average' ? 'AVG' : 'SUM';
  const formattedValue = mode === 'average'
    ? `${value.toFixed(1)}%`
    : `$${Math.round(value).toLocaleString('en-US')}`;

  return h('div', { class: 'ecommerce-summary-aggregate' }, [
    h('span', { class: 'ecommerce-summary-aggregate__label' }, label),
    h('strong', { class: 'ecommerce-summary-aggregate__value' }, formattedValue),
  ]);
}

export const ECOMMERCE_COLUMNS_TYPES = {};
export const ECOMMERCE_PLUGINS = [
  RowSelectPlugin,
  ColumnGroupPanelPlugin,
  AdvanceFilterPlugin,
  SummaryChartHeaderPlugin,
  FilterHeaderPlugin,
  ExportExcelPlugin,
] as (typeof BasePlugin)[];
