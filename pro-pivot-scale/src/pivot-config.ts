import type { PivotConfig } from '@revolist/pivot';

export const VIEW_ID = 'scale-sales-v1';
export const FIELDS_VERSION = 'scale-sales-fields-v1';

export function createScalePivotConfig(): PivotConfig {
  return {
    dimensions: [
      { prop: 'region', name: 'Region' },
      { prop: 'segment', name: 'Segment' },
      { prop: 'category', name: 'Category' },
      { prop: 'year', name: 'Year' },
      { prop: 'quarter', name: 'Quarter' },
      { prop: 'sales', name: 'Sales (USD)' },
      { prop: 'profit', name: 'Profit (USD)' },
    ],
    rows: ['region', 'segment'],
    columns: ['year', 'quarter'],
    values: [{ prop: 'sales', aggregator: 'sum', label: 'Sales (USD)' }],
    filters: ['category'],
    totals: { grandTotal: true, subtotals: true },
    collapsed: true,
    columnCollapse: { collapsed: true },
    hasConfigurator: true,
  };
}
