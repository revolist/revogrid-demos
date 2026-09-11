import type {
    ColumnFilterConfig,
    ColumnRegular,
    RowResizeConfig,
} from '@revolist/revogrid'
import {
    avatarWithTextRenderer,
    ColumnDropdown,
    FIlTER_SELECTION,
    FIlTER_SLIDER,
    type RowOrderPluginConfig,
} from '@revolist/revogrid-pro'
import { createDefaultTaskTableColumn } from '@revolist/gantt'
import { getOwnerAvatar, getOwnerAvatarIndex, planningPeople } from './fixtures'
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

export const planningRowOrder: RowOrderPluginConfig = {
    prop: 'name',
    preview: 'compact',
}

export const planningRowResize: RowResizeConfig = {
    fullRow: true,
}

const ownerAvatarRenderer: ColumnRegular['cellTemplate'] = (
    h,
    { value, column, model }
) => {
    const owner = String(value ?? model.owner ?? '')
    return avatarWithTextRenderer(h, {
        value: owner,
        column,
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
        },
        itemTemplate: {
            priority: priorityFilterItemTemplate,
        },
        syncCellTemplate: {
            owner: true,
        },
    },
} satisfies ColumnFilterConfig

export const activePlanningFilterConfig = {
    ...planningFilterConfig,
    multiFilterItems: {
        workflowStatus: [
            {
                id: 0,
                type: 'chipBadgeSelection',
                value: {
                    values: ['in-progress', 'blocked', 'not-started'],
                    includeBlanks: false,
                },
                relation: 'and',
            },
        ],
    },
} satisfies ColumnFilterConfig

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
        avatarSize: 20,
        cellTemplate: ownerAvatarRenderer,
        cellProperties: paddedCellProperties,
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
        step: 5,
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
    createDefaultTaskTableColumn('name'),
    createDefaultTaskTableColumn('assignees'),
    createDefaultTaskTableColumn('startDate'),
    createDefaultTaskTableColumn('endDate'),
    createDefaultTaskTableColumn('percentDone'),
]
