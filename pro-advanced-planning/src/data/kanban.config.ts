import { renderKanbanProgress } from '@revolist/kanban'
import type { KanbanConfig } from '@revolist/kanban'
import { avatarTemplate } from '@revolist/revogrid-pro'
import { getOwnerAvatar, getOwnerAvatarIndex } from './fixtures'
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
        assigneeField: 'owner',
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
                            title: card.owner,
                        },
                        [
                            h(
                                'span',
                                { class: 'planning-card__avatar-stack' },
                                avatarTemplate(h, {
                                    ariaLabel: card.owner,
                                    className: 'planning-card__avatar',
                                    index: Math.max(
                                        getOwnerAvatarIndex(card.owner) - 1,
                                        0
                                    ),
                                    label: card.owner,
                                    size: 20,
                                    value: getOwnerAvatar(card.owner),
                                })
                            ),
                            h(
                                'span',
                                { class: 'planning-card__owner-label' },
                                card.owner
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
