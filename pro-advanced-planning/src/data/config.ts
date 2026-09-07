import type { GanttPluginConfig } from '@revolist/gantt';
import type { KanbanConfig } from '@revolist/kanban';
import type { EventSchedulerConfig } from '@revolist/scheduler';
import { avatarTemplate } from '@revolist/revogrid-pro';
import { planningCalendarId } from './source';
import type { PlanningTask } from './types';

export const kanbanConfig: KanbanConfig<PlanningTask> = {
  columns: [
    { prop: 'not-started', name: 'Planned', size: 228, minSize: 216 },
    { prop: 'in-progress', name: 'In progress', size: 228, minSize: 216 },
    { prop: 'blocked', name: 'Blocked', size: 228, minSize: 216 },
    { prop: 'done', name: 'Done', size: 228, minSize: 216 },
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
  customization: {
    cardContent: (h, { card }) => h('div', { class: 'planning-card' }, [
      h('strong', { class: 'planning-card__title', title: card.name }, card.name),
      h('div', { class: 'planning-card__meta' }, [
        h('span', { class: 'planning-card__owner', title: card.owners.join(', ') }, [
          h('span', { class: 'planning-card__avatar-stack' }, card.owners.map((owner, index) => avatarTemplate(h, {
            ariaLabel: owner,
            className: 'planning-card__avatar',
            index,
            label: owner,
            size: 20,
            value: card.ownerAvatars[index] ?? owner,
          }))),
          h('span', { class: 'planning-card__owner-label' }, card.owners.join(', ')),
        ]),
        h('span', {}, `$${Number(card.budget).toLocaleString('en-US')}`),
      ]),
      h('div', { class: 'planning-card__progress', title: `${card.percentDone}% complete` }, [
        h('span', { style: { width: `${card.percentDone}%` } }),
      ]),
    ]),
  },
  cardRowHeight: 120,
};

export const ganttConfig: GanttPluginConfig = {
  id: 'launch',
  name: 'Launch day',
  version: '1',
  currency: 'USD',
  timeZone: 'UTC',
  primaryCalendarId: planningCalendarId,
  updatedAt: '2026-09-07T00:00:00Z',
  statusDate: '2026-09-07',
  zoomPreset: 'day-week',
  timelinePrecision: 'day',
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
  weekStartDate: '2026-09-07',
  dateRange: { start: '2026-09-07', end: '2026-09-30' },
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
  eventEditorStatusOptions: ['not-started', 'in-progress', 'blocked', 'done'],
  keyboardShortcuts: false,
  currentTimeMarker: false,
  contextMenu: true,
};

export const calendarConfig: EventSchedulerConfig = {
  ...schedulerConfig,
  view: 'month',
  dateRange: { start: '2026-09-01', end: '2026-09-30' },
  dayColumnSize: 160,
  timeColumnSize: 72,
};
