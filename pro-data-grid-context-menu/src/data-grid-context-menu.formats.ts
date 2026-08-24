import type { ColumnDataSchemaModel } from '@revolist/revogrid';
import {
  DropdownEditor,
  badgeRenderer,
  type DataGridAdvancedFormatDefinition,
  type DropdownColumnProps,
} from '@revolist/revogrid-pro';

export const STATUS_BADGE_STYLES = {
  Active: { backgroundColor: '#dcfce7', color: '#166534' },
  Review: { backgroundColor: '#fef3c7', color: '#92400e' },
  Archived: { backgroundColor: '#fee2e2', color: '#991b1b' },
} as const;

const STATUS_VALUES = ['Active', 'Review', 'Archived'] as const;

const statusDropdown: DropdownColumnProps = {
  source: [
    ...STATUS_VALUES.map(value => ({ value, label: value })),
    { value: null, label: 'Not set' },
  ],
  placeholder: 'Select status',
  config: { ariaLabel: 'Status', search: false, multiSelect: false },
  syncCellTemplate: true,
  cellTemplate: badgeRenderer,
};

function dropdownSchema(
  schema: ColumnDataSchemaModel,
  dropdown: DropdownColumnProps,
): ColumnDataSchemaModel {
  return {
    ...schema,
    column: {
      ...schema.column,
      badgeStyles: STATUS_BADGE_STYLES,
      cellTemplate: badgeRenderer,
      dropdown,
    },
  };
}

/**
 * Application formats used by the showcase. The editor is resolved from the
 * effective cell presentation, so no column-wide dropdown contract is needed.
 */
export function createDataGridContextMenuFormats(): readonly DataGridAdvancedFormatDefinition[] {
  return [
    {
      id: 'status-dropdown',
      label: 'Status dropdown',
      group: 'Application',
      order: 1,
      valueKind: 'text',
      isCompatible: ({ value }) => value == null
        || STATUS_VALUES.includes(value as typeof STATUS_VALUES[number]),
      cellTemplate: badgeRenderer,
      defaults: { badgeStyles: STATUS_BADGE_STYLES, rectangular: false },
      editorFactory: ({ schema, save, close }) => new DropdownEditor(
        dropdownSchema(schema, statusDropdown),
        save,
        close,
      ),
      replaceAuthoredTemplate: true,
      replaceAuthoredEditor: true,
    },
  ];
}
