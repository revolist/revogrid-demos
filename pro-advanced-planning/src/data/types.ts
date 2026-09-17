export type PlanningView =
    | 'grid'
    | 'kanban'
    | 'gantt'
    | 'scheduler'
    | 'calendar'

export type PlanningTask = {
    id: string
    name: string
    color?: string
    owner: string
    ownerAvatar: string
    ownerAvatarIndex: number
    startDate: string
    endDate: string
    duration: number
    durationUnit: 'hour'
    durationIsElapsed: true
    parentId?: string | null
    type: 'task' | 'milestone'
    workflowStatus: string
    priority: number
    percentDone: number
    order: number
    projectId: PlanningProjectId
    budget: number
    /** A deterministic UTC activity timestamp used by the Time Matrix filter. */
    activityAt: string
}

export type PlanningProjectId =
    | 'customer-portal'
    | 'billing-platform'
    | 'internal-tools'

export type PlanningFilters = {
    query: string
    projectId: PlanningProjectId | 'all'
    statuses: string[]
    priorities: number[]
}

export const views: PlanningView[] = [
    'grid',
    'kanban',
    'gantt',
    'scheduler',
    'calendar',
]
