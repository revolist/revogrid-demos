/** Shared showcase-sized task data used by multiple Gantt examples. */
import type {
  AssignmentEntity,
  BaselineSnapshot,
  DependencyEntity,
  GanttPluginConfig,
  GanttTaskSourceRow,
  ResourceEntity,
} from '@revolist/revogrid-enterprise';
import { createDefaultTaskTableColumn } from '@revolist/revogrid-enterprise';
import { CALENDAR_ID, GANTT_BASE_CONFIG } from './gantt-project-base-data';

export const SHOWCASE_COLUMN_OPTIONS = [
  { prop: 'wbs',          label: 'WBS',          defaultVisible: false },
  { prop: 'name',         label: 'Name',         defaultVisible: true  },
  { prop: 'assignees',    label: 'Assignees',    defaultVisible: true  },
  { prop: 'cost',         label: 'Cost',         defaultVisible: true  },
  { prop: 'startDate',    label: 'Start Date',   defaultVisible: true  },
  { prop: 'endDate',      label: 'End Date',     defaultVisible: false },
  { prop: 'duration',     label: 'Duration',     defaultVisible: true  },
  { prop: 'percentDone',  label: '% Done',       defaultVisible: false },
  { prop: 'predecessors', label: 'Predecessors', defaultVisible: false },
  { prop: 'successors',   label: 'Successors',   defaultVisible: false },
  { prop: 'status',       label: 'Status',       defaultVisible: true  },
] as const;

export const SHOWCASE_TOOLBAR_COLUMNS = [
  { prop: 'wbs', label: 'WBS', visible: true },
  { prop: 'name', label: 'Task', visible: true },
  { prop: 'assignees', label: 'Assignees', visible: true },
  { prop: 'cost', label: 'Cost', visible: true },
  { prop: 'startDate', label: 'Start', visible: true },
  { prop: 'duration', label: 'Dur', visible: true },
];

export type ShowcaseColumnProp = (typeof SHOWCASE_COLUMN_OPTIONS)[number]['prop'];

export const SHOWCASE_COLUMNS = SHOWCASE_COLUMN_OPTIONS
  .map((c) => createDefaultTaskTableColumn(c.prop as any))
  .filter((c): c is NonNullable<typeof c> => Boolean(c));

export const SHOWCASE_DEFAULT_HIDDEN: string[] = SHOWCASE_COLUMN_OPTIONS
  .filter((c) => !c.defaultVisible)
  .map((c) => c.prop as string);

type ShowcaseTaskSource = GanttTaskSourceRow & {
  estimatedCost?: number;
};

export type ShowcaseTaskEntity = ShowcaseTaskSource & {
  done: boolean;
};

export const SHOWCASE_PROJECT_ID = 'project-launch-saas';
const SHOWCASE_HOURS_PER_DAY = 8;

export const SHOWCASE_GANTT_CONFIG = {
  ...GANTT_BASE_CONFIG,
  id: SHOWCASE_PROJECT_ID,
  name: 'Launch SaaS Product',
  updatedAt: '2026-04-28T10:00:00Z',
  statusDate: '2026-04-28',
  zoomPreset: 'day-week' as const,
  allowTaskCreate: true,
  taskCreateRow: true,
  visuals: {
    showBaseline: true,
    showCriticalPath: true,
    showTaskLabels: 'tasks',
    shadeNonWorkingTime: true,
    showTodayLine: true,
    milestoneLines: [
      { id: 'project-start', date: '2026-04-06', label: 'Project start', color: '#22c55e' },
      { id: 'public-launch', date: '2026-05-23', label: 'Launch', color: '#facc15' },
    ],
  },
  scheduling: {
    excludeHolidaysFromDuration: true,
  },
} satisfies GanttPluginConfig;

