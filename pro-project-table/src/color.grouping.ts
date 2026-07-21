import {
  type GroupingOptions,
  getSourceItem,
} from '@revolist/revogrid';
import { ignoreCellEvents, EXPAND_ICON } from '@revolist/revogrid-pro';
import { getColorByWeekDiff, getGroupByDate } from './color.utils';

// set grouping options for color showcase
export const GROUPING_COLOR: GroupingOptions = {
  // set grouping by week property
  props: ['week'],
  // set expanded all by default
  expandedAll: true,
  // set group label template for color showcase
  groupLabelTemplate: (h, props) => {
    // get week difference
    const weekDiff = getGroupByDate(props.name);
    // get color by week difference
    const color = getColorByWeekDiff(weekDiff);


    // set label based on week difference
    let label = '';
    if (weekDiff === 0) label = 'This Week';
    else if (weekDiff === 1) label = 'Next Week';
    else if (weekDiff < 0) label = 'Completed';
    else
      label = `${Math.abs(weekDiff)} Weeks ${weekDiff > 0 ? 'Ahead' : 'Ago'}`;

    // set title template for color showcase
    const title = h(
      'div',
      {
        class: 'flex items-center font-semibold',
        style: {
          color,
        },
      },
      label,
    );

    // Add expand button to pin start column
    if (props.providers.colType === 'colPinStart') {
      const expandButton = h(
        'button',
        {
          class: 'tree-toggle',
          expanded: props.expanded,
          style: {
            color,
          },
        },
        EXPAND_ICON,
      );
      return h(
        'div',
        {
          class: 'flex items-center font-semibold gap-1 cursor-pointer',
          style: { color },
        },
        [h('div', undefined, expandButton), title],
      );
    }
    if (props.providers.colType === 'colPinEnd' || !props.expanded) {
      return;
    }


    // Create column headers for grouping
    const store = props.providers.columns;
    const columnHeaders = props.columnItems.map((columnProps, i) => {
        // Get column if visible
        const column = getSourceItem(store, columnProps.itemIndex);
        if (!column) return;

        return h(
          'div',
          {
            ...ignoreCellEvents,
            class: 'flex items-center absolute text-xs subheader',
            style: {
              height: '100%',
              width: `${columnProps.size}px`,
              top: 0,
              left: 0,
              transform: `translateX(${columnProps.start}px)`,
            },
          },
          [
            column?.name,
            column.groupingAggregatorTemplate?.(h, props, column),
          ],
        );
      });

    return h('div', undefined, columnHeaders);
  },
};
