import type { DataGridContextMenuConfig } from '@revolist/revogrid-pro';

/** Keep the authored layout and grouping of the advanced grid examples. */
export const advancedColumnMenu: DataGridContextMenuConfig = {
  hiddenItems: {
    'menu.grouping': context => context.surface === 'columnHeader',
    'menu.pin': true,
    'menu.move': true,
    'menu.size': true,
    'columnGroup.autoSize': true,
  },
};
