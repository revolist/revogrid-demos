import type { ColumnRegular, ColumnTypes } from '@revolist/revogrid';
import NumberColumnType from '@revolist/revogrid-column-numeral';
import {
  AdvanceFilterPlugin,
  ColumnStretchPlugin,
  FilterHeaderPlugin,
  FIlTER_SELECTION,
  RowOddPlugin,
  columnTypeRenderer,
} from '@revolist/revogrid-pro';
import {
  FILTER_ARRAY_TAGS,
  FILTER_CALENDAR_RANGE,
  FILTER_CHIP_BADGE_TOGGLES,
  FILTER_FUZZY,
  FILTER_HISTOGRAM_BRUSH,
  FILTER_RATING_PROGRESS_THRESHOLD,
  FILTER_REGEX,
  FILTER_RELATIVE_WINDOW,
  FILTER_STATISTICAL_PRESETS,
  FILTER_TIME_MATRIX,
  FILTER_TIMELINE_BRUSH,
  FILTER_TOKEN_LIST,
  FILTER_TRI_STATE_BOOLEAN,
} from './filtering.structured';

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
      filter: [FILTER_TOKEN_LIST],
      columnType: 'id',
      columnTemplate: columnTypeRenderer,
    },
    {
      name: 'Customer',
      prop: 'customer',
      size: 175,
      filter: [FILTER_FUZZY],
      columnType: 'string',
      columnTemplate: columnTypeRenderer,
    },
    {
      name: 'SKU',
      prop: 'sku',
      size: 150,
      filter: [FILTER_REGEX],
      columnType: 'string',
      columnTemplate: columnTypeRenderer,
    },
    {
      name: 'Total',
      prop: 'total',
      size: 152,
      filter: [FILTER_HISTOGRAM_BRUSH],
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
      name: 'Priority',
      prop: 'priority',
      size: 140,
      filter: [FILTER_CHIP_BADGE_TOGGLES],
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
      filter: [FILTER_TRI_STATE_BOOLEAN],
      columnType: 'boolean',
      columnTemplate: columnTypeRenderer,
    },
    {
      name: 'Order date',
      prop: 'orderDate',
      size: 180,
      filter: [FILTER_CALENDAR_RANGE],
      columnType: 'date',
      columnTemplate: columnTypeRenderer,
    },
    {
      name: 'Rating',
      prop: 'rating',
      size: 124,
      filter: [FILTER_RATING_PROGRESS_THRESHOLD],
      columnType: 'number',
      columnTemplate: columnTypeRenderer,
    },
    {
      name: 'Margin change',
      prop: 'marginDelta',
      size: 156,
      filter: [FILTER_STATISTICAL_PRESETS],
      columnType: 'number',
      columnTemplate: columnTypeRenderer,
    },
    {
      name: 'Renewal date',
      prop: 'renewalDate',
      size: 180,
      filter: [FILTER_RELATIVE_WINDOW],
      columnType: 'date',
      columnTemplate: columnTypeRenderer,
    },
    {
      name: 'Created at',
      prop: 'createdAt',
      size: 190,
      filter: [FILTER_TIMELINE_BRUSH],
      columnType: 'datetime',
      columnTemplate: columnTypeRenderer,
    },
    {
      name: 'Activity time',
      prop: 'activityAt',
      size: 190,
      filter: [FILTER_TIME_MATRIX],
      columnType: 'datetime',
      columnTemplate: columnTypeRenderer,
    },
    {
      name: 'Tags',
      prop: 'tags',
      size: 220,
      filter: [FILTER_ARRAY_TAGS],
      columnTemplate: columnTypeRenderer,
    },
  ];
}