const SHOWCASE_TASK_SOURCE: ShowcaseTaskSource[] = [
  {
    id: 'launch', parentId: null,
    name: 'Launch SaaS Product', workflowStatus: 'blocked',
    startDate: '2026-04-06', endDate: '2026-05-23', duration: 47,
    percentDone: 0, calendarId: CALENDAR_ID, tags: [],
    estimatedCost: 248400,
  },
  {
    id: 'backend', parentId: 'launch',
    name: 'Backend Setup', type: 'task', workflowStatus: 'blocked',
    startDate: '2026-04-06', endDate: '2026-04-18', duration: 12,
    percentDone: 100, calendarId: CALENDAR_ID, tags: ['Backend'],
    estimatedCost: 32400,
  },
  {
    id: 'design', parentId: 'launch',
    name: 'Design', type: 'task', workflowStatus: 'blocked',
    startDate: '2026-04-06', endDate: '2026-04-24', duration: 18,
    percentDone: 97, calendarId: CALENDAR_ID, tags: ['Design'],
    estimatedCost: 14800,
  },
  {
    id: 'frontend', parentId: 'launch',
    name: 'Development', type: 'task', workflowStatus: 'blocked',
    startDate: '2026-04-14', endDate: '2026-05-10', duration: 24,
    percentDone: 50, calendarId: CALENDAR_ID, tags: ['Frontend'],
    estimatedCost: 38600,
  },
  {
    id: 'devops', parentId: null,
    name: 'DevOps', workflowStatus: 'blocked',
    startDate: '2026-04-10', endDate: '2026-05-12', duration: 32,
    percentDone: 85, calendarId: CALENDAR_ID, tags: ['DevOps'],
    estimatedCost: 21800,
  },
  {
    id: 'iac', parentId: 'devops',
    name: 'IaC', type: 'task', workflowStatus: 'done',
    startDate: '2026-04-10', endDate: '2026-04-18', duration: 8,
    percentDone: 100, calendarId: CALENDAR_ID, tags: ['DevOps'],
    estimatedCost: 7800,
  },
  {
    id: 'ci-cd', parentId: 'devops',
    name: 'CI / CD Pipeline', type: 'task', workflowStatus: 'done',
    startDate: '2026-04-16', endDate: '2026-04-24', duration: 8,
    percentDone: 100, calendarId: CALENDAR_ID, tags: ['DevOps'],
    estimatedCost: 5200,
  },
  {
    id: 'monitoring', parentId: 'devops',
    name: 'Telemetry', type: 'task', workflowStatus: 'blocked',
    startDate: '2026-04-22', endDate: '2026-04-30', duration: 8,
    percentDone: 55, calendarId: CALENDAR_ID, tags: ['DevOps'],
    estimatedCost: 4400,
  },
  {
    id: 'prod-deploy', parentId: 'launch',
    name: 'Production', type: 'milestone', workflowStatus: 'not-started',
    startDate: '2026-05-12', endDate: '2026-05-12', duration: 0,
    percentDone: 0, calendarId: CALENDAR_ID, tags: ['Milestone'],
  },
  {
    id: 'qa', parentId: 'launch',
    name: 'QA', workflowStatus: 'blocked',
    startDate: '2026-04-20', endDate: '2026-05-18', duration: 28,
    percentDone: 32, calendarId: CALENDAR_ID, tags: ['QA'],
    estimatedCost: 12200,
  },
  {
    id: 'test-plan', parentId: 'qa',
    name: 'Test Plan', type: 'task', workflowStatus: 'done',
    startDate: '2026-04-20', endDate: '2026-04-24', duration: 4,
    percentDone: 100, calendarId: CALENDAR_ID, tags: ['QA'],
    estimatedCost: 2800,
  },
  {
    id: 'unit-tests', parentId: 'qa',
    name: 'Unit Tests', type: 'task', workflowStatus: 'in-progress',
    startDate: '2026-04-24', endDate: '2026-05-04', duration: 10,
    percentDone: 62, calendarId: CALENDAR_ID, tags: ['QA'],
    estimatedCost: 4200,
  },
  {
    id: 'integration-tests', parentId: 'qa',
    name: 'Integration Tests', type: 'task', workflowStatus: 'not-started',
    startDate: '2026-05-02', endDate: '2026-05-12', duration: 10,
    percentDone: 0, calendarId: CALENDAR_ID, tags: ['QA'],
    estimatedCost: 3400,
  },
  {
    id: 'uat', parentId: 'qa',
    name: 'Acceptance Test', type: 'task', workflowStatus: 'not-started',
    startDate: '2026-05-10', endDate: '2026-05-18', duration: 8,
    percentDone: 0, calendarId: CALENDAR_ID, tags: ['QA'],
    estimatedCost: 1800,
  },
  {
    id: 'security', parentId: null,
    name: 'Security', workflowStatus: 'not-started',
    startDate: '2026-05-06', endDate: '2026-05-21', duration: 15,
    percentDone: 0, calendarId: CALENDAR_ID, tags: ['Security'],
    estimatedCost: 7200,
  },
  {
    id: 'pentest', parentId: 'security',
    name: 'Penetration Testing', type: 'task', workflowStatus: 'not-started',
    startDate: '2026-05-06', endDate: '2026-05-14', duration: 8,
    percentDone: 0, calendarId: CALENDAR_ID, tags: ['Security'],
    estimatedCost: 4800,
  },
  {
    id: 'audit', parentId: 'security',
    name: 'Audit & Compliance', type: 'task', workflowStatus: 'not-started',
    startDate: '2026-05-12', endDate: '2026-05-21', duration: 9,
    percentDone: 0, calendarId: CALENDAR_ID, tags: ['Security'],
    estimatedCost: 2400,
  },
  {
    id: 'public-launch', parentId: 'launch',
    name: 'Public Launch', type: 'milestone', workflowStatus: 'not-started',
    startDate: '2026-05-23', endDate: '2026-05-23', duration: 0,
    percentDone: 0, calendarId: CALENDAR_ID, tags: ['Milestone'],
  },
];

