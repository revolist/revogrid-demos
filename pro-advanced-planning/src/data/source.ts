import { type AssignmentEntity, type ResourceEntity } from '@revolist/gantt';
import { type EventSchedulerEventEntity, type EventSchedulerResourceEntity } from '@revolist/scheduler';
import { planningPeople } from './fixtures';
import type { PlanningTask } from './types';

export const planningCalendarId = 'launch-day';
export { createTasks, getOwnerAvatar } from './fixtures';

export const schedulerResources: EventSchedulerResourceEntity[] = [...planningPeople];

export const ganttResources: ResourceEntity[] = planningPeople.map((person) => ({
  id: person.id,
  name: person.name,
  avatarUrl: person.avatarUrl,
  role: person.role,
  calendarId: planningCalendarId,
  allocationCapacity: 1,
  hourlyCost: 0,
}));

export function toGanttAssignments(tasks: PlanningTask[]): AssignmentEntity[] {
  return tasks.flatMap((task) => task.owners.map((owner, index) => ({
    id: `assignment-${task.id}-${owner}`,
    taskId: task.id,
    resourceId: owner,
    allocationUnits: 1,
    responsibility: index === 0 ? 'Owner' : 'Contributor',
  })));
}

export function toSchedulerEvents(tasks: PlanningTask[]): EventSchedulerEventEntity[] {
  return tasks.map((task) => ({
    id: task.id,
    resourceId: task.owner || undefined,
    title: task.name,
    startDateTime: task.startDate,
    endDateTime: task.endDate,
    status: task.workflowStatus,
    color: task.color,
  }));
}
