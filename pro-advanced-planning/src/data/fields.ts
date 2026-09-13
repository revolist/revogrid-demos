import type { ViewFieldMap } from '@revolist/revogrid-pro'

/** One application-owned task shape shared by every planning view. */
export const planningFields = {
    id: 'id',
    title: 'name',
    status: 'workflowStatus',
    start: 'startDate',
    end: 'endDate',
    color: 'color',
    progress: 'percentDone',
    resourceId: 'owner',
} satisfies ViewFieldMap
