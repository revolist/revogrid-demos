import {
    type AssignmentEntity,
    type DependencyEntity,
    type ResourceEntity,
} from '@revolist/gantt'
import {
    type EventSchedulerEventEntity,
    type EventSchedulerResourceEntity,
} from '@revolist/scheduler'
import { planningPeople } from './fixtures'
import type { PlanningTask } from './types'

export const planningCalendarId = 'launch-day'
export { createTasks, getOwnerAvatar } from './fixtures'

export const schedulerResources: EventSchedulerResourceEntity[] = [
    ...planningPeople,
]

export const ganttResources: ResourceEntity[] = planningPeople.map(
    (person) => ({
        id: person.id,
        name: person.name,
        avatarUrl: person.avatarUrl,
        role: person.role,
        calendarId: planningCalendarId,
        allocationCapacity: 1,
        hourlyCost: 0,
    })
)

export const ganttDependencies: DependencyEntity[] = [
    ['task-001', 'task-011'],
    ['task-002', 'task-012'],
    ['task-003', 'task-018'],
    ['task-004', 'task-024'],
    ['task-005', 'task-030'],
].map(([predecessorTaskId, successorTaskId], index) => ({
    id: `planning-dependency-${index + 1}`,
    predecessorTaskId,
    successorTaskId,
    type: 'finish-to-start',
    lagDays: 0,
}))

export function toGanttAssignments(tasks: PlanningTask[]): AssignmentEntity[] {
    return tasks.flatMap((task) =>
        task.owner
            ? [
                  {
                      id: `assignment-${task.id}-${task.owner}`,
                      taskId: task.id,
                      resourceId: task.owner,
                      allocationUnits: 1,
                      responsibility: 'Owner',
                  },
              ]
            : []
    )
}

export function toSchedulerEvents(
    tasks: PlanningTask[]
): EventSchedulerEventEntity[] {
    return tasks.map((task) => ({
        id: task.id,
        resourceId: task.owner || undefined,
        title: task.name,
        startDateTime: task.startDate,
        endDateTime: task.endDate,
        status: task.workflowStatus,
        color: task.color,
    }))
}
