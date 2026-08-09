import type { ColumnRegular } from '@revolist/revogrid';
import { avatarWithTextRenderer } from '@revolist/revogrid-pro';
import {
  createDefaultTaskTableColumn,
  formatGanttTableDate,
} from '@revolist/revogrid-enterprise';
import { ganttConfig } from './config';

const dateCellTemplate: NonNullable<ColumnRegular['cellTemplate']> = (
  _h,
  { value, prop },
) => formatGanttTableDate(String(value ?? ''), ganttConfig, String(prop));

const workflowStatusColumn = createDefaultTaskTableColumn('workflowStatus');
const percentDoneColumn = createDefaultTaskTableColumn('percentDone');

export const gridColumns: ColumnRegular[] = [
  { prop: 'name', name: 'Task', size: 180, filter: true, sortable: true },
  {
    prop: 'owner',
    name: 'Owner',
    size: 150,
    filter: true,
    sortable: true,
    avatarProp: 'ownerAvatar',
    avatarLabelProp: 'owner',
    avatarSize: 20,
    cellTemplate: avatarWithTextRenderer,
  },
  {
    ...workflowStatusColumn,
    name: 'Status',
    size: 148,
    readonly: true,
    filter: true,
    sortable: true,
  },
  {
    prop: 'startDate',
    name: 'Start',
    size: 210,
    readonly: true,
    filter: true,
    sortable: true,
    cellTemplate: dateCellTemplate,
  },
  {
    prop: 'endDate',
    name: 'End',
    size: 210,
    readonly: true,
    filter: true,
    sortable: true,
    cellTemplate: dateCellTemplate,
  },
  {
    ...percentDoneColumn,
    name: 'Progress',
    size: 110,
    filter: true,
    sortable: true,
  },
];

export const ganttColumns = [
  createDefaultTaskTableColumn('name'),
  createDefaultTaskTableColumn('assignees'),
  createDefaultTaskTableColumn('startDate'),
  createDefaultTaskTableColumn('endDate'),
  createDefaultTaskTableColumn('percentDone'),
];
