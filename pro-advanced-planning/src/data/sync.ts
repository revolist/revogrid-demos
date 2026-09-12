import type { GanttEventManagerDomainChange } from '@revolist/gantt'
import type { KanbanEventManagerDomainChange } from '@revolist/kanban'
import type { EventSchedulerEventManagerDomainChange } from '@revolist/scheduler'
import { getOwnerAvatar, getOwnerAvatarIndex } from './fixtures'
import { applyPlanningGridEdit } from './workspace'
import type { PlanningTask } from './types'

export type PlanningDomainChange =
    | GanttEventManagerDomainChange
    | KanbanEventManagerDomainChange<PlanningTask>
    | EventSchedulerEventManagerDomainChange

export type PlanningGridEditDetail = {
    model?: { id?: unknown }
    prop?: unknown
    rowIndex?: number
    val?: unknown
}

export type PlanningEditDetail = {
    readonly domainChanges?: readonly PlanningDomainChange[]
    readonly sourceMutation?: 'event-manager' | 'producer'
}

export function updateFromGrid(
    tasks: PlanningTask[],
    detail: PlanningGridEditDetail
): PlanningTask[] {
    const updated = applyPlanningGridEdit(tasks, detail)
    syncGridRow(detail.model, updated)
    return updated
}

/**
 * Resolves direct cell-editor events that carry a row index but no model.
 * `getVisibleSource()` preserves the grid's current filtered and sorted order,
 * letting the workspace update its canonical task by stable ID.
 */
export function updateFromGridSource(
    tasks: PlanningTask[],
    detail: PlanningGridEditDetail,
    visibleTasks: readonly PlanningTask[]
): PlanningTask[] {
    const visibleModel =
        typeof detail.rowIndex === 'number'
            ? visibleTasks[detail.rowIndex]
            : undefined
    const model =
        detail.model?.id === undefined && typeof detail.rowIndex === 'number'
            ? visibleModel
            : detail.model
    const prop = String(detail.prop ?? '')
    const visibleValue =
        (model as Record<string, unknown> | undefined)?.[prop] ??
        visibleModel?.[prop as keyof PlanningTask]
    const value = detail.val ?? visibleValue
    const updated = applyPlanningGridEdit(tasks, {
        ...detail,
        model,
        val: value,
    })
    syncGridRow(model, updated)
    syncGridRow(visibleModel, updated)
    return updated
}

function syncGridRow(model: unknown, tasks: readonly PlanningTask[]): void {
    if (!model || typeof model !== 'object') return
    const row = model as Record<string, unknown>
    const task = tasks.find(({ id }) => id === String(row.id))
    if (task) Object.assign(row, task)
}

/** Apply committed Gantt, Kanban, and Scheduler edits to the shared task list. */
export function updateFromPlanningEdit(
    tasks: PlanningTask[],
    detail: PlanningEditDetail
): PlanningTask[] {
    return (detail.domainChanges ?? []).reduce<PlanningTask[]>(
        (current, change) => {
            if (change.type === 'kanban-card') {
                const card = change.detail.card
                if (!card) {
                    return current.filter(
                        ({ id }) => id !== String(change.detail.cardId)
                    )
                }
                return current.some(({ id }) => id === card.id)
                    ? current.map((task) =>
                          task.id === card.id ? card : task
                      )
                    : [...current, card]
            }

            if (change.type === 'gantt-task') {
                const ganttTask = change.detail.task
                if (!ganttTask) {
                    return change.detail.action === 'delete'
                        ? current.filter(
                              ({ id }) =>
                                  id !== String(change.detail.taskId)
                          )
                        : current
                }
                const updated = current.map((task): PlanningTask =>
                    task.id === String(ganttTask.id)
                        ? {
                              ...task,
                              name: ganttTask.name,
                              color: ganttTask.color,
                              parentId: ganttTask.parentId,
                              type: ganttTask.type,
                              workflowStatus: ganttTask.workflowStatus,
                              startDate: ganttTask.startDate,
                              endDate: ganttTask.endDate,
                              duration: ganttTask.duration,
                              durationUnit: 'hour',
                              durationIsElapsed: true,
                              percentDone: ganttTask.progressPercent,
                          }
                        : task
                )
                return moveTaskToSourceIndex(
                    updated,
                    String(ganttTask.id),
                    change.detail.index
                )
            }

            if (change.type === 'gantt-assignment') {
                const owners = change.detail.assignments.map(
                    ({ resourceId }) => String(resourceId)
                )
                const owner = owners[0] ?? ''
                return current.map((task): PlanningTask =>
                    task.id === String(change.detail.taskId)
                        ? {
                              ...task,
                              owner,
                              ownerAvatar: getOwnerAvatar(owner),
                              ownerAvatarIndex: getOwnerAvatarIndex(owner),
                              owners,
                          }
                        : task
                )
            }

            if (change.type === 'event-scheduler-event') {
                const event = change.detail.event
                if (!event) {
                    return current.filter(
                        ({ id }) => id !== String(change.detail.eventId)
                    )
                }
                const owner =
                    event.resourceId === undefined
                        ? ''
                        : String(event.resourceId)
                return current.map((task): PlanningTask =>
                    task.id === String(event.id)
                        ? {
                              ...task,
                              name: event.title ?? task.name,
                              owner,
                              ownerAvatar: getOwnerAvatar(owner),
                              ownerAvatarIndex: getOwnerAvatarIndex(owner),
                              owners: owner ? [owner] : [],
                              startDate:
                                  event.startDateTime as PlanningTask['startDate'],
                              endDate:
                                  event.endDateTime as PlanningTask['endDate'],
                              duration:
                                  (Date.parse(event.endDateTime) -
                                      Date.parse(event.startDateTime)) /
                                  3_600_000,
                              workflowStatus: (event.status ??
                                  task.workflowStatus) as PlanningTask['workflowStatus'],
                              color: event.color,
                          }
                        : task
                )
            }

            return current
        },
        tasks
    )
}

/**
 * Gantt provides a canonical source position after hierarchy row drops. Keep
 * that order in the controlled source so the parent precedes its new child.
 */
function moveTaskToSourceIndex(
    tasks: PlanningTask[],
    taskId: string,
    index: number | undefined
): PlanningTask[] {
    if (
        index === undefined ||
        !Number.isInteger(index) ||
        index < 0 ||
        index >= tasks.length
    ) {
        return tasks
    }
    const currentIndex = tasks.findIndex(({ id }) => id === taskId)
    if (currentIndex < 0 || currentIndex === index) return tasks
    const reordered = [...tasks]
    const [task] = reordered.splice(currentIndex, 1)
    reordered.splice(index, 0, task)
    return reordered
}
