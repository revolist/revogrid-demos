import type { ColumnRegular } from '@revolist/revogrid';
import { avatarWithTextRenderer } from '@revolist/revogrid-pro';
import {
  createDefaultTaskTableColumn,
} from '@revolist/gantt';

const dateCellTemplate: NonNullable<ColumnRegular['cellTemplate']> = (
  _h,
  { value },
) => {
  const date = new Date(String(value ?? ''));
  return Number.isNaN(date.valueOf()) ? '' : new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', timeZone: 'UTC',
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

const workflowStatusColumn = createDefaultTaskTableColumn('workflowStatus');
const percentDoneColumn = createDefaultTaskTableColumn('percentDone');

export const gridColumns: ColumnRegular[] = [
  { prop: '_selected', name: '', size: 36, pin: 'colPinStart', rowSelect: true, readonly: true },
  { prop: 'name', name: 'Task', size: 220, sortable: true },
  {
    prop: 'owner',
    name: 'Owner',
    size: 120,
    sortable: true,
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
    cellTemplate: workflowCellTemplate,
  },
  {
    prop: 'priority', name: 'Priority', size: 88, readonly: true, sortable: true, cellTemplate: priorityCellTemplate,
  },
  {
    prop: 'endDate',
    name: 'Due date',
    size: 100,
    readonly: true,
    sortable: true,
    cellTemplate: dateCellTemplate,
  },
  {
    ...percentDoneColumn,
    name: 'Progress',
    size: 116,
    sortable: true,
  },
  { prop: 'budget', name: 'Budget', size: 96, readonly: true, sortable: true,
    cellTemplate: (_h, { value }) => `$${Number(value ?? 0).toLocaleString('en-US')}` },
];

export const ganttColumns = [
  createDefaultTaskTableColumn('name'),
  createDefaultTaskTableColumn('assignees'),
  createDefaultTaskTableColumn('startDate'),
  createDefaultTaskTableColumn('endDate'),
  createDefaultTaskTableColumn('percentDone'),
];
