import type { ColumnFilterConfig, ColumnRegular } from '@revolist/revogrid';
import {
  avatarWithTextRenderer,
  ColumnDropdown,
  FIlTER_SELECTION,
} from '@revolist/revogrid-pro';
import {
  createDefaultTaskTableColumn,
} from '@revolist/gantt';
import { getOwnerAvatarIndex, planningPeople } from './fixtures';
import {
  FILTER_CALENDAR_RANGE,
  FILTER_CHIP_BADGE_TOGGLES,
  FILTER_HISTOGRAM_BRUSH,
  FILTER_RATING_PROGRESS_THRESHOLD,
  FILTER_TIME_MATRIX,
  planningStructuredFilterTypes,
} from './planning.structured';
import { planningGridFormats, workflowStatusBadgeRenderer, workflowStatusBadgeStyles } from './formatting';

const ownerEditorOptions = planningPeople.map(({ id, name }) => ({
  value: id,
  label: name,
  owner: name,
  ownerAvatarIndex: getOwnerAvatarIndex(id),
}));

const workflowLabels: Record<string, string> = {
  'not-started': 'Planned',
  'in-progress': 'In progress',
  blocked: 'Blocked',
  done: 'Done',
};

const workflowEditorOptions = Object.entries(workflowLabels).map(([value, label]) => ({
  value,
  label,
}));

const paddedCellProperties: NonNullable<ColumnRegular['cellProperties']> = () => ({
  style: { padding: '0 16px' },
});

export const planningFilterConfig = {
  structuredFilterTypes: planningStructuredFilterTypes,
  multiFilterItems: {
    workflowStatus: [{
      id: 0,
      type: 'chipBadgeSelection',
      value: { values: ['in-progress', 'blocked', 'not-started'], includeBlanks: false },
      relation: 'and',
    }],
  },
  selection: {
    syncCellTemplate: {
      owner: true,
      priority: true,
    },
  },
} satisfies ColumnFilterConfig;

const percentDoneColumn = createDefaultTaskTableColumn('percentDone');

export const gridColumnTypes = {
  dropdown: ColumnDropdown,
};

export const gridColumns: ColumnRegular[] = [
  { prop: '_selected', name: '', size: 48, pin: 'colPinStart', rowSelect: true, readonly: true, filter: false },
  { prop: 'name', name: 'Task', size: 220, pin: 'colPinStart', sortable: true, filter: [FIlTER_SELECTION], filterPlaceholder: 'All tasks', dataGridFormat: planningGridFormats.name },
  {
    prop: 'owner',
    name: 'Owner',
    size: 120,
    sortable: true,
    filter: [FIlTER_SELECTION],
    columnType: 'dropdown',
    dropdown: {
      source: ownerEditorOptions,
      syncCellTemplate: true,
    },
    avatarIndexProp: 'ownerAvatarIndex',
    avatarLabelProp: 'owner',
    avatarSize: 16,
    cellTemplate: avatarWithTextRenderer,
    cellProperties: paddedCellProperties,
    dataGridFormat: planningGridFormats.owner,
  },
  {
    prop: 'workflowStatus',
    name: 'Status',
    size: 132,
    sortable: true,
    filter: [FILTER_CHIP_BADGE_TOGGLES],
    filterPlaceholder: 'All statuses',
    columnType: 'dropdown',
    dropdown: {
      source: workflowEditorOptions,
      syncCellTemplate: true,
      cellTemplate: workflowStatusBadgeRenderer,
    },
    badgeStyles: workflowStatusBadgeStyles,
    cellProperties: paddedCellProperties,
    dataGridFormat: planningGridFormats.workflowStatus,
  },
  {
    prop: 'priority', name: 'Priority', size: 110, readonly: true, sortable: true, filter: [FIlTER_SELECTION], filterPlaceholder: 'All priorities', cellProperties: paddedCellProperties, dataGridFormat: planningGridFormats.priority,
  },
  {
    prop: 'endDate',
    name: 'Due date',
    size: 130,
    readonly: true,
    sortable: true,
    filter: [FILTER_CALENDAR_RANGE],
    dataGridFormat: planningGridFormats.endDate,
  },
  {
    ...percentDoneColumn,
    name: 'Progress',
    size: 116,
    sortable: true,
    filter: [FILTER_RATING_PROGRESS_THRESHOLD],
    dataGridFormat: planningGridFormats.percentDone,
  },
  { prop: 'budget', name: 'Budget', size: 96, readonly: true, sortable: true, filter: [FILTER_HISTOGRAM_BRUSH], dataGridFormat: planningGridFormats.budget },
  { prop: 'activityAt', name: 'Activity time', size: 173, readonly: true, sortable: true, filter: [FILTER_TIME_MATRIX], dataGridFormat: planningGridFormats.activityAt },
];

export const ganttColumns = [
  createDefaultTaskTableColumn('name'),
  createDefaultTaskTableColumn('assignees'),
  createDefaultTaskTableColumn('startDate'),
  createDefaultTaskTableColumn('endDate'),
  createDefaultTaskTableColumn('percentDone'),
];
