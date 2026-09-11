import type { PlanningFilters, PlanningProjectId, PlanningTask } from './types'
import { getOwnerAvatar, getOwnerAvatarIndex } from './fixtures'

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

export function deletePlanningTasks(
    tasks: PlanningTask[],
    taskIds: readonly string[]
): PlanningTask[] {
    const deleted = new Set(taskIds)
    return deleted.size
        ? tasks.filter(({ id }) => !deleted.has(id))
        : tasks
}

function readGridEditValue(value: unknown, prop: string): string {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const option = value as Record<string, unknown>
        const optionValue = option.value ?? option[prop] ?? option.label
        if (optionValue !== undefined) return String(optionValue)
    }
    return String(value ?? '')
}

export function applyPlanningGridEdit(
    tasks: PlanningTask[],
    detail: { model?: { id?: unknown }; prop?: unknown; val?: unknown }
): PlanningTask[] {
    const prop = String(detail.prop ?? '')
    if (!['name', 'owner', 'workflowStatus', 'percentDone'].includes(prop))
        return tasks
    const taskId = detail.model?.id
    if (taskId === undefined || taskId === null) return tasks
    return tasks.map((task) => {
        if (task.id !== String(taskId)) return task
        const value =
            prop === 'percentDone'
                ? Math.max(0, Math.min(100, Number(detail.val ?? 0)))
                : readGridEditValue(detail.val, prop)
        return {
            ...task,
            [prop]: value,
            ...(prop === 'owner'
                ? {
                      ownerAvatar: getOwnerAvatar(String(value)),
                      ownerAvatarIndex: getOwnerAvatarIndex(String(value)),
                      owners: [String(value)],
                  }
                : {}),
        }
    })
}
