import {
  type EventSchedulerConfig,
  type GanttPluginConfig,
  type KanbanConfig,
} from '@revolist/revogrid-enterprise';
import { planningCalendarId } from './source';
import type { PlanningTask } from './types';

export const kanbanConfig: KanbanConfig<PlanningTask> = {
  columns: [
    { prop: 'not-started', name: 'Not Started' },
    { prop: 'in-progress', name: 'In Progress' },
    { prop: 'done', name: 'Done' },
  ],
  columnField: 'workflowStatus',
  orderField: 'order',
  swimlaneColumn: false,
  card: {
    titleField: 'name',
    startDateField: 'startDate',
    endDateField: 'endDate',
    dateTimeZone: 'UTC',
    progressField: 'percentDone',
    colorField: 'color',
    assigneeField: 'owners',
    assigneeAvatarField: 'ownerAvatars',
  },
  cardRowHeight: 168,
};

export const ganttConfig: GanttPluginConfig = {
  id: 'launch',
  name: 'Launch day',
  version: '1',
  currency: 'USD',
  timeZone: 'UTC',
  primaryCalendarId: planningCalendarId,
  updatedAt: '2026-07-28T00:00:00Z',
  statusDate: '2026-07-28',
  zoomPreset: 'hour-day',
  timelinePrecision: 'hour',
  allowTaskCreate: false,
  contextMenu: {},
  dateFormats: {
    locale: 'en-US',
    timeZone: 'UTC',
    table: { dateStyle: 'medium', timeStyle: 'short' },
  },
  calendars: [
    {
      id: planningCalendarId,
      name: 'Launch day',
      timeZone: 'UTC',
      workingDays: [1, 2, 3, 4, 5],
      workingHours: { start: '08:00', end: '18:00' },
      holidays: [],
      hoursPerDay: 10,
    },
  ],
};

export const schedulerConfig: EventSchedulerConfig = {
  view: 'resourceTimeline',
  weekStartDate: '2026-07-28',
  dateRange: { start: '2026-07-28', end: '2026-07-28' },
  locale: 'en-US',
  timeZone: 'UTC',
  slotMinutes: 60,
  timeRange: { start: '08:00', end: '18:00' },
  rowSize: 50,
  resourceColumnSize: 150,
  timelineColumnSize: 80,
  editable: true,
  allowCreate: false,
  allowMove: true,
  allowResize: true,
  allowDelete: false,
  eventEditorStatusOptions: ['not-started', 'in-progress', 'done'],
  keyboardShortcuts: false,
  currentTimeMarker: false,
  contextMenu: true,
};

export const calendarConfig: EventSchedulerConfig = {
  ...schedulerConfig,
  view: 'day',
  dateRange: undefined,
  dayColumnSize: 160,
  timeColumnSize: 72,
};
