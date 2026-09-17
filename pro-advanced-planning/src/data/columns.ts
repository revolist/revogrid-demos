import type {
    ColumnRegular,
} from '@revolist/revogrid'
import {
    avatarTemplate,
    avatarWithTextRenderer,
    ColumnDropdown,
    FIlTER_SELECTION,
    FIlTER_SLIDER,
    type RowOrderPluginConfig,
    type SelectionItemTemplate,
    type AdvancedFilterConfig,
} from '@revolist/revogrid-pro'
import { createDefaultTaskTableColumn } from '@revolist/gantt'
import {
    getOwnerAvatar,
    getOwnerAvatarIndex,
    getOwnerName,
    planningPeople,
} from './fixtures'
import {
    FILTER_CALENDAR_RANGE,
    FILTER_CHIP_BADGE_TOGGLES,
    FILTER_HISTOGRAM_BRUSH,
    FILTER_TIME_MATRIX,
    planningStructuredFilterTypes,
} from './planning.structured'
import {
    planningGridFormats,
    priorityIndicatorRenderer,
    workflowStatusBadgeRenderer,
} from './formatting'

const ownerEditorOptions = planningPeople.map(({ id, name }) => ({
    value: id,
    label: name,
    owner: name,
    ownerAvatar: getOwnerAvatar(id),
    ownerAvatarIndex: getOwnerAvatarIndex(id),
}))

const ganttAssigneeFilterItems = planningPeople.map(({ id, name }) => ({
    // Gantt projects resource IDs in lowercase; keep that matching value while
    // presenting the canonical person name in the selection popup.
    value: id.toLocaleLowerCase(),
    label: name,
}))

const ganttAssigneeFilterItemTemplate: SelectionItemTemplate = (h, { value }) => {
    const owner = getOwnerName(value)
    return h('span', { class: 'avatar-cell-with-text' }, [
        avatarTemplate(h, {
            value: getOwnerAvatar(value),
            index: getOwnerAvatarIndex(value) - 1,
            label: owner,
            size: 20,
        }),
        h('span', { class: 'avatar-cell-with-text__label' }, owner),
    ])
}

export const planningRowOrder: RowOrderPluginConfig = {
    prop: 'name',
    preview: 'compact',
    previewProp: 'name',
}

const ownerAvatarRenderer: ColumnRegular['cellTemplate'] = (
    h,
    props
) => {
    const { value, model } = props
    const owner = String(value ?? model.owner ?? '')
    return avatarWithTextRenderer(h, {
        ...props,
        value: owner,
        model: {
            ...model,
            owner,
            ownerAvatar: getOwnerAvatar(owner),
            ownerAvatarIndex: getOwnerAvatarIndex(owner),
        },
    })
}

const workflowLabels: Record<string, string> = {
    'not-started': 'Planned',
    'in-progress': 'In progress',
    blocked: 'Blocked',
    done: 'Done',
}

const workflowEditorOptions = Object.entries(workflowLabels).map(
    ([value, label]) => ({
        value,
        label,
    })
)

const priorityFilterItems = [
    { value: '500', label: 'Normal' },
    { value: '700', label: 'High' },
    { value: '900', label: 'Critical' },
]

const priorityFilterItemTemplate = (
    h: Parameters<typeof priorityIndicatorRenderer>[0],
    { value }: { value: string }
) => priorityIndicatorRenderer(h, { value } as never)

const paddedCellProperties: NonNullable<
    ColumnRegular['cellProperties']
> = () => ({
    style: { padding: '0 16px' },
})

const taskCellProperties: NonNullable<
    ColumnRegular['cellProperties']
> = () => ({
    class: 'planning-demo__task-cell',
})

export const planningFilterConfig = {
    structuredFilterTypes: planningStructuredFilterTypes,
    localization: {
        captions: {
            timeMatrixBadgeSummaryOne: '1 hr',
            timeMatrixBadgeSummaryMany: '{hours} hrs',
        },
    },
    multiFilterItems: {},
    selection: {
        getItems: {
            priority: () => priorityFilterItems,
            assignees: () => ganttAssigneeFilterItems,
        },
        itemTemplate: {
            priority: priorityFilterItemTemplate,
            assignees: ganttAssigneeFilterItemTemplate,
        },
        syncCellTemplate: {
            owner: true,
            // Gantt exposes the resource column as `assignees`; reuse its
            // avatar cell template in the corresponding selection filter.
            assignees: true,
        },
    },
} satisfies AdvancedFilterConfig

