import type {
    AssignmentEntity,
    DependencyEntity,
    GanttTaskSourceRow,
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

/** The Planning workspace stores task duration canonically in elapsed hours. */
export function getPlanningDurationHours(
    task: Pick<PlanningTask, 'duration' | 'durationUnit' | 'startDate' | 'endDate'>
): number {
    if (typeof task.duration === 'number' && Number.isFinite(task.duration)) {
        return Math.max(0, task.duration)
    }
    if (typeof task.duration === 'string') {
        const match = task.duration.trim().match(/^([0-9]+(?:\.[0-9]+)?)h$/i)
        if (match) return Number(match[1])
    }

    const fallback =
        (Date.parse(task.endDate) - Date.parse(task.startDate)) / HOUR_IN_MS
    return Number.isFinite(fallback) ? Math.max(0, fallback) : 0
}

/** Materialize the finish required by Scheduler from start + duration. */
export function getPlanningEndDate(
    task: Pick<PlanningTask, 'duration' | 'durationUnit' | 'startDate' | 'endDate'>
): string {
    const start = Date.parse(task.startDate)
    if (!Number.isFinite(start)) return task.endDate
    return new Date(
        start + getPlanningDurationHours(task) * HOUR_IN_MS
    ).toISOString()
}

/**
 * Gantt owns finish-date calculation. Supplying only start + duration avoids
 * conflicting schedule inputs when a bar is moved.
 */
export function toGanttTasks(tasks: PlanningTask[]): GanttTaskSourceRow[] {
    return tasks.map((task) => {
        const source: GanttTaskSourceRow = {
            ...task,
            duration: getPlanningDurationHours(task),
            durationUnit: 'hour',
            durationIsElapsed: true,
        }
        delete source.endDate
        return source
    })
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
