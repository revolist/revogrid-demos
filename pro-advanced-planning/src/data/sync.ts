import {
  type GanttBeforeAssignmentChangeDetail,
  type GanttBeforeTaskChangeDetail,
} from '@revolist/gantt';
import {
  type KanbanCardCreateDetail,
  type KanbanCardDeleteDetail,
  type KanbanCardMoveDetail,
  type KanbanCardUpdateDetail,
} from '@revolist/kanban';
import type { EventSchedulerEventChangedDetail } from '@revolist/scheduler';
import { getOwnerAvatar } from './source';
import type { PlanningTask } from './types';

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
        ? {
          ownerAvatar: getOwnerAvatar(String(value)),
          owners: [String(value)],
          ownerAvatars: [getOwnerAvatar(String(value))],
        }
        : {}),
    };
  });
}

export function updateFromKanban(
  tasks: PlanningTask[],
  detail: KanbanCardMoveDetail<PlanningTask>,
): PlanningTask[] {
  const changed = new Map(detail.changedCards.map((task) => [task.id, task]));
  return tasks.map((task) => changed.get(task.id) ?? task);
}

export function updateFromKanbanCreate(
  tasks: PlanningTask[],
  detail: KanbanCardCreateDetail<PlanningTask>,
): PlanningTask[] {
  const next = [...tasks];
  next.splice(detail.sourceIndex, 0, detail.card);
  return next;
}

export function updateFromKanbanUpdate(
  tasks: PlanningTask[],
  detail: KanbanCardUpdateDetail<PlanningTask>,
): PlanningTask[] {
  return tasks.map((task) => task.id === String(detail.cardId) ? detail.card : task);
}

export function updateFromKanbanDelete(
  tasks: PlanningTask[],
  detail: KanbanCardDeleteDetail<PlanningTask>,
): PlanningTask[] {
  const deleted = new Set(detail.cardIds.map(String));
  return tasks.filter((task) => !deleted.has(task.id));
}

function shiftPlanningDate(value: string, deltaMs: number): string | undefined {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return;
  const shifted = new Date(timestamp + deltaMs).toISOString();
  return value.includes('T') ? shifted : shifted.slice(0, 10);
}

function readHourDuration(value: unknown, unit: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && unit === 'hour') {
    return value;
  }
  if (typeof value !== 'string') return;
  const match = value.trim().match(/^([0-9]+(?:\.[0-9]+)?)h$/i);
  const hours = match ? Number(match[1]) : Number.NaN;
  return Number.isFinite(hours) ? hours : undefined;
}

export function updateFromGantt(
  tasks: PlanningTask[],
  detail: GanttBeforeTaskChangeDetail,
): PlanningTask[] {
  if (detail.taskId === null || !detail.sourcePatch) return tasks;
  const taskIndex = tasks.findIndex((task) => task.id === String(detail.taskId));
  if (taskIndex < 0) return tasks;
  if (detail.action === 'delete') {
    return tasks.filter((_, index) => index !== taskIndex);
  }

  const task = tasks[taskIndex];
  const sourcePatch = { ...detail.sourcePatch };
  if (detail.action === 'move' && typeof sourcePatch.startDate === 'string') {
    const deltaMs = Date.parse(sourcePatch.startDate) - Date.parse(task.startDate);
    const endDate = Number.isFinite(deltaMs)
      ? shiftPlanningDate(task.endDate, deltaMs)
      : undefined;
    if (endDate) sourcePatch.endDate = endDate;
  }
  if (
    detail.action === 'resize'
    && typeof sourcePatch.startDate === 'string'
    && typeof sourcePatch.endDate === 'string'
  ) {
    const durationHours = (
      Date.parse(sourcePatch.endDate) - Date.parse(sourcePatch.startDate)
    ) / 3_600_000;
    if (Number.isFinite(durationHours) && durationHours > 0) {
      sourcePatch.duration = `${durationHours}h`;
    }
  }
  if (detail.action === 'edit' && sourcePatch.duration !== undefined) {
    const durationHours = readHourDuration(
      sourcePatch.duration,
      sourcePatch.durationUnit ?? task.durationUnit,
    );
    const startDate = typeof sourcePatch.startDate === 'string'
      ? sourcePatch.startDate
      : task.startDate;
    const endDate = durationHours === undefined
      ? undefined
      : shiftPlanningDate(startDate, durationHours * 3_600_000);
    if (endDate) sourcePatch.endDate = endDate;
  }
  if (detail.action === 'indent') {
    sourcePatch.parentId = tasks[taskIndex - 1]?.id ?? task.parentId ?? null;
  } else if (detail.action === 'outdent') {
    const parent = tasks.find(({ id }) => id === String(task.parentId));
    sourcePatch.parentId = parent?.parentId ?? null;
  }
  return tasks.map((task) =>
    task.id === String(detail.taskId)
      ? ({ ...task, ...sourcePatch } as PlanningTask)
      : task,
  );
}

export function updateFromGanttAssignment(
  tasks: PlanningTask[],
  detail: GanttBeforeAssignmentChangeDetail,
): PlanningTask[] {
  const owners = detail.assignments
    .filter(({ taskId }) => String(taskId) === String(detail.taskId))
    .map(({ resourceId }) => String(resourceId));
  const owner = owners[0] ?? '';

  return tasks.map((task) =>
    task.id === String(detail.taskId)
      ? {
        ...task,
        owner,
        ownerAvatar: getOwnerAvatar(owner),
        owners,
        ownerAvatars: owners.map(getOwnerAvatar),
      }
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
      owners: owner ? [owner] : [],
      ownerAvatars: owner ? [getOwnerAvatar(owner)] : [],
      startDate: event.startDateTime,
      endDate: event.endDateTime,
      workflowStatus: event.status ?? task.workflowStatus,
      color: event.color,
      duration: `${(Date.parse(event.endDateTime) - Date.parse(event.startDateTime)) / 3_600_000}h`,
    } as PlanningTask;
  });
}