export const SHOWCASE_TASKS: ShowcaseTaskEntity[] = SHOWCASE_TASK_SOURCE.map((task) => ({
  ...task,
  done: task.workflowStatus === 'done',
}));

export const SHOWCASE_DEPENDENCIES: DependencyEntity[] = [
  { id: 'sd-1', predecessorTaskId: 'iac', successorTaskId: 'ci-cd', type: 'finish-to-start', lagDays: 0 },
  { id: 'sd-2', predecessorTaskId: 'ci-cd', successorTaskId: 'monitoring', type: 'finish-to-start', lagDays: 0 },
  { id: 'sd-3', predecessorTaskId: 'test-plan', successorTaskId: 'unit-tests', type: 'finish-to-start', lagDays: 0 },
  { id: 'sd-4', predecessorTaskId: 'unit-tests', successorTaskId: 'integration-tests', type: 'finish-to-start', lagDays: 0 },
  { id: 'sd-5', predecessorTaskId: 'integration-tests', successorTaskId: 'uat', type: 'finish-to-start', lagDays: 0 },
  { id: 'sd-6', predecessorTaskId: 'audit', successorTaskId: 'public-launch', type: 'finish-to-start', lagDays: 0 },
];

export const SHOWCASE_RESOURCES: ResourceEntity[] = [
  { id: 'nk', name: 'Nina Kim', role: 'Platform Engineer', calendarId: CALENDAR_ID, allocationCapacity: 1, hourlyCost: 125 },
  { id: 'rp', name: 'Ravi Patel', role: 'QA Lead', calendarId: CALENDAR_ID, allocationCapacity: 1, hourlyCost: 100 },
  { id: 'jd', name: 'Jordan Diaz', role: 'Automation Engineer', calendarId: CALENDAR_ID, allocationCapacity: 1, hourlyCost: 95 },
  { id: 'sr', name: 'Sam Rivera', role: 'Product Owner', calendarId: CALENDAR_ID, allocationCapacity: 1, hourlyCost: 90 },
  { id: 'vk', name: 'Vera Khan', role: 'Security Engineer', calendarId: CALENDAR_ID, allocationCapacity: 1, hourlyCost: 115 },
];

export const SHOWCASE_ASSIGNMENTS: AssignmentEntity[] = [
  { id: 'sa-1', taskId: 'iac', resourceId: 'nk', allocationUnits: 1, responsibility: 'Owner' },
  { id: 'sa-2', taskId: 'ci-cd', resourceId: 'nk', allocationUnits: 1, responsibility: 'Owner' },
  { id: 'sa-3', taskId: 'monitoring', resourceId: 'nk', allocationUnits: 1, responsibility: 'Owner' },
  { id: 'sa-4', taskId: 'test-plan', resourceId: 'rp', allocationUnits: 1, responsibility: 'Owner' },
  { id: 'sa-5', taskId: 'unit-tests', resourceId: 'rp', allocationUnits: 1, responsibility: 'Lead' },
  { id: 'sa-6', taskId: 'unit-tests', resourceId: 'jd', allocationUnits: 1, responsibility: 'Automation' },
  { id: 'sa-7', taskId: 'integration-tests', resourceId: 'rp', allocationUnits: 1, responsibility: 'Owner' },
  { id: 'sa-8', taskId: 'uat', resourceId: 'rp', allocationUnits: 1, responsibility: 'Lead' },
  { id: 'sa-9', taskId: 'uat', resourceId: 'sr', allocationUnits: 1, responsibility: 'Signoff' },
  { id: 'sa-10', taskId: 'pentest', resourceId: 'vk', allocationUnits: 1, responsibility: 'Owner' },
  { id: 'sa-11', taskId: 'audit', resourceId: 'vk', allocationUnits: 1, responsibility: 'Lead' },
  { id: 'sa-12', taskId: 'audit', resourceId: 'jd', allocationUnits: 1, responsibility: 'Compliance' },
];

export const SHOWCASE_BASELINES: BaselineSnapshot[] = [
  {
    id: 'showcase-approved',
    name: 'Approved launch plan',
    capturedAt: '2026-04-01T08:00:00Z',
    tasks: SHOWCASE_TASKS.map((task) => ({
      taskId: task.id,
      startDate: task.startDate,
      endDate: task.endDate,
      duration: Number(task.duration) * SHOWCASE_HOURS_PER_DAY,
      progressPercent: 0,
    })),
  },
];
