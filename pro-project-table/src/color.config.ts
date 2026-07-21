import {
  type ColumnRegular,
  GROUP_DEPTH,
  type GroupLabelTemplateFunc,
  isGrouping,
  dispatch,
  type ColumnProp,
} from '@revolist/revogrid';

import NumberColumnType from '@revolist/revogrid-column-numeral';

import {
  AdvanceFilterPlugin,
  FilterHeaderPlugin,
  editorTimeline,
  avatarRenderer,
  linkRenderer,
  arrayRenderer,
  ColumnHidePlugin,
  extendTemplates,
  circularProgressRenderer,
  editorSlider,
  TooltipPlugin,
  commonAggregators,
  getGroupingData,
  defineDropdown,
  type DropdownOption,
} from '@revolist/revogrid-pro';
import { getColorByWeekDiff, getGroupByDate } from './color.utils';
import { STATUS, PRIORITY, TAGS } from './color.data';

export const PLUGINS_COLOR = [
  AdvanceFilterPlugin,
  FilterHeaderPlugin,
  ColumnHidePlugin,
  TooltipPlugin,
];

const currencyFormat = '$0,0.[00]';

export const COLUMNS_COLOR: ColumnRegular[] = [
  {
    name: 'Task',
    prop: 'task',
    pin: 'colPinStart',
    filter: ['string'],
    size: 250,
    filterPlaceholder: 'Search task',
    // set progress value based on status and progress fields
    progress: ({ model }) => {
      const item1 = model.progress ?? 0;
      const item2 = model.status === 'Complete' ? 100 : 0;
      return (item1 + item2) / 2;
    },
    showValue: true,
    // set thresholds for progress color
    thresholds: [
      { value: 0, className: 'low' },
      { value: 50, className: 'medium' },
      { value: 75, className: 'high' },
    ],
    // set cell multiple template for task column
    cellTemplate: extendTemplates(
      // set color marker side template
      (h, props) => {
        const store = props.providers.data;
        const items = store.get('items');
        const source = store.get('source');
        const weekDiff = getGroupByDate(props.model.week);
        const color = getColorByWeekDiff(weekDiff);
        for (let i = props.rowIndex - 1; i >= 0; i--) {
          const item = items[i];
          const sourceItem = source[item];
          if (isGrouping(sourceItem)) {
            return h('div', {
              class: 'marker-side',
              style: {
                backgroundColor: color,
              },
            });
          }
        }
      },
      // set cell value template
      (h, { value }) => h('div', { class: 'overflow-hidden grow' }, value),
      // set progress template
      (h, schema) =>
        h(
          'div',
          {
            'data-tooltip': 'Task progress based on Status and Progress fields',
            'tooltip-position': 'bottom',
          },
          circularProgressRenderer(h, schema),
        ),
    ),
  },
  {
    name: 'Owner',
    prop: 'avatar',
    readonly: true,
    size: 100,
    filter: false,
    // set column template for owner column with empty name in top header
    columnTemplate: () => '',
    // set cell template for owner column with avatar renderer
    cellTemplate: avatarRenderer,
  },
  {
    name: 'Priority',
    prop: 'priority',
    size: 120,
    filterPlaceholder: 'Priority',
    filter: ['selection'],
    // set column type for priority column with dropdown
    columnType: 'dropdown',
    // set dropdown config for priority column
    dropdown: {
      // set render selected value for priority column
      renderSelectedValue: (h, selectedOptions, children) => {
        return h(
          'div',
          {
            class: 'px-2 grow flex justify-between',
            style: {
              backgroundColor: selectedOptions[0].color,
            },
          },
          selectedOptions[0].label,
          children,
        );
      },
      // set render option for priority column
      renderOption: (h, option) => {
        return h(
          'div',
          {
            class: 'px-2 py-1',
            style: {
              backgroundColor: option.color,
            },
          },
          option.label,
        );
      },
      // set dropdown source for priority column
      source: PRIORITY,
    },
  },
  {
    name: 'Status',
    prop: 'status',
    size: 120,
    filterPlaceholder: 'Status',
    filter: ['selection'],
    columnType: 'dropdown',
    // set dropdown config for status column
    dropdown: {
      // set dropdown source for status column
      source: STATUS,
      // set render selected value for status column
      renderSelectedValue: (h, selectedOptions, children) => {
        return h(
          'div',
          {
            class: 'px-2 grow flex justify-between',
            style: {
              backgroundColor: selectedOptions[0].color,
            },
          },
          selectedOptions[0].label,
          children,
        );
      },
      // set render option for status column
      renderOption: (h, option) => {
        return h(
          'div',
          {
            class: 'px-2 py-1',
            style: {
              backgroundColor: option.color,
            },
          },
          option.label,
        );
      },
    },
  },
  {
    name: 'Progress',
    prop: 'progress',
    size: 150,
    filterPlaceholder: 'Progress',
    filter: ['number'],
    // set cell template for progress column with editor slider
    cellTemplate: editorSlider,
  },
  // set timeline column with editor timeline
  {
    name: 'Timeline',
    prop: 'timeline',
    size: 150,
    filterPlaceholder: 'When?',
    filter: false,
    readonly: true,
    // set column template for timeline column with empty name in top header
    columnTemplate: () => '',
    // set cell template for timeline column with editor timeline
    cellTemplate: editorTimeline,
    // set progress value based on progress field
    progress: ({ model }) =>  model.progress ?? 0,
    // set thresholds for progress color
    thresholds: [
      { value: 0, className: 'low' },
      { value: 50, className: 'medium' },
      { value: 75, className: 'high' },
    ],
  },
  // set budget column with currency column type
  {
    name: 'Budget',
    prop: 'budget',
    size: 150,
    columnType: 'currency',
    filterPlaceholder: 'How much?',
    filter: ['number'],
    // pass column calculatation to grouping
    groupingAggregatorTemplate: ((h, props, column: ColumnRegular) => {
      const currentDepth = props.model?.[GROUP_DEPTH];
      // get summary for budget column
      const summary = getGroupingData({
        store: props.providers.data,
        itemIndex: props.itemIndex,
        currentDepth,
        columnProp: column.prop,
        // set aggregator for budget column
        aggregator: commonAggregators.sum,
      }).aggregationValue;
      // set cell template for budget column
      return h(
        'span',
        {
          // set tooltip for budget column
          ['data-tooltip']: 'Total budget spent',
          class:
            'badge flex items-center justify-center ml-2 px-2 py-0.5 text-xs font-medium rounded-md',
        },
        // set cell number format for budget column
        NumberColumnType.getNumeralInstance()(summary).format(currencyFormat),
      );
    }) as GroupLabelTemplateFunc,
  },
  // set tags column with dropdown column type
  {
    name: 'Tags',
    prop: 'tags',
    size: 250,
    filterPlaceholder: 'Tags',
    columnType: 'dropdown',
    dropdown: {
      config: {
        multiSelect: true,
      },
      source: TAGS,
    },
  },
  // set links column with array renderer
  {
    name: 'Links',
    prop: 'links',
    size: 250,
    cellTemplate: arrayRenderer(linkRenderer, {
      separator: ' | ',
      wrapper: 'div',
      wrapperClass: 'multi-data-container',
    }),
  },
];

