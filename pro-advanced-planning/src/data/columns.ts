import type { ColumnFilterConfig, ColumnRegular } from '@revolist/revogrid';
import { avatarWithTextRenderer, FIlTER_SELECTION } from '@revolist/revogrid-pro';
import {
  createDefaultTaskTableColumn,
} from '@revolist/gantt';
import { getOwnerAvatar, planningPeople } from './fixtures';
import {
  FILTER_CALENDAR_RANGE,
  FILTER_CHIP_BADGE_TOGGLES,
  FILTER_HISTOGRAM_BRUSH,
  FILTER_RATING_PROGRESS_THRESHOLD,
  FILTER_TIME_MATRIX,
  planningStructuredFilterTypes,
} from './planning.structured';

const ownerEditorOptions = planningPeople.map(({ id, name }) => ({
  value: id,
  label: name,
  owner: name,
  ownerAvatar: getOwnerAvatar(id),
}));

const dateCellTemplate: NonNullable<ColumnRegular['cellTemplate']> = (
  _h,
  { value },
) => {
  const date = new Date(String(value ?? ''));
  return Number.isNaN(date.valueOf()) ? '' : new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', timeZone: 'UTC',
  }).format(date);
};

const activityTimeCellTemplate: NonNullable<ColumnRegular['cellTemplate']> = (
  _h,
  { value },
) => {
  const date = new Date(String(value ?? ''));
  return Number.isNaN(date.valueOf()) ? '' : new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC',
  }).format(date);
};

const workflowLabels: Record<string, string> = {
  'not-started': 'Planned',
  'in-progress': 'In progress',
  blocked: 'Blocked',
  done: 'Done',
};

const workflowCellTemplate: NonNullable<ColumnRegular['cellTemplate']> = (h, { value }) =>
  h('span', { class: `planning-status planning-status--${String(value)}` }, workflowLabels[String(value)] ?? String(value));

const priorityCellTemplate: NonNullable<ColumnRegular['cellTemplate']> = (h, { value }) => {
  const priority = Number(value);
  const label = priority >= 900 ? 'Critical' : priority >= 700 ? 'High' : 'Normal';
  return h('span', { class: `planning-priority planning-priority--${label.toLowerCase()}` }, label);
};

export const planningFilterConfig = {
  structuredFilterTypes: planningStructuredFilterTypes,
  selection: {
    syncCellTemplate: {
      owner: true,
      priority: true,
    },
  },
} satisfies ColumnFilterConfig;

const workflowStatusColumn = createDefaultTaskTableColumn('workflowStatus');
const percentDoneColumn = createDefaultTaskTableColumn('percentDone');

export const gridColumns: ColumnRegular[] = [
  { prop: '_selected', name: '', size: 36, pin: 'colPinStart', rowSelect: true, readonly: true, filter: false },
  { prop: 'name', name: 'Task', size: 220, sortable: true, filter: false },
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
    avatarProp: 'ownerAvatar',
    avatarLabelProp: 'owner',
    avatarSize: 20,
    cellTemplate: avatarWithTextRenderer,
  },
  {
    ...workflowStatusColumn,
    name: 'Status',
    size: 132,
    sortable: true,
    filter: [FILTER_CHIP_BADGE_TOGGLES],
    filterPlaceholder: 'All statuses',
    cellTemplate: workflowCellTemplate,
  },
  {
    prop: 'priority', name: 'Priority', size: 88, readonly: true, sortable: true, filter: [FIlTER_SELECTION], filterPlaceholder: 'All priorities', cellTemplate: priorityCellTemplate,
  },
  {
    prop: 'endDate',
    name: 'Due date',
    size: 100,
    readonly: true,
    sortable: true,
    filter: [FILTER_CALENDAR_RANGE],
    cellTemplate: dateCellTemplate,
  },
  {
    ...percentDoneColumn,
    name: 'Progress',
    size: 116,
    sortable: true,
    filter: [FILTER_RATING_PROGRESS_THRESHOLD],
  },
  { prop: 'budget', name: 'Budget', size: 96, readonly: true, sortable: true, filter: [FILTER_HISTOGRAM_BRUSH],
    cellTemplate: (_h, { value }) => `$${Number(value ?? 0).toLocaleString('en-US')}` },
  { prop: 'activityAt', name: 'Activity time', size: 144, readonly: true, sortable: true, filter: [FILTER_TIME_MATRIX],
    cellTemplate: activityTimeCellTemplate },
];

export const ganttColumns = [
  createDefaultTaskTableColumn('name'),
  createDefaultTaskTableColumn('assignees'),
  createDefaultTaskTableColumn('startDate'),
  createDefaultTaskTableColumn('endDate'),
  createDefaultTaskTableColumn('percentDone'),
];
