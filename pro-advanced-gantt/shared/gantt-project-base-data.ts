/** Shared project fixtures used by multiple Gantt examples. */
import type {
  AssignmentEntity,
  BaselineSnapshot,
  CalendarEntity,
  DependencyEntity,
  GanttPluginConfig,
  GanttTaskSourceRow,
  ResourceEntity,
} from '@revolist/revogrid-enterprise';
import { createDefaultTaskTableColumn } from '@revolist/revogrid-enterprise';

export const PROJECT_ID = 'project-web-redesign';
export const CALENDAR_ID = 'cal-standard';
export const CALENDAR_US_ID = 'cal-us';

export const GANTT_BASE_CONFIG = {
  id: PROJECT_ID,
  name: 'Website Redesign',
  version: '1',
  currency: 'USD',
  timeZone: 'UTC',
  primaryCalendarId: CALENDAR_ID,
  updatedAt: '2026-04-06T00:00:00Z',
  statusDate: '2026-04-06',
  zoomPreset: 'week' as const,
};

export const STANDARD_CALENDAR: CalendarEntity = {
  id: CALENDAR_ID,
  name: 'Standard',
  timeZone: 'UTC',
  workingDays: [1, 2, 3, 4, 5],
  holidays: [],
  hoursPerDay: 8,
};

export const US_CALENDAR: CalendarEntity = {
  id: CALENDAR_US_ID,
  name: 'US Standard',
  timeZone: 'America/New_York',
  workingDays: [1, 2, 3, 4, 5],
  holidays: ['2026-05-25', '2026-07-04'],
  hoursPerDay: 8,
};

export const TASKS: GanttTaskSourceRow[] = [
  {
    id: 't1', parentId: null,
    name: 'Design', type: 'summary', workflowStatus: 'in-progress',
    startDate: '2026-04-06', endDate: '2026-04-24', duration: 15,
    percentDone: 60, calendarId: CALENDAR_ID, tags: [],
  },
  {
    id: 't2', parentId: 't1',
    name: 'Wireframes', type: 'task', workflowStatus: 'done',
    startDate: '2026-04-06', endDate: '2026-04-10', duration: 5,
    percentDone: 100, calendarId: CALENDAR_ID, tags: [],
  },
  {
    id: 't3', parentId: 't1',
    name: 'Design Review', type: 'milestone', workflowStatus: 'done',
    startDate: '2026-04-10', endDate: '2026-04-10', duration: 0,
    percentDone: 100, calendarId: CALENDAR_ID, tags: ['milestone'],
  },
  {
    id: 't4', parentId: 't1',
    name: 'Visual Design', type: 'task', workflowStatus: 'in-progress',
    startDate: '2026-04-13', endDate: '2026-04-24', duration: 10,
    percentDone: 40, calendarId: CALENDAR_ID, tags: [],
  },
  {
    id: 't5', parentId: null,
    name: 'Development', type: 'summary', workflowStatus: 'not-started',
    startDate: '2026-04-27', endDate: '2026-05-20', duration: 18,
    percentDone: 0, calendarId: CALENDAR_ID, tags: [],
  },
  {
    id: 't6', parentId: 't5',
    name: 'Frontend', type: 'task', workflowStatus: 'not-started',
    startDate: '2026-04-27', endDate: '2026-05-13', duration: 13,
    percentDone: 0, calendarId: CALENDAR_ID, tags: [],
  },
  {
    id: 't7', parentId: 't5',
    name: 'Backend', type: 'task', workflowStatus: 'not-started',
    startDate: '2026-04-27', endDate: '2026-05-20', duration: 18,
    percentDone: 0, calendarId: CALENDAR_ID, tags: [],
  },
  {
    id: 't8', parentId: null,
    name: 'Launch', type: 'milestone', workflowStatus: 'not-started',
    startDate: '2026-05-20', endDate: '2026-05-20', duration: 0,
    percentDone: 0, calendarId: CALENDAR_ID, tags: ['milestone'],
  },
];

export const TASKS_SLIPPED: GanttTaskSourceRow[] = TASKS.map((task) => {
  if (task.id === 't4') {
    return { ...task, endDate: '2026-04-27', duration: 13, percentDone: 30 };
  }
  if (task.id === 't1') {
    return { ...task, endDate: '2026-04-27', duration: 18, percentDone: 50 };
  }
  if (task.id === 't5') {
    return { ...task, startDate: '2026-04-28', endDate: '2026-05-21' };
  }
  if (task.id === 't6') {
    return { ...task, startDate: '2026-04-28', endDate: '2026-05-14' };
  }
  if (task.id === 't7') {
    return { ...task, startDate: '2026-04-28', endDate: '2026-05-21' };
  }
  if (task.id === 't8') {
    return { ...task, startDate: '2026-05-21', endDate: '2026-05-21' };
  }
  return task;
});

