export const PLANNING_TIP_STORAGE_KEY = 'revogrid-planning-tips-v2'

export const planningTipCopy = {
    edit: 'Double-click a task name to edit it. Press Enter to save.',
    kanban: 'Now switch to Kanban to see your updated task.',
} as const

export const planningTipCompletionCopy =
    'Your change is shared across views.'

export type PlanningTipStep = keyof typeof planningTipCopy | 'done'
export type PlanningTipEvent =
    | 'edit-committed'
    | 'edit-cancelled'
    | 'kanban-opened'
    | 'dismiss'
    | 'restart'

type TipStorage = Pick<Storage, 'getItem' | 'setItem'>

function browserStorage(): TipStorage | undefined {
    try {
        return window.sessionStorage
    } catch {
        return undefined
    }
}

/** Returns the edited task only when a task name was actually committed. */
export function changedPlanningTaskName(
    previous: readonly { id: string; name: string }[],
    next: readonly { id: string; name: string }[]
): string | undefined {
    const previousNames = new Map(previous.map(({ id, name }) => [id, name]))
    return next.find(({ id, name }) => previousNames.get(id) !== name)?.id
}

export function readPlanningTip(
    storage: TipStorage | undefined = browserStorage()
): PlanningTipStep {
    try {
        const saved = storage?.getItem(PLANNING_TIP_STORAGE_KEY)
        return saved === 'kanban' || saved === 'done' || saved === 'edit'
            ? saved
            : 'edit'
    } catch {
        return 'edit'
    }
}

export function nextPlanningTip(
    current: PlanningTipStep,
    event: PlanningTipEvent
): PlanningTipStep {
    if (event === 'restart') return 'edit'
    if (event === 'dismiss') return 'done'
    if (current === 'edit' && event === 'edit-committed') return 'kanban'
    if (current === 'kanban' && event === 'kanban-opened') return 'done'
    return current
}

export function updatePlanningTip(
    current: PlanningTipStep,
    event: PlanningTipEvent,
    storage: TipStorage | undefined = browserStorage()
): PlanningTipStep {
    const next = nextPlanningTip(current, event)
    if (next !== current) {
        try {
            storage?.setItem(PLANNING_TIP_STORAGE_KEY, next)
        } catch {
            // Keep the framework's in-memory state when storage is unavailable.
        }
    }
    return next
}
