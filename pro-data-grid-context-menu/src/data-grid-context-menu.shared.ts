import {
  InMemoryGridNoteAdapter,
  type DataGridContextMenuConfig,
  type GridNote,
  type GridNotesConfig,
  type GridNoteUser,
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

const NOTE_USERS: GridNoteUser[] = [
  { id: 'morgan', name: 'Morgan Lee' },
  { id: 'riley', name: 'Riley Chen' },
  { id: 'jordan', name: 'Jordan Kim' },
  { id: 'sam', name: 'Sam Carter' },
];

function seededNote(note: Pick<GridNote, 'id' | 'target' | 'body' | 'severity' | 'author'> & Partial<GridNote>): GridNote {
  const timestamp = '2026-09-04T15:30:00.000Z';
  return {
    mentions: [], excerpt: note.body.slice(0, 120), createdAt: timestamp, updatedAt: timestamp,
    version: 1, versionCount: 1, ...note,
  };
}

export function createGridNotesConfig(): GridNotesConfig<TeamRow> {
  const adapter = new InMemoryGridNoteAdapter([
    seededNote({ id: 'score-103', target: { kind: 'cell', rowKey: '103', colProp: 'score' }, body: 'Raw score, not the normalised value — please re-run before close.', severity: 'warning', author: NOTE_USERS[0] }),
    seededNote({ id: 'team-104', target: { kind: 'cell', rowKey: '104', colProp: 'team' }, body: 'Moved from Platform during the Q1 reorganisation.', severity: 'info', author: NOTE_USERS[2] }),
    seededNote({ id: 'row-104', target: { kind: 'row', rowKey: '104' }, body: 'Whole record is on hold until the Systems audit closes.', severity: 'blocker', author: NOTE_USERS[2] }),
    seededNote({ id: 'owner-106', target: { kind: 'cell', rowKey: '106', colProp: 'owner' }, body: 'Owner changed after the reorganisation — confirm with Sam.', severity: 'warning', author: NOTE_USERS[3] }),
    seededNote({ id: 'score-108', target: { kind: 'cell', rowKey: '108', colProp: 'score' }, body: 'Re-weighted figure is ready for review.', severity: 'resolved', author: NOTE_USERS[1] }),
  ]);
  return {
    adapter,
    getRowId: row => row.id,
    getCurrentUser: () => NOTE_USERS[0],
    mentions: {
      async search(query) {
        const normalized = query.toLowerCase();
        return NOTE_USERS.filter(user => user.name.toLowerCase().includes(normalized));
      },
    },
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
