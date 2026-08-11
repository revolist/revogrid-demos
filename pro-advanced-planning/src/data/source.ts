import {
  type AssignmentEntity,
  type ResourceEntity,
} from '@revolist/gantt';
import {
  type EventSchedulerEventEntity,
  type EventSchedulerResourceEntity,
} from '@revolist/scheduler';
import type { PlanningTask } from './types';

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

export const planningCalendarId = 'launch-day';

export function getOwnerAvatar(owner: string): string {
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
      owners: ['Ava'],
      ownerAvatars: [getOwnerAvatar('Ava')],
      startDate: '2026-07-28T09:00:00.000Z',
      endDate: '2026-07-28T11:00:00.000Z',
      duration: '2h',
      percentDone: 70,
      order: 1000,
      workflowStatus: 'in-progress',
    },
    {
      id: 'build',
      name: 'Implementation',
      owner: 'Noah',
      ownerAvatar: getOwnerAvatar('Noah'),
      owners: ['Noah', 'Ava'],
      ownerAvatars: [getOwnerAvatar('Noah'), getOwnerAvatar('Ava')],
      startDate: '2026-07-28T10:00:00.000Z',
      endDate: '2026-07-28T14:00:00.000Z',
      duration: '4h',
      percentDone: 30,
      order: 2000,
      workflowStatus: 'in-progress',
    },
    {
      id: 'qa',
      name: 'QA pass',
      owner: 'Leo',
      ownerAvatar: getOwnerAvatar('Leo'),
      owners: ['Leo'],
      ownerAvatars: [getOwnerAvatar('Leo')],
      startDate: '2026-07-28T14:00:00.000Z',
      endDate: '2026-07-28T16:00:00.000Z',
      duration: '2h',
      percentDone: 0,
      order: 1000,
      workflowStatus: 'not-started',
    },
  ];
}

export const schedulerResources: EventSchedulerResourceEntity[] = [...people];

export const ganttResources: ResourceEntity[] = people.map((person) => ({
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
    color: task.color,
  }));
}
