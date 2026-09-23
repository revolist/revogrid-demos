import type { ColumnRegular, GridPlugin } from '@revolist/revogrid';
import { PivotPlugin, type PivotConfig, type PivotConfigDimension } from '@revolist/pivot';
import { commonAggregators } from '@revolist/revogrid-pro';
import { averageResolvedHours } from './tickets';

const measures = { sum: commonAggregators.sum, avg: (values: unknown[]) => averageResolvedHours(values as Array<number | null>) };

export const dimensions: PivotConfigDimension[] = [
  { prop: 'Team', sortable: true, filter: ['string', 'selection'] },
  { prop: 'Priority', sortable: true, filter: ['string', 'selection'] },
  { prop: 'Category', sortable: true, filter: ['string', 'selection'] },
  { prop: 'SLA Status', sortable: true, filter: ['string', 'selection'] },
  { prop: 'Ticket Count', aggregators: { sum: measures.sum } },
  { prop: 'Resolution Hours', aggregators: { avg: measures.avg } },
  { prop: 'SLA Breach Count', aggregators: { sum: measures.sum } },
];

export const columns: ColumnRegular[] = dimensions.map(dimension => ({ ...dimension, size: 160 }));
export const plugins: GridPlugin[] = [PivotPlugin] as GridPlugin[];

export const pivotConfig: PivotConfig = {
  dimensions,
  rows: ['Team'],
  columns: ['Priority'],
  values: [
    { prop: 'Ticket Count', aggregator: 'sum' },
    { prop: 'Resolution Hours', aggregator: 'avg' },
    { prop: 'SLA Breach Count', aggregator: 'sum' },
  ],
  filters: ['Category', 'SLA Status'],
  hasConfigurator: false,
  totals: { subtotals: true, grandTotal: true, grandTotalLabel: 'All tickets' },
};
