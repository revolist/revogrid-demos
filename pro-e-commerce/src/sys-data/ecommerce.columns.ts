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
  FilterHeaderPlugin,
  RowSelectPlugin,
  SummaryChartHeaderPlugin,
  barChartRenderer,
  pieChartRenderer,
  summaryHeaderRenderer,
} from '@revolist/revogrid-pro';

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
      { prop: 'Customer ID', name: 'ID' },
      { prop: 'avatar', name: 'Customer' },
      {
        prop: 'Gender',
        name: 'Gender',
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
        summaryVNode: (h: HyperFunc<VNode>, summary: Record<string, number>) =>
          renderDistribution(h, summary, 60, 20),
      },
      {
        prop: 'Age',
        name: 'Age',
        summaryVNode: (h: HyperFunc<VNode>, summary: Record<string, number>) =>
          renderDistribution(h, summary, 40, 10),
      },
      {
        prop: 'City',
        name: 'City',
        summaryVNode: (h: HyperFunc<VNode>, summary: Record<string, number>) =>
          summaryHeaderRenderer(h, summary, { maxItems: 2 }),
      },
      {
        prop: 'Membership Type',
        name: 'Membership Type',
        summaryVNode: (h: HyperFunc<VNode>, summary: Record<string, number>) =>
          summaryHeaderRenderer(h, summary, { maxItems: 2 }),
      },
    ],
  },
  {
    name: 'Spending',
    children: [
      {
        prop: 'Average Rating',
        name: 'Average Rating',
        summaryVNode: (h: HyperFunc<VNode>, summary: Record<string, number>) =>
          renderDistribution(h, summary, 35, 10),
      },
      {
        prop: 'Discount Applied',
        name: 'Discount',
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
        summaryVNode: (h: HyperFunc<VNode>, summary: Record<string, number>) =>
          renderEcommerceNumericAggregate(h, summary, 'average'),
      },
      {
        prop: 'Total Spend',
        name: 'Total Spend',
        summaryVNode: (h: HyperFunc<VNode>, summary: Record<string, number>) =>
          renderEcommerceNumericAggregate(h, summary, 'sum'),
      },
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
  FilterHeaderPlugin,
  SummaryChartHeaderPlugin,
] as (typeof BasePlugin)[];