export const TASKS_SCHEDULED: GanttTaskSourceRow[] = TASKS.map((task) => {
  if (task.id === 't6') {
    return {
      ...task, startDate: '2026-05-04', endDate: '2026-05-20',
      constraintType: 'start-no-earlier-than', constraintDate: '2026-05-04',
    };
  }
  if (task.id === 't7') {
    return { ...task, duration: 24, endDate: '2026-05-28', deadlineDate: '2026-05-22' };
  }
  if (task.id === 't8') {
    return { ...task, startDate: '2026-05-28', endDate: '2026-05-28' };
  }
  return task;
});

export const DEPENDENCIES: DependencyEntity[] = [
  { id: 'd1', predecessorTaskId: 't2', successorTaskId: 't3', type: 'finish-to-start', lagDays: 0 },
  { id: 'd2', predecessorTaskId: 't3', successorTaskId: 't4', type: 'finish-to-start', lagDays: 1 },
  { id: 'd3', predecessorTaskId: 't4', successorTaskId: 't6', type: 'finish-to-start', lagDays: 1 },
  { id: 'd4', predecessorTaskId: 't4', successorTaskId: 't7', type: 'finish-to-start', lagDays: 1 },
  { id: 'd5', predecessorTaskId: 't6', successorTaskId: 't8', type: 'finish-to-start', lagDays: 0 },
  { id: 'd6', predecessorTaskId: 't7', successorTaskId: 't8', type: 'finish-to-start', lagDays: 0 },
];

export const RESOURCES: ResourceEntity[] = [
  { id: 'r1', name: 'Alice Chen', role: 'Designer', calendarId: CALENDAR_ID, allocationCapacity: 1, hourlyCost: 95 },
  { id: 'r2', name: 'Bob Kim', role: 'Frontend Dev', calendarId: CALENDAR_ID, allocationCapacity: 1, hourlyCost: 110 },
  { id: 'r3', name: 'Carla Díaz', role: 'Backend Dev', calendarId: CALENDAR_ID, allocationCapacity: 1, hourlyCost: 105 },
];

export const ASSIGNMENTS: AssignmentEntity[] = [
  { id: 'a1', taskId: 't2', resourceId: 'r1', allocationUnits: 1, responsibility: 'assigned' },
  { id: 'a2', taskId: 't4', resourceId: 'r1', allocationUnits: 1, responsibility: 'assigned' },
  { id: 'a3', taskId: 't6', resourceId: 'r2', allocationUnits: 1, responsibility: 'assigned' },
  { id: 'a4', taskId: 't7', resourceId: 'r3', allocationUnits: 1, responsibility: 'assigned' },
];

export const BASELINES: BaselineSnapshot[] = [
  {
    id: 'baseline-approved',
    name: 'Approved Plan',
    capturedAt: '2026-04-01T08:00:00Z',
    tasks: [
      { taskId: 't1', startDate: '2026-04-06', endDate: '2026-04-24', duration: 120, progressPercent: 0 },
      { taskId: 't2', startDate: '2026-04-06', endDate: '2026-04-10', duration: 40,  progressPercent: 0 },
      { taskId: 't3', startDate: '2026-04-10', endDate: '2026-04-10', duration: 0,  progressPercent: 0 },
      { taskId: 't4', startDate: '2026-04-13', endDate: '2026-04-24', duration: 80, progressPercent: 0 },
      { taskId: 't5', startDate: '2026-04-27', endDate: '2026-05-20', duration: 144, progressPercent: 0 },
      { taskId: 't6', startDate: '2026-04-27', endDate: '2026-05-13', duration: 104, progressPercent: 0 },
      { taskId: 't7', startDate: '2026-04-27', endDate: '2026-05-20', duration: 144, progressPercent: 0 },
      { taskId: 't8', startDate: '2026-05-20', endDate: '2026-05-20', duration: 0,  progressPercent: 0 },
    ],
  },
];

export const DEFAULT_COLUMNS = [
  createDefaultTaskTableColumn('wbs'),
  createDefaultTaskTableColumn('name'),
  createDefaultTaskTableColumn('assignees'),
  createDefaultTaskTableColumn('cost' as any),
  createDefaultTaskTableColumn('startDate'),
  createDefaultTaskTableColumn('endDate'),
  createDefaultTaskTableColumn('duration'),
  createDefaultTaskTableColumn('percentDone'),
].filter(Boolean);

export function makeGanttConfig(overrides: Partial<GanttPluginConfig> = {}): GanttPluginConfig {
  return { ...GANTT_BASE_CONFIG, ...overrides } as GanttPluginConfig;
}
