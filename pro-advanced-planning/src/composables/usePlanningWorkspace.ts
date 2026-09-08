import { computed, onBeforeUnmount, ref } from 'vue'
import {
    AdvanceFilterPlugin,
    ColumnHidePlugin,
    ColumnStretchPlugin,
    DataGridFormattingPlugin,
    FilterHeaderPlugin,
    RowSelectPlugin,
    type AdvancedFilterBadgesOptions,
    type ColumnFilterConfig,
    type RowSelectConfig,
} from '@revolist/revogrid-pro'
import {
    GanttPlugin,
    type GanttBeforeAssignmentChangeDetail,
    type GanttBeforeTaskChangeDetail,
} from '@revolist/gantt'
import {
    KanbanPlugin,
    type KanbanCardCreateDetail,
    type KanbanCardDeleteDetail,
    type KanbanCardMoveDetail,
    type KanbanCardUpdateDetail,
} from '@revolist/kanban'
import {
    EventSchedulerPlugin,
    type EventSchedulerEventChangedDetail,
} from '@revolist/scheduler'
import {
    currentTheme,
    observeCurrentTheme,
} from '../../../composables/useRandomData'
import {
    activePlanningFilterConfig,
    activePlanningFilters,
    calendarConfig,
    clearPlanningRowSelection,
    createPlanningDataGridContextMenu,
    createTasks,
    deletePlanningTasks,
    filterPlanningTasks,
    ganttColumns,
    ganttConfig,
    ganttDependencies,
    ganttResources,
    planningDataGridFormatting,
    gridColumnTypes,
    gridColumns,
    kanbanConfig,
    mergeVisibleTasks,
    planningFilterConfig,
    schedulerConfig,
    schedulerResources,
    toGanttAssignments,
    toSchedulerEvents,
    updateFromGantt,
    updateFromGanttAssignment,
    updateFromGrid,
    updateFromGridSource,
    updateFromKanban,
    updateFromKanbanCreate,
    updateFromKanbanUpdate,
    updateFromScheduler,
    views,
    type PlanningTask,
    type PlanningView,
} from '../data'