export const activePlanningFilterConfig = {
    ...planningFilterConfig,
    multiFilterItems: {
        workflowStatus: [
            {
                id: 0,
                // This operator is registered by the Pro filter plugin rather
                // than the core filter-name registry.
                type: 'chipBadgeSelection' as any,
                value: {
                    values: ['in-progress', 'blocked', 'not-started'],
                    includeBlanks: false,
                },
                relation: 'and',
            },
        ],
    },
} satisfies AdvancedFilterConfig

const percentDoneColumn = createDefaultTaskTableColumn('percentDone')

export const gridColumnTypes = {
    dropdown: ColumnDropdown,
}

export const gridColumns: ColumnRegular[] = [
    {
        prop: '_selected',
        name: '',
        size: 48,
        pin: 'colPinStart',
        rowSelect: true,
        readonly: true,
        filter: false,
    },
    {
        prop: 'name',
        name: 'Task',
        size: 220,
        pin: 'colPinStart',
        rowDrag: true,
        cellProperties: taskCellProperties,
        sortable: true,
        filter: [FIlTER_SELECTION],
        filterPlaceholder: 'All tasks',
        dataGridFormat: planningGridFormats.name,
    },
    {
        prop: 'owner',
        name: 'Owner',
        size: 120,
        sortable: true,
        filter: [FIlTER_SELECTION],
        columnType: 'dropdown',
        dropdown: {
            source: ownerEditorOptions,
            syncCellTemplate: true,
            cellTemplate: ownerAvatarRenderer,
        },
        avatarProp: 'ownerAvatar',
        avatarIndexProp: 'ownerAvatarIndex',
        avatarLabelProp: 'owner',
        cellTemplate: ownerAvatarRenderer,
        cellProperties: paddedCellProperties,
        dataGridFormat: planningGridFormats.owner,
    },
    {
        prop: 'workflowStatus',
        name: 'Status',
        size: 145,
        sortable: true,
        filter: [FILTER_CHIP_BADGE_TOGGLES],
        filterPlaceholder: 'All',
        columnType: 'dropdown',
        dropdown: {
            source: workflowEditorOptions,
            syncCellTemplate: true,
            cellTemplate: workflowStatusBadgeRenderer,
        },
        cellProperties: paddedCellProperties,
        dataGridFormat: planningGridFormats.workflowStatus,
    },
    {
        prop: 'priority',
        name: 'Priority',
        size: 110,
        readonly: true,
        sortable: true,
        filter: [FIlTER_SELECTION],
        filterPlaceholder: 'All priorities',
        cellProperties: paddedCellProperties,
        dataGridFormat: planningGridFormats.priority,
    },
    {
        prop: 'endDate',
        name: 'Due date',
        size: 130,
        readonly: true,
        sortable: true,
        filter: [FILTER_CALENDAR_RANGE],
        filterPlaceholder: 'Due date',
        dataGridFormat: planningGridFormats.endDate,
    },
    {
        ...percentDoneColumn,
        name: 'Progress',
        size: 116,
        sortable: true,
        filter: [FIlTER_SLIDER],
        min: 0,
        max: 100,
        step: 1,
        dataGridFormat: planningGridFormats.percentDone,
    },
    {
        prop: 'budget',
    name: 'Budget',
    size: 106,
    readonly: true,
    sortable: true,
    filter: [FILTER_HISTOGRAM_BRUSH],
    dataGridFormat: planningGridFormats.budget,
    },
    {
        prop: 'activityAt',
        name: 'Activity time',
        size: 173,
        readonly: true,
        sortable: true,
        filter: [FILTER_TIME_MATRIX],
        filterPlaceholder: 'Time',
        dataGridFormat: planningGridFormats.activityAt,
    },
]

export const ganttColumns = [
    { ...createDefaultTaskTableColumn('name'), rowDrag: false },
    {
        ...createDefaultTaskTableColumn('assignees'),
        name: 'Assignee',
        readonly: true,
        avatarProp: 'ownerAvatar',
        avatarIndexProp: 'ownerAvatarIndex',
        avatarLabelProp: 'owner',
        avatarSize: 20,
        cellTemplate: ownerAvatarRenderer,
        cellProperties: paddedCellProperties,
    },
    createDefaultTaskTableColumn('startDate'),
    createDefaultTaskTableColumn('endDate'),
    createDefaultTaskTableColumn('percentDone'),
]
