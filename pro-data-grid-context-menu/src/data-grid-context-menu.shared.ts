import type { DataGridContextMenuConfig } from '@revolist/revogrid-pro';
import * as RevoGridPro from '@revolist/revogrid-pro';
import DateColumnType from '@revolist/revogrid-column-date';
import { createContextMenuDetailsItems } from './data-grid-context-menu.details';
import {
  createTeamRowForAction,
  createTeamRows,
  STATUS_BADGE_STYLES,
  type TeamRow,
} from './data-grid-context-menu.data';

export * from './data-grid-context-menu.data';

const { ColumnDropdown } = RevoGridPro;
const dateColumnType = new DateColumnType();
const BOOLEAN_LOCALE_TEXT = {
  yes: 'Yes',
  no: 'No',
  notSet: 'Not set',
  editorAriaLabel: 'Boolean value',
};
const nativeBooleanColumnType = Reflect.get(
  RevoGridPro,
  'createBooleanColumnType',
) as typeof RevoGridPro.createBooleanColumnType | undefined;
const createBooleanColumnType = nativeBooleanColumnType ?? ((options = {}) => {
  const localeText = { ...BOOLEAN_LOCALE_TEXT, ...options.localeText };
  return {
    ...ColumnDropdown,
    cellTemplate: (_h, { value }) => value === true
      ? localeText.yes
      : value === false
        ? localeText.no
        : '',
    beforeSetup: (column) => {
      column.dropdown = {
        source: [
          { value: true, label: localeText.yes },
          { value: false, label: localeText.no },
          { value: null, label: localeText.notSet },
        ],
        config: {
          search: false,
          multiSelect: false,
          ariaLabel: localeText.editorAriaLabel,
        },
      };
      ColumnDropdown.beforeSetup?.(column);
    },
  } satisfies typeof ColumnDropdown;
});

export function createDataGridColumnTypes() {
  return {
    boolean: createBooleanColumnType({ localeText: BOOLEAN_LOCALE_TEXT }),
    dropdown: ColumnDropdown,
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
