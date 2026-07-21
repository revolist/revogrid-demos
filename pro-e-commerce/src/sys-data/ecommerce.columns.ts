import type {
  BasePlugin,
  ColumnGrouping,
  ColumnRegular,
  HyperFunc,
  VNode,
} from '@revolist/revogrid';
import {
  ColumnGroupPanelPlugin,
  RowSelectPlugin,
  SummaryChartHeaderPlugin,
  barChartRenderer,
  pieChartRenderer,
  summaryAggregateRenderer,
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
          summaryAggregateRenderer(h, summary, { showAvg: true }),
      },
      {
        prop: 'Total Spend',
        name: 'Total Spend',
        summaryVNode: (h: HyperFunc<VNode>, summary: Record<string, number>) =>
          summaryAggregateRenderer(h, summary, { showSum: true }),
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
      thresholds: [
        { value: high, className: 'high' },
        { value: medium, className: 'medium' },
        { value: 0, className: 'low' },
      ],
    },
  });
}

export const ECOMMERCE_COLUMNS_TYPES = {};
export const ECOMMERCE_PLUGINS = [
  RowSelectPlugin,
  ColumnGroupPanelPlugin,
  SummaryChartHeaderPlugin,
] as (typeof BasePlugin)[];
