import type {
    AssignmentEntity,
    DependencyEntity,
    ResourceEntity,
} from '@revolist/gantt'
import type {
    EventSchedulerEventEntity,
    EventSchedulerResourceEntity,
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

export function filterGanttDependencies(
    dependencies: readonly DependencyEntity[],
    tasks: readonly Pick<PlanningTask, 'id'>[]
): DependencyEntity[] {
    const taskIds = new Set(tasks.map(({ id }) => String(id)))
    return dependencies.filter(
        ({ predecessorTaskId, successorTaskId }) =>
            taskIds.has(String(predecessorTaskId)) &&
            taskIds.has(String(successorTaskId))
    )
}

export function toGanttAssignments(tasks: PlanningTask[]): AssignmentEntity[] {
    return tasks.flatMap((task) => {
        const resourceIds = [
            ...new Set(
                (task.owners.length ? task.owners : [task.owner]).filter(
                    Boolean
                )
            ),
        ]

        return resourceIds.map((resourceId) => ({
            id: `assignment-${task.id}-${resourceId}`,
            taskId: task.id,
            resourceId,
            allocationUnits: 1,
            responsibility: 'Owner',
        }))
    })
}

const HOUR_IN_MS = 3_600_000

/** Materialize the finish required by Scheduler from start + duration. */
export function getPlanningEndDate(
    task: Pick<PlanningTask, 'duration' | 'startDate'>
): string {
    return new Date(
        Date.parse(task.startDate) + task.duration * HOUR_IN_MS
    ).toISOString()
}

export function toSchedulerEvents(
    tasks: PlanningTask[]
): EventSchedulerEventEntity[] {
    return tasks.map((task) => {
        const start = Date.parse(task.startDate)
        const endDate = getPlanningEndDate(task)
        const end = Date.parse(endDate)

        return {
            id: task.id,
            resourceId: task.owner || undefined,
            title: task.name,
            startDateTime: task.startDate,
            // Gantt milestones have no duration. Give them a visible scheduler slot.
            endDateTime:
                end > start
                    ? endDate
                    : new Date(start + 3_600_000).toISOString(),
            status: task.workflowStatus,
            color: task.color,
        }
    })
}
