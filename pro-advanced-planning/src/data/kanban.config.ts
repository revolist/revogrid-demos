import { renderKanbanProgress } from '@revolist/kanban'
import type { KanbanConfig } from '@revolist/kanban'
import { avatarTemplate } from '@revolist/revogrid-pro'
import type { PlanningTask } from './types'

export const kanbanConfig: KanbanConfig<PlanningTask> = {
    columns: [
        { prop: 'not-started', name: 'Planned', size: 228, minSize: 216 },
        { prop: 'in-progress', name: 'In progress', size: 228, minSize: 216 },
        { prop: 'blocked', name: 'Blocked', size: 228, minSize: 216 },
        { prop: 'done', name: 'Done', size: 228, minSize: 216 },
    ],
    columnField: 'workflowStatus',
    orderField: 'order',
    swimlaneColumn: false,
    card: {
        titleField: 'name',
        startDateField: 'startDate',
        endDateField: 'endDate',
        dateTimeZone: 'UTC',
        progressField: 'percentDone',
        colorField: 'color',
        assigneeField: 'owners',
        assigneeAvatarField: 'ownerAvatars',
    },
    customization: {
        cardContent: (h, { card }) =>
            h('div', { class: 'planning-card' }, [
                h(
                    'strong',
                    { class: 'planning-card__title', title: card.name },
                    card.name
                ),
                h('div', { class: 'planning-card__meta' }, [
                    h(
                        'span',
                        {
                            class: 'planning-card__owner',
                            title: card.owners.join(', '),
                        },
                        [
                            h(
                                'span',
                                { class: 'planning-card__avatar-stack' },
                                card.owners.map((owner, index) =>
                                    avatarTemplate(h, {
                                        ariaLabel: owner,
                                        className: 'planning-card__avatar',
                                        index,
                                        label: owner,
                                        size: 20,
                                        value:
                                            card.ownerAvatars[index] ?? owner,
                                    })
                                )
                            ),
                            h(
                                'span',
                                { class: 'planning-card__owner-label' },
                                card.owners.join(', ')
                            ),
                        ]
                    ),
                    h(
                        'span',
                        {},
                        `$${Number(card.budget).toLocaleString('en-US')}`
                    ),
                ]),
                renderKanbanProgress(h, {
                    value: card.percentDone,
                    label: 'Progress',
                }),
            ]),
    },
    cardRowHeight: 144,
}