// set column dropdown options for new column
const columnDropdownOptions = [...COLUMNS_COLOR].map((col) => ({
  value: col.prop,
  label: col.name,
})).filter((col) => !!col.label);

// set column properties for new column
const ADD_COLUMNS: ColumnRegular = {
  prop: 'new',
  size: 50,
  pin: 'colPinEnd',
  readonly: true,
  filter: false,
  // set column properties for new column
  columnProperties: () => ({
    class: 'flex',
  }),
  // set column dropdown options for new column
  columnDropdownOptions,
  // set visible columns for new column, we will use this to toggle hide columns in dropdown
  visibleColumns: columnDropdownOptions.map((col) => col.value),
  // set column template for new column
  columnTemplate: (h, props) => {
    return h('div', {
      // subscribe to element ref for new column
      ref: (el?: HTMLButtonElement) => {
        if (el) {
          // set dropdown for new column
          defineDropdown(el, {
            // set dropdown source for new column
            source: props.columnDropdownOptions,
            config: {
              // set multi select for new column
              multiSelect: true,
              // set dropdown menu class name for new column
              popupClassName: 'dropdown-menu-color',
            },
            value: props.visibleColumns,
            renderSelectedValue: (h) => h('button', { class: 'insert-column' }),
            renderOption: (h, option, isSelected) => h('div', { class: 'label px-2 py-1' }, [
                h('input', {
                  type: 'checkbox',
                  checked: isSelected,
                }),
                h('span', {
                  class: 'toggle-box',
                }),
                option.label,
            ]),
            // set onChange for new column
            onChange(value) {
              const visibleProps = new Set(value);
              const hiddenColumns = props.columnDropdownOptions.reduce((acc: ColumnProp[], col: DropdownOption) => {
                if (!visibleProps.has(col.value)) {
                  acc.push(col.value);
                }
                return acc;
              }, []);
              props.visibleColumns.length = 0;
              props.visibleColumns.push(...value);
              dispatch(el, 'toggle-hide-column', hiddenColumns);
            },
          });
        }
      },
    });
  }
};

// set new column to columns
COLUMNS_COLOR.push(ADD_COLUMNS);
