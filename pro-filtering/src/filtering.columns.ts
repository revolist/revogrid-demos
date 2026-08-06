import type { ColumnRegular, ColumnTypes } from '@revolist/revogrid';
import NumberColumnType from '@revolist/revogrid-column-numeral';
import {
  AdvanceFilterPlugin,
  ColumnStretchPlugin,
  FILTER_DATE,
  FilterHeaderPlugin,
  FIlTER_SELECTION,
  FIlTER_SLIDER,
  RowOddPlugin,
  columnTypeRenderer,
} from '@revolist/revogrid-pro';

export const orderExplorerPlugins = [
  AdvanceFilterPlugin,
  FilterHeaderPlugin,
  ColumnStretchPlugin,
  RowOddPlugin,
];

export function createOrderExplorerColumnTypes(): ColumnTypes {
  return {
    currency: new NumberColumnType('$0,0.00'),
  };
}

// Filtering starts in the column definition: choose a built-in filter or a Pro filter type.
export function createOrderExplorerColumns(): ColumnRegular[] {
  return [
    {
      name: 'Order',
      prop: 'orderNumber',
      size: 148,
      filter: 'string',
      columnType: 'id',
      columnTemplate: columnTypeRenderer,
    },
    {
      name: 'Customer',
      prop: 'customer',
      size: 175,
      filter: 'string',
      columnType: 'string',
      columnTemplate: columnTypeRenderer,
    },
    {
      name: 'Total',
      prop: 'total',
      size: 152,
      filter: ['number', FIlTER_SLIDER],
      columnType: 'currency',
      columnTemplate: columnTypeRenderer,
    },
    {
      name: 'Status',
      prop: 'status',
      size: 150,
      filter: [FIlTER_SELECTION],
      columnType: 'string',
      columnTemplate: columnTypeRenderer,
    },
    {
      name: 'Region',
      prop: 'region',
      size: 170,
      filter: [FIlTER_SELECTION],
      columnType: 'string',
      columnTemplate: columnTypeRenderer,
    },
    {
      name: 'City',
      prop: 'city',
      size: 150,
      filter: 'string',
      columnType: 'string',
      columnTemplate: columnTypeRenderer,
    },
    {
      name: 'Category',
      prop: 'category',
      size: 152,
      filter: [FIlTER_SELECTION],
      columnType: 'string',
      columnTemplate: columnTypeRenderer,
    },
    {
      name: 'Expedited',
      prop: 'expedited',
      size: 116,
      filter: [FIlTER_SELECTION],
      columnType: 'boolean',
      columnTemplate: columnTypeRenderer,
    },
    {
      name: 'Order date',
      prop: 'orderDate',
      size: 180,
      filter: [FILTER_DATE],
      columnType: 'date',
      columnTemplate: columnTypeRenderer,
    },
  ];
}
