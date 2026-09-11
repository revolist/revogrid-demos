import type { GanttTaskSourceRow } from '@revolist/gantt'

export type PlanningView =
    | 'grid'
    | 'kanban'
    | 'gantt'
    | 'scheduler'
    | 'calendar'

export type PlanningTask = GanttTaskSourceRow & {
    id: string
    name: string
    color?: string
    owner: string
    ownerAvatar: string
    ownerAvatarIndex: number
    owners: string[]
    startDate: string
    endDate: string
    duration: number
    durationUnit: 'hour'
    durationIsElapsed: true
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
