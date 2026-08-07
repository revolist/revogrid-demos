import type { DataGridContextMenuConfig } from '@revolist/revogrid-pro';
import { createContextMenuDetailsItems } from './data-grid-context-menu.details';
import {
  createTeamRows,
  type TeamRow,
} from './data-grid-context-menu.data';

export * from './data-grid-context-menu.data';

export function createDataGridContextMenuConfig(): DataGridContextMenuConfig<TeamRow> {
  let nextRowId = Math.max(...createTeamRows().map(row => row.id)) + 1;
  let nextColumnId = 1;

  return {
    // Full row/column snapshots are opt-in so hidden model or schema fields stay private by default.
    inspection: { includeRowData: true, includeColumnData: true },
    rowPinning: true,
    createRow: ({ action, sourceRow }) => {
      const original = sourceRow as TeamRow | undefined;
      return {
        id: nextRowId++,
        name: original?.name ?? `New ${action === 'insertAbove' ? 'upper' : 'lower'} row`,
        team: original?.team ?? 'Platform',
        status: original?.status ?? 'Review',
        score: original?.score ?? 0,
        owner: original?.owner ?? 'Unassigned',
      } satisfies TeamRow;
    },
    columnSchema: {
      createColumn: ({ action, sourceColumn }) => ({
        ...sourceColumn,
        prop: `${String(sourceColumn.prop)}-${action}-${nextColumnId++}`,
        name: `${sourceColumn.name ?? String(sourceColumn.prop)} copy`,
      }),
    },
    // Add business-oriented application actions after the technical presets.
    items: context => context.surface === 'columnGroupHeader'
      ? []
      : createContextMenuDetailsItems(context),
    // Replace only the grouped-column-header surface; other defaults stay intact.
    getItems: (context, defaults) => context.surface === 'columnGroupHeader'
      ? createContextMenuDetailsItems(context)
      : defaults,
  };
}
