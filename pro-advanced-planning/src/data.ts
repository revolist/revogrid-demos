import type { ColumnRegular } from '@revolist/revogrid';
import { avatarWithTextRenderer } from '@revolist/revogrid-pro';
import {
  createDefaultTaskTableColumn,
  formatGanttTableDate,
  type AssignmentEntity,
  type EventSchedulerConfig,
  type EventSchedulerEventChangedDetail,
  type EventSchedulerEventEntity,
  type EventSchedulerResourceEntity,
  type GanttBeforeAssignmentChangeDetail,
  type GanttBeforeTaskChangeDetail,
  type GanttPluginConfig,
  type GanttTaskSourceRow,
  type ResourceEntity,
} from '@revolist/revogrid-enterprise';

export type PlanningView = 'grid' | 'gantt' | 'scheduler';

export type PlanningTask = GanttTaskSourceRow & {
  id: string;
  name: string;
  owner: string;
  ownerAvatar: string;
  startDate: string;
  endDate: string;
  percentDone: number;
};

export const views: PlanningView[] = ['grid', 'gantt', 'scheduler'];

const calendarId = 'launch-day';

export const ganttConfig: GanttPluginConfig = {
  id: 'launch',
  name: 'Launch day',
  version: '1',
  currency: 'USD',
  timeZone: 'UTC',
  primaryCalendarId: calendarId,
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
      id: calendarId,
      name: 'Launch day',
      timeZone: 'UTC',
      workingDays: [1, 2, 3, 4, 5],
      workingHours: { start: '08:00', end: '18:00' },
      holidays: [],
      hoursPerDay: 10,
    },
  ],
};

const dateCellTemplate: NonNullable<ColumnRegular['cellTemplate']> = (
  _h,
  { value, prop },
) => formatGanttTableDate(String(value ?? ''), ganttConfig, String(prop));

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
    prop: 'percentDone',
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

type Person = EventSchedulerResourceEntity & {
  readonly id: string;
  readonly name: string;
  readonly role: string;
};

const people: readonly Person[] = [
  {
    id: 'Ava',
    name: 'Ava',
    role: 'Design',
    avatarUrl: 'https://i.pravatar.cc/64?img=47',
    color: '#4f46e5',
  },
  {
    id: 'Noah',
    name: 'Noah',
    role: 'Engineering',
    avatarUrl: 'https://i.pravatar.cc/64?img=12',
    color: '#0891b2',
  },
  {
    id: 'Leo',
    name: 'Leo',
    role: 'QA',
    color: '#16a34a',
  },
];

function getOwnerAvatar(owner: string): string {
  const person = people.find(({ id }) => id === owner);
  return person?.avatarUrl ?? person?.name ?? owner;
}

export function createTasks(): PlanningTask[] {
  return [
    {
      id: 'design',
      name: 'Design review',
      owner: 'Ava',
      ownerAvatar: getOwnerAvatar('Ava'),
      startDate: '2026-07-28T09:00:00.000Z',
      endDate: '2026-07-28T11:00:00.000Z',
      duration: '2h',
      percentDone: 70,
      workflowStatus: 'in-progress',
    },
    {
      id: 'build',
      name: 'Implementation',
      owner: 'Noah',
      ownerAvatar: getOwnerAvatar('Noah'),
      startDate: '2026-07-28T10:00:00.000Z',
      endDate: '2026-07-28T14:00:00.000Z',
      duration: '4h',
      percentDone: 30,
      workflowStatus: 'in-progress',
    },
    {
      id: 'qa',
      name: 'QA pass',
      owner: 'Leo',
      ownerAvatar: getOwnerAvatar('Leo'),
      startDate: '2026-07-28T14:00:00.000Z',
      endDate: '2026-07-28T16:00:00.000Z',
      duration: '2h',
      percentDone: 0,
      workflowStatus: 'not-started',
    },
  ];
}

export function updateFromGrid(
  tasks: PlanningTask[],
  detail: {
    model?: { id?: unknown };
    prop?: unknown;
    rowIndex?: number;
    val?: unknown;
  },
): PlanningTask[] {
  const prop = String(detail.prop ?? '');
  if (!['name', 'owner', 'percentDone'].includes(prop)) return tasks;

  return tasks.map((task, index) => {
    if (task.id !== detail.model?.id && index !== detail.rowIndex) return task;
    const value =
      prop === 'percentDone'
        ? Math.max(0, Math.min(100, Number(detail.val ?? 0)))
        : String(detail.val ?? '');
    return {
      ...task,
      [prop]: value,
      ...(prop === 'owner'
        ? { ownerAvatar: getOwnerAvatar(String(value)) }
        : {}),
    };
  });
}

export function updateFromGantt(
  tasks: PlanningTask[],
  detail: GanttBeforeTaskChangeDetail,
): PlanningTask[] {
  if (detail.taskId === null || !detail.sourcePatch) return tasks;
  return tasks.map((task) =>
    task.id === String(detail.taskId)
      ? ({ ...task, ...detail.sourcePatch } as PlanningTask)
      : task,
  );
}

export function updateFromGanttAssignment(
  tasks: PlanningTask[],
  detail: GanttBeforeAssignmentChangeDetail,
): PlanningTask[] {
  const previousIds = new Set(
    detail.previousAssignments.map(({ resourceId }) => String(resourceId)),
  );
  const assignment =
    detail.assignments.find(
      ({ taskId, resourceId }) =>
        String(taskId) === String(detail.taskId) &&
        !previousIds.has(String(resourceId)),
    ) ??
    detail.assignments.find(
      ({ taskId }) => String(taskId) === String(detail.taskId),
    );
  const owner = assignment ? String(assignment.resourceId) : '';

  return tasks.map((task) =>
    task.id === String(detail.taskId)
      ? { ...task, owner, ownerAvatar: getOwnerAvatar(owner) }
      : task,
  );
}

export function updateFromScheduler(
  tasks: PlanningTask[],
  detail: EventSchedulerEventChangedDetail,
): PlanningTask[] {
  const events = new Map(
    detail.events.map((event) => [String(event.id), event]),
  );
  return tasks.map((task) => {
    const event = events.get(task.id);
    if (!event) return task;
    const owner =
      event.resourceId === undefined ? '' : String(event.resourceId);
    return {
      ...task,
      name: event.title ?? task.name,
      owner,
      ownerAvatar: getOwnerAvatar(owner),
      startDate: event.startDateTime,
      endDate: event.endDateTime,
      duration: `${(Date.parse(event.endDateTime) - Date.parse(event.startDateTime)) / 3_600_000}h`,
    } as PlanningTask;
  });
}

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

export const schedulerResources: EventSchedulerResourceEntity[] = [...people];

export const ganttResources: ResourceEntity[] = people.map((person) => ({
  id: person.id,
  name: person.name,
  avatarUrl: person.avatarUrl,
  role: person.role,
  calendarId,
  allocationCapacity: 1,
  hourlyCost: 0,
}));

export function toGanttAssignments(tasks: PlanningTask[]): AssignmentEntity[] {
  return tasks
    .filter(({ owner }) => owner)
    .map((task) => ({
      id: `assignment-${task.id}`,
      taskId: task.id,
      resourceId: task.owner,
      allocationUnits: 1,
      responsibility: 'Owner',
    }));
}

export function toSchedulerEvents(
  tasks: PlanningTask[],
): EventSchedulerEventEntity[] {
  return tasks.map((task) => ({
    id: task.id,
    resourceId: task.owner || undefined,
    title: task.name,
    startDateTime: task.startDate,
    endDateTime: task.endDate,
    status: task.workflowStatus,
  }));
}