const rowSelect: RowSelectConfig = { rowOrder: false }
const gridPlugins = [
    RowSelectPlugin,
    AdvanceFilterPlugin,
    FilterHeaderPlugin,
    DataGridFormattingPlugin,
    ColumnStretchPlugin,
    ColumnHidePlugin,
]
const ganttPlugins = [GanttPlugin]
const kanbanPlugins = [KanbanPlugin]
const schedulerPlugins = [EventSchedulerPlugin]
export function usePlanningWorkspace() {
    const rootRef = ref<HTMLElement>()
    const gridRef = ref<any>()
    const activeView = ref<PlanningView>('grid')
    const tasks = ref(createTasks())
    const quickSearch = ref('')
    const visibleTaskIds = ref<string[] | undefined>()
    const selectedCount = ref(0)
    const showInlineFilters = ref(false)
    const showHint = ref(true)
    const gridKey = ref(0)
    const gridFilterConfig = ref<ColumnFilterConfig>(planningFilterConfig)
    const displayedGridPlugins = computed(() =>
        showInlineFilters.value
            ? gridPlugins
            : gridPlugins.filter((plugin) => plugin !== FilterHeaderPlugin)
    )
    const quickFilter = computed(() => ({
        text: quickSearch.value,
        columns: ['name', 'owner'],
        debounceMs: 150,
    }))
    const gridElement = () =>
        (gridRef.value?.$el ?? gridRef.value) as
            | HTMLRevoGridElement
            | undefined
    const deleteSelectedTasks = (taskIds: readonly string[]) => {
        tasks.value = deletePlanningTasks(tasks.value, taskIds)
        selectedCount.value = 0
        void clearPlanningRowSelection(gridElement())
    }
    const dataGridContextMenu = createPlanningDataGridContextMenu(
        deleteSelectedTasks
    )
    const filterBadgeOptions = {
        className: 'planning-demo__filter-badges',
        badgeClassName: 'planning-demo__filter-badge',
        emptyClassName: 'planning-demo__filter-badges--empty',
        renderEmpty: () => '',
    } satisfies AdvancedFilterBadgesOptions
    const isDark = ref(currentTheme().isDark())
    const theme = computed(() => (isDark.value ? 'darkCompact' : 'compact'))
    const visibleTasks = computed(() => {
        const ids = visibleTaskIds.value
        if (!ids) return tasks.value
        const byId = new Map(tasks.value.map((task) => [task.id, task]))
        return ids.flatMap((id) => {
            const task = byId.get(id)
            return task ? [task] : []
        })
    })
    const visibleIds = computed(
        () => new Set(visibleTasks.value.map(({ id }) => id))
    )
    const ganttAssignments = computed(() =>
        toGanttAssignments(tasks.value).filter(({ taskId }) =>
            visibleIds.value.has(String(taskId))
        )
    )
    const schedulerEvents = computed(() =>
        toSchedulerEvents(visibleTasks.value)
    )
    const disconnectTheme = observeCurrentTheme((value) => {
        isDark.value = value
    })

    onBeforeUnmount(() => {
        disconnectTheme()
    })

    async function syncVisibleTasks() {
        const grid = gridElement()
        if (!grid) return
        visibleTaskIds.value = (await grid.getVisibleSource()).map(
            (task: PlanningTask) => task.id
        )
    }

    async function toggleFullscreen() {
        if (!rootRef.value) return
        if (document.fullscreenElement) await document.exitFullscreen()
        else await rootRef.value.requestFullscreen()
    }

    function applyActiveTasksPreset() {
        gridFilterConfig.value = activePlanningFilterConfig
        visibleTaskIds.value = filterPlanningTasks(
            tasks.value,
            activePlanningFilters()
        ).map(({ id }) => id)
        gridKey.value += 1
    }

    function toggleColumnFilters() {
        showInlineFilters.value = !showInlineFilters.value
        gridKey.value += 1
    }

    function resetWorkspace() {
        tasks.value = createTasks()
        quickSearch.value = ''
        visibleTaskIds.value = undefined
        selectedCount.value = 0
        gridFilterConfig.value = planningFilterConfig
        gridKey.value += 1
    }

    function merge(next: PlanningTask[]) {
        tasks.value = mergeVisibleTasks(tasks.value, next)
    }

    async function handleGridEdit(event: CustomEvent) {
        tasks.value = updateFromGrid(tasks.value, event.detail)
        const grid = gridElement()
        if (!grid) return
        const visible = (await grid.getVisibleSource()) as PlanningTask[]
        tasks.value = updateFromGridSource(tasks.value, event.detail, visible)
        visibleTaskIds.value = visible.map((task) => task.id)
    }

    function handleRowSelected(event: CustomEvent<{ count: number }>) {
        selectedCount.value = event.detail.count
    }

    function handleKanbanMove(
        event: CustomEvent<KanbanCardMoveDetail<PlanningTask>>
    ) {
        merge(updateFromKanban(visibleTasks.value, event.detail))
    }

    function handleKanbanCreate(
        event: CustomEvent<KanbanCardCreateDetail<PlanningTask>>
    ) {
        tasks.value = [
            ...tasks.value,
            ...updateFromKanbanCreate([], event.detail),
        ]
    }

    function handleKanbanUpdate(
        event: CustomEvent<KanbanCardUpdateDetail<PlanningTask>>
    ) {
        merge(updateFromKanbanUpdate(visibleTasks.value, event.detail))
    }

    function handleKanbanDelete(
        event: CustomEvent<KanbanCardDeleteDetail<PlanningTask>>
    ) {
        const deleted = new Set(event.detail.cardIds.map(String))
        tasks.value = tasks.value.filter(({ id }) => !deleted.has(id))
    }

    function handleGanttEdit(event: CustomEvent<GanttBeforeTaskChangeDetail>) {
        tasks.value = updateFromGantt(tasks.value, event.detail)
    }

    function handleGanttAssignmentEdit(
        event: CustomEvent<GanttBeforeAssignmentChangeDetail>
    ) {
        tasks.value = updateFromGanttAssignment(tasks.value, event.detail)
    }

    function handleSchedulerEdit(
        event: CustomEvent<EventSchedulerEventChangedDetail>
    ) {
        tasks.value = updateFromScheduler(tasks.value, event.detail)
    }

    return {
        activeView,
        applyActiveTasksPreset,
        calendarConfig,
        filterBadgeOptions,
        displayedGridPlugins,
        ganttAssignments,
        ganttColumns,
        ganttConfig,
        ganttDependencies,
        ganttPlugins,
        ganttResources,
        planningDataGridContextMenu: dataGridContextMenu,
        planningDataGridFormatting,
        gridColumnTypes,
        gridColumns,
        gridFilterConfig,
        gridKey,
        gridPlugins,
        gridRef,
        handleGanttAssignmentEdit,
        handleGanttEdit,
        handleGridEdit,
        handleKanbanCreate,
        handleKanbanDelete,
        handleKanbanMove,
        handleKanbanUpdate,
        handleRowSelected,
        handleSchedulerEdit,
        kanbanConfig,
        kanbanPlugins,
        planningFilterConfig,
        quickFilter,
        quickSearch,
        resetWorkspace,
        rootRef,
        rowSelect,
        schedulerConfig,
        schedulerEvents,
        schedulerPlugins,
        schedulerResources,
        selectedCount,
        showHint,
        showInlineFilters,
        syncVisibleTasks,
        tasks,
        theme,
        toggleFullscreen,
        toggleColumnFilters,
        visibleTasks,
        views,
    }
}
