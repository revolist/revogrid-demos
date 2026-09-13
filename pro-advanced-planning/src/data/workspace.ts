import type { PlanningFilters, PlanningProjectId, PlanningTask } from './types'

export const planningProjects: ReadonlyArray<{
    id: PlanningProjectId
    label: string
}> = [
    { id: 'customer-portal', label: 'Customer portal' },
    { id: 'billing-platform', label: 'Billing platform' },
    { id: 'internal-tools', label: 'Internal tools' },
]

export const defaultPlanningFilters = (): PlanningFilters => ({
    query: '',
    projectId: 'all',
    statuses: [],
    priorities: [],
})

export const activePlanningFilters = (): PlanningFilters => ({
    ...defaultPlanningFilters(),
    statuses: ['in-progress', 'blocked', 'not-started'],
})

export function filterPlanningTasks(
    tasks: readonly PlanningTask[],
    filters: PlanningFilters
): PlanningTask[] {
    const query = filters.query.trim().toLocaleLowerCase()
    return tasks.filter(
        (task) =>
            (!query ||
                task.name.toLocaleLowerCase().includes(query) ||
                task.owner.toLocaleLowerCase().includes(query)) &&
            (filters.projectId === 'all' ||
                task.projectId === filters.projectId) &&
            (!filters.statuses.length ||
                filters.statuses.includes(String(task.workflowStatus))) &&
            (!filters.priorities.length ||
                filters.priorities.includes(Number(task.priority)))
    )
}

export function mergeVisibleTasks(
    canonical: readonly PlanningTask[],
    visible: readonly PlanningTask[]
): PlanningTask[] {
    const updates = new Map(visible.map((task) => [task.id, task]))
    return canonical.map((task) => updates.get(task.id) ?? task)
}

/** Reorders visible tasks while leaving filtered-out tasks in their slots. */
export function reorderVisibleTasks(
    canonical: readonly PlanningTask[],
    visible: readonly PlanningTask[]
): PlanningTask[] {
    const visibleIds = new Set(visible.map(({ id }) => id))
    let visibleIndex = 0
    return canonical.map((task) =>
        visibleIds.has(task.id) ? visible[visibleIndex++] ?? task : task
    )
}

export function deletePlanningTasks(
    tasks: PlanningTask[],
    taskIds: readonly string[]
): PlanningTask[] {
    const deleted = new Set(taskIds)
    return deleted.size
        ? tasks.filter(({ id }) => !deleted.has(id))
        : tasks
}
