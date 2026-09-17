import type { EventManagerEvent } from '@revolist/revogrid-pro'
import type { DependencyEntity } from '@revolist/gantt'
import { getOwnerAvatar, getOwnerAvatarIndex } from './fixtures'
import type { PlanningTask } from './types'

export type PlanningEditDetail = Partial<
    Pick<EventManagerEvent, 'data' | 'domainChanges' | 'models'>
>

const HOUR_IN_MS = 3_600_000

/** Applies Gantt's producer-owned dependency mutations to this demo's source. */
export function updateFromGanttDependencies(
    dependencies: readonly DependencyEntity[],
    detail: Pick<EventManagerEvent, 'domainChanges'>
): DependencyEntity[] {
    let next = [...dependencies]

    for (const change of detail.domainChanges ?? []) {
        if (change.type !== 'gantt-dependency') continue
        const { dependencyId, dependency } = change.detail as {
            dependencyId?: DependencyEntity['id']
            dependency?: DependencyEntity | null
        }
        if (!dependencyId) continue

        if (!dependency) {
            next = next.filter(({ id }) => id !== dependencyId)
            continue
        }

        const index = next.findIndex(({ id }) => id === dependencyId)
        if (index < 0) next = [...next, dependency]
        else next = next.map((item, itemIndex) =>
            itemIndex === index ? dependency : item
        )
    }

    return next
}

function applyDerivedPlanningFields(
    task: PlanningTask,
    patch: Record<string, unknown>
): PlanningTask {
    const next = { ...task, ...patch } as PlanningTask

    if (Object.prototype.hasOwnProperty.call(patch, 'owner')) {
        next.ownerAvatar = getOwnerAvatar(String(next.owner ?? ''))
        next.ownerAvatarIndex = getOwnerAvatarIndex(String(next.owner ?? ''))
    }

    if (
        Object.prototype.hasOwnProperty.call(patch, 'startDate') ||
        Object.prototype.hasOwnProperty.call(patch, 'endDate')
    ) {
        const start = Date.parse(next.startDate)
        let end = Date.parse(next.endDate)
        if (Number.isFinite(start) && Number.isFinite(end) && end <= start) {
            end = start + HOUR_IN_MS
            next.endDate = new Date(end).toISOString()
        }
        next.duration =
            next.type === 'milestone' || !Number.isFinite(start) || !Number.isFinite(end)
                ? 0
                : Math.max(0, (end - start) / HOUR_IN_MS)
    }

    return next
}

/** Apply authored field patches emitted by every mapped planning plugin. */
export function updateFromPlanningEdit(
    tasks: PlanningTask[],
    detail: PlanningEditDetail
): PlanningTask[] {
    if (!detail.data || typeof detail.data !== 'object') return tasks

    const patches = new Map<string, Record<string, unknown>>()
    for (const [rowIndex, value] of Object.entries(detail.data)) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) continue
        const patch = value as Record<string, unknown>
        const model = detail.models?.[Number(rowIndex)] as
            | Record<string, unknown>
            | undefined
        const id = model?.id ?? patch.id
        if (id === undefined || id === null || id === '') continue
        const key = String(id)
        const authoredPatch = { ...patch }
        delete authoredPatch.id
        // The currently bundled Gantt trial emits its internal field name for
        // timeline-handle edits. Keep every demo framework on the authored
        // task contract until the package-level translation is released.
        if (
            'progressPercent' in authoredPatch &&
            !('percentDone' in authoredPatch)
        ) {
            authoredPatch.percentDone = authoredPatch.progressPercent
            delete authoredPatch.progressPercent
        }
        if (!Object.keys(authoredPatch).length) continue
        patches.set(key, {
            ...(patches.get(key) ?? {}),
            ...authoredPatch,
        })
    }

    if (!patches.size) return tasks
    const updated = tasks.map((task) => {
        const patch = patches.get(task.id)
        return patch ? applyDerivedPlanningFields(task, patch) : task
    })
    const tasksById = new Map(updated.map((task) => [task.id, task]))
    Object.values(detail.models ?? {}).forEach((model) => {
        if (!model || typeof model !== 'object') return
        const row = model as Record<string, unknown>
        const task = tasksById.get(String(row.id ?? ''))
        if (task) Object.assign(row, task)
    })
    return updated
}
