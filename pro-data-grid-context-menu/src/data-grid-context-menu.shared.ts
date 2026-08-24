import type { DataGridContextMenuConfig } from '@revolist/revogrid-pro';
import DateColumnType from '@revolist/revogrid-column-date';
import { createContextMenuDetailsItems } from './data-grid-context-menu.details';
import {
  createDataGridContextMenuFormats,
  STATUS_BADGE_STYLES,
} from './data-grid-context-menu.formats';
import {
  createTeamRowForAction,
  createTeamRows,
  type TeamRow,
} from './data-grid-context-menu.data';

export * from './data-grid-context-menu.data';

const dateColumnType = new DateColumnType();

export function createDataGridContextMenuConfig(): DataGridContextMenuConfig<TeamRow> {
  let nextRowId = Math.max(...createTeamRows().map(row => row.id)) + 1;
  let nextColumnId = 1;

  return {
    // Full row/column snapshots are opt-in so hidden model or schema fields stay private by default.
    inspection: { includeRowData: true, includeColumnData: true },
    formatting: {
      advancedFormats: {
        presetEditors: { date: dateColumnType.editor },
        customFormats: createDataGridContextMenuFormats(),
        // Demonstrates that every built-in can be configured or removed.
        formats: {
          pie: false,
          badge: {
            replaceAuthoredTemplate: true,
            defaults: {
              badgeStyles: STATUS_BADGE_STYLES,
            },
          },
        },
      },
    },
    rowPinning: true,
    createRow: ({ action, sourceRow }) => createTeamRowForAction(
      nextRowId++,
      action,
      sourceRow,
    ),
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
