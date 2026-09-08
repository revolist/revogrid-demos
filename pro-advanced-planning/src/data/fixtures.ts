import type { PlanningTask } from './types'

export type PlanningPerson = {
    readonly id: string
    readonly name: string
    readonly role: string
    readonly avatarUrl?: string
    readonly color?: string
}

const avatarUrls = {
    Ava: new URL('../assets/avatars/ava.webp', import.meta.url).href,
    Noah: new URL('../assets/avatars/noah.webp', import.meta.url).href,
    Leo: new URL('../assets/avatars/leo.webp', import.meta.url).href,
    Maya: new URL('../assets/avatars/maya.webp', import.meta.url).href,
    Nina: new URL('../assets/avatars/nina.webp', import.meta.url).href,
} as const

export const planningPeople: readonly PlanningPerson[] = [
    {
        id: 'Ava',
        name: 'Ava',
        role: 'Design',
        color: '#4f46e5',
        avatarUrl: avatarUrls.Ava,
    },
    {
        id: 'Noah',
        name: 'Noah',
        role: 'Engineering',
        color: '#0891b2',
        avatarUrl: avatarUrls.Noah,
    },
    {
        id: 'Leo',
        name: 'Leo',
        role: 'QA',
        color: '#16a34a',
        avatarUrl: avatarUrls.Leo,
    },
    {
        id: 'Maya',
        name: 'Maya',
        role: 'Product',
        color: '#008b55',
        avatarUrl: avatarUrls.Maya,
    },
    {
        id: 'Nina',
        name: 'Nina',
        role: 'Security',
        color: '#7c3aed',
        avatarUrl: avatarUrls.Nina,
    },
]

export function getOwnerAvatar(owner: string): string {
    const person = planningPeople.find(({ id }) => id === owner)
    return person?.avatarUrl ?? owner
}

/** A stable native-avatar color index for grid cells and selection filters. */
export function getOwnerAvatarIndex(owner: string): number {
    const index = planningPeople.findIndex(({ id }) => id === owner)
    return index >= 0 ? index + 1 : 1
}

const workdayOffsets = [
    0, 1, 2, 3, 4, 7, 8, 9, 10, 11, 14, 15, 16, 17, 18, 21, 22, 23,
] as const

function getTaskSlot(ownerTaskIndex: number) {
    const isFirstSplitDay = ownerTaskIndex === 8 || ownerTaskIndex === 9
    const isLastSplitDay = ownerTaskIndex === 18 || ownerTaskIndex === 19
    const workdayIndex = isFirstSplitDay
        ? 8
        : isLastSplitDay
          ? 17
          : ownerTaskIndex < 8
            ? ownerTaskIndex
            : ownerTaskIndex - 1
    const afternoon = ownerTaskIndex === 9 || ownerTaskIndex === 19
    return {
        dayOffset: workdayOffsets[workdayIndex],
        startHour: isFirstSplitDay || isLastSplitDay ? (afternoon ? 13 : 8) : 8,
        endHour: isFirstSplitDay || isLastSplitDay ? (afternoon ? 17 : 12) : 17,
    }
}

export function createTasks(): PlanningTask[] {
    const names = [
        'Define requirements',
        'Design system',
        'API integration',
        'Authentication',
        'Invoice templates',
        'Payment settings',
        'Historical data import',
        'Role permissions',
        'Analytics dashboard',
        'Export reports',
        'Notification center',
        'Subscription management',
        'Data synchronization',
        'Accessibility review',
        'Account preferences',
        'Search indexing',
        'Usage reporting',
        'Audit trail',
        'Customer onboarding',
        'Workspace settings',
        'Webhook delivery',
        'Bulk actions',
        'Error monitoring',
        'Session management',
        'Performance audit',
        'Team invitations',
        'Account recovery',
        'Email templates',
        'Tax settings',
        'Invoice history',
        'Payment methods',
        'Billing address',
        'Plan upgrade',
        'Renewal reminders',
        'Refund workflow',
        'Credit notes',
        'Revenue metrics',
        'Usage limits',
        'User directory',
        'Activity feed',
        'Backup policy',
        'Data retention',
        'Approval workflow',
        'Document storage',
        'Release checklist',
        'QA automation',
        'API documentation',
        'Staging rollout',
        'Security review',
        'Launch readiness',
        'Customer research',
        'Journey mapping',
        'Design QA',
        'Component library',
        'Mobile navigation',
        'Search relevance',
        'Account provisioning',
        'Permissions audit',
        'SSO configuration',
        'Data migration',
        'Invoice reconciliation',
        'Payment retries',
        'Tax calculation',
        'Revenue recognition',
        'Subscription pause',
        'Usage alerts',
        'Cost allocation',
        'Forecast model',
        'Monthly close',
        'Finance dashboard',
        'Incident runbook',
        'Load testing',
        'Observability setup',
        'Database indexing',
        'Cache strategy',
        'Accessibility testing',
        'Localization review',
        'Content migration',
        'Legal review',
        'Privacy controls',
        'Release notes',
        'Feature flags',
        'Beta program',
        'Support training',
        'Launch communications',
        'Post-launch review',
        'Customer feedback',
        'Roadmap planning',
        'Operations handoff',
        'Quarterly planning',
        'Design retrospective',
        'Architecture review',
        'Data quality audit',
        'Workflow automation',
        'Partner integration',
        'Mobile performance',
        'Knowledge base',
        'Customer success review',
        'Platform hardening',
        'Release readiness',
    ]
    const owners = ['Maya', 'Ava', 'Noah', 'Nina', 'Leo'] as const
    const projects = [
        'customer-portal',
        'billing-platform',
        'internal-tools',
    ] as const
    const statuses = [
        'done',
        'done',
        'in-progress',
        'blocked',
        'not-started',
    ] as const
    return names.map((name, index) => {
        const owner = owners[index % owners.length]
        const projectIndex = index % projects.length
        const { dayOffset, startHour, endHour } = getTaskSlot(
            Math.floor(index / owners.length)
        )
        const start = new Date(Date.UTC(2026, 8, 7 + dayOffset, startHour))
        const end = new Date(Date.UTC(2026, 8, 7 + dayOffset, endHour))
        // Spread activity across the fixture weeks, weekdays, and working hours so
        // the Time Matrix has meaningful, deterministic groups to filter.
        const activityAt = new Date(
            Date.UTC(
                2026,
                8,
                7 + ((index * 3) % 21),
                [8, 9, 10, 11, 13, 14, 15, 16, 17][index % 9],
                [0, 15, 30, 45][index % 4]
            )
        ).toISOString()
        const startDate = start.toISOString()
        const endDate = end.toISOString()
        // Cycle independently of ownership so each owner has a representative mix.
        const workflowStatus =
            statuses[
                (index + Math.floor(index / owners.length)) % statuses.length
            ]
        const percentDone =
            workflowStatus === 'done'
                ? 100
                : workflowStatus === 'not-started'
                  ? 0
                  : 20 + ((index * 15) % 75)
        return {
            id: `task-${String(index + 1).padStart(3, '0')}`,
            name,
            owner,
            ownerAvatar: getOwnerAvatar(owner),
            ownerAvatarIndex: getOwnerAvatarIndex(owner),
            owners: [owner],
            ownerAvatars: [getOwnerAvatar(owner)],
            startDate,
            endDate,
            activityAt,
            duration: `${endHour - startHour}h`,
            percentDone,
            order: (index + 1) * 1000,
            workflowStatus,
            priority: [500, 700, 900][index % 3],
            projectId: projects[projectIndex],
            budget: 1800 + index * 200,
        } as PlanningTask
    })
}
