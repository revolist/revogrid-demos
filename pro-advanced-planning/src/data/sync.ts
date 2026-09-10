import type {
    GanttBeforeAssignmentChangeDetail,
    GanttBeforeTaskChangeDetail,
} from '@revolist/gantt'
import type {
    KanbanCardCreateDetail,
    KanbanCardDeleteDetail,
    KanbanCardMoveDetail,
    KanbanCardUpdateDetail,
} from '@revolist/kanban'
import type { EventSchedulerEventChangedDetail } from '@revolist/scheduler'
import { getOwnerAvatar, getOwnerAvatarIndex } from './fixtures'
import {
    getPlanningDurationHours,
    getPlanningEndDate,
} from './source'
import { applyPlanningGridEdit } from './workspace'
import type { PlanningTask } from './types'

export function updateFromGrid(
    tasks: PlanningTask[],
    detail: {
        model?: { id?: unknown }
        prop?: unknown
        rowIndex?: number
        val?: unknown
    }
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
    detail: {
        model?: { id?: unknown }
        prop?: unknown
        rowIndex?: number
        val?: unknown
    },
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

export function updateFromKanban(
    tasks: PlanningTask[],
    detail: KanbanCardMoveDetail<PlanningTask>
): PlanningTask[] {
    const changed = new Map(detail.changedCards.map((task) => [task.id, task]))
    return tasks.map((task) => changed.get(task.id) ?? task)
}

export function updateFromKanbanCreate(
    tasks: PlanningTask[],
    detail: KanbanCardCreateDetail<PlanningTask>
): PlanningTask[] {
    const next = [...tasks]
    next.splice(detail.sourceIndex, 0, detail.card)
    return next
}

export function updateFromKanbanUpdate(
    tasks: PlanningTask[],
    detail: KanbanCardUpdateDetail<PlanningTask>
): PlanningTask[] {
    return tasks.map((task) =>
        task.id === String(detail.cardId) ? detail.card : task
    )
}

export function updateFromKanbanDelete(
    tasks: PlanningTask[],
    detail: KanbanCardDeleteDetail<PlanningTask>
): PlanningTask[] {
    const deleted = new Set(detail.cardIds.map(String))
    return tasks.filter((task) => !deleted.has(task.id))
}

function readHourDuration(value: unknown, unit: unknown): number | undefined {
    if (
        typeof value === 'number' &&
        Number.isFinite(value) &&
        unit === 'hour'
    ) {
        return value
    }
    if (typeof value !== 'string') return
    const match = value.trim().match(/^([0-9]+(?:\.[0-9]+)?)h$/i)
    const hours = match ? Number(match[1]) : Number.NaN
    return Number.isFinite(hours) ? hours : undefined
}

export function updateFromGantt(
    tasks: PlanningTask[],
    detail: GanttBeforeTaskChangeDetail
): PlanningTask[] {
    if (detail.taskId === null || !detail.sourcePatch) return tasks
    const taskIndex = tasks.findIndex(
        (task) => task.id === String(detail.taskId)
    )
    if (taskIndex < 0) return tasks
    if (detail.action === 'delete') {
        return tasks.filter((_, index) => index !== taskIndex)
    }

    const task = tasks[taskIndex]
    const sourcePatch = { ...detail.sourcePatch }
    if (detail.action === 'move') {
        // Moving changes the start only. Ignore the Gantt projection's finish
        // and duration patch so repeated moves cannot grow the task.
        sourcePatch.duration = getPlanningDurationHours(task)
        sourcePatch.durationUnit = 'hour'
        sourcePatch.durationIsElapsed = true
        delete sourcePatch.endDate
    }
    if (detail.action === 'resize') {
        const startDate =
            typeof sourcePatch.startDate === 'string'
                ? sourcePatch.startDate
                : task.startDate
        const endDate =
            typeof sourcePatch.endDate === 'string'
                ? sourcePatch.endDate
                : task.endDate
        const durationHours =
            (Date.parse(endDate) - Date.parse(startDate)) / 3_600_000
        if (Number.isFinite(durationHours) && durationHours > 0) {
            sourcePatch.duration = durationHours
            sourcePatch.durationUnit = 'hour'
            sourcePatch.durationIsElapsed = true
        }
    }
    if (detail.action === 'edit' && sourcePatch.duration !== undefined) {
        const durationHours = readHourDuration(
            sourcePatch.duration,
            sourcePatch.durationUnit ?? task.durationUnit
        )
        if (durationHours !== undefined) {
            sourcePatch.duration = durationHours
            sourcePatch.durationUnit = 'hour'
            sourcePatch.durationIsElapsed = true
        }
    }
    if (detail.action === 'indent') {
        sourcePatch.parentId = tasks[taskIndex - 1]?.id ?? task.parentId ?? null
    } else if (detail.action === 'outdent') {
        const parent = tasks.find(({ id }) => id === String(task.parentId))
        sourcePatch.parentId = parent?.parentId ?? null
    }
    return tasks.map((candidate) => {
        if (candidate.id !== String(detail.taskId)) return candidate
        const updated = { ...candidate, ...sourcePatch } as PlanningTask
        return { ...updated, endDate: getPlanningEndDate(updated) }
    })
}

export function updateFromGanttAssignment(
    tasks: PlanningTask[],
    detail: GanttBeforeAssignmentChangeDetail
): PlanningTask[] {
    const owners = detail.assignments
        .filter(({ taskId }) => String(taskId) === String(detail.taskId))
        .map(({ resourceId }) => String(resourceId))
    const owner = owners[0] ?? ''

    return tasks.map((task) =>
        task.id === String(detail.taskId)
            ? {
                  ...task,
                  owner,
                  ownerAvatar: getOwnerAvatar(owner),
                  ownerAvatarIndex: getOwnerAvatarIndex(owner),
                  owners,
                  ownerAvatars: owners.map(getOwnerAvatar),
              }
            : task
    )
}

export function updateFromScheduler(
    tasks: PlanningTask[],
    detail: EventSchedulerEventChangedDetail
): PlanningTask[] {
    const events = new Map(
        detail.events.map((event) => [String(event.id), event])
    )
    return tasks.map((task) => {
        const event = events.get(task.id)
        if (!event) return task
        const owner =
            event.resourceId === undefined ? '' : String(event.resourceId)
        return {
            ...task,
            name: event.title ?? task.name,
            owner,
            ownerAvatar: getOwnerAvatar(owner),
            ownerAvatarIndex: getOwnerAvatarIndex(owner),
            owners: owner ? [owner] : [],
            ownerAvatars: owner ? [getOwnerAvatar(owner)] : [],
            startDate: event.startDateTime,
            workflowStatus: event.status ?? task.workflowStatus,
            color: event.color,
            duration:
                (Date.parse(event.endDateTime) -
                    Date.parse(event.startDateTime)) /
                3_600_000,
            durationUnit: 'hour',
            durationIsElapsed: true,
            endDate: event.endDateTime,
        } satisfies PlanningTask
    })
}
