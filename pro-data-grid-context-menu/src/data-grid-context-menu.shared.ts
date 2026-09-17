import {
  InMemoryGridNoteAdapter,
  type DataGridContextMenuConfig,
  type GridNote,
  type GridNotesConfig,
} from '@revolist/revogrid-pro';
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

const NOTE_AUTHOR = {
  id: 'jordan-kim',
  name: 'Jordan Kim',
  color: '#2563eb',
};

const CELL_NOTES: readonly GridNote[] = [{
  id: 'note-ada-score',
  target: { kind: 'cell', rowKey: '101', colProp: 'score' },
  body: 'Confirm the score after the next platform review.',
  severity: 'info',
  mentions: [],
  excerpt: 'Confirm the score after the next platform review.',
  author: NOTE_AUTHOR,
  createdAt: '2026-09-17T09:00:00.000Z',
  updatedAt: '2026-09-17T09:00:00.000Z',
  version: 1,
  versionCount: 1,
}, {
  id: 'note-alan-status',
  target: { kind: 'cell', rowKey: '105', colProp: 'status' },
  body: 'Keep this record archived until the migration is complete.',
  severity: 'warning',
  mentions: [],
  excerpt: 'Keep this record archived until the migration is complete.',
  author: NOTE_AUTHOR,
  createdAt: '2026-09-16T15:30:00.000Z',
  updatedAt: '2026-09-16T15:30:00.000Z',
  version: 1,
  versionCount: 1,
}];

/** Demonstrates cell-note markers with application-owned, stable row IDs. */
export function createDataGridContextMenuNotes(): GridNotesConfig<TeamRow> {
  return {
    adapter: new InMemoryGridNoteAdapter(CELL_NOTES),
    getRowId: row => row.id,
    getRowLabel: row => row.name,
    getCurrentUser: () => NOTE_AUTHOR,
    excel: { includeNotesSheet: true },
  };
}

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
