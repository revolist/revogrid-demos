import { computed, onBeforeUnmount, ref } from 'vue'
import {
    AdvanceFilterPlugin,
    ColumnHidePlugin,
    ColumnStretchPlugin,
    DataGridFormattingPlugin,
    EventManagerPlugin,
    FilterHeaderPlugin,
    RowOrderPlugin,
    RowSelectPlugin,
    type AdvancedFilterBadgesOptions,
    type ColumnFilterConfig,
    type RowSelectConfig,
} from '@revolist/revogrid-pro'
import { GanttPlugin } from '@revolist/gantt'
import { KanbanPlugin } from '@revolist/kanban'
import { EventSchedulerPlugin } from '@revolist/scheduler'
import {
    currentTheme,
    observeCurrentTheme,
} from '../../../composables/useRandomData'
import {
    activePlanningFilterConfig,
    activePlanningFilters,
    calendarConfig,
    createPlanningDataGridContextMenu,
    createTasks,
    filterGanttDependencies,
    filterPlanningTasks,
    ganttColumns,
    ganttConfig,
    ganttDependencies,
    ganttResources,
    planningDataGridFormatting,
    planningRowOrder,
    planningRowResize,
    getPlanningVisibleSource,
    gridColumnTypes,
    gridColumns,
    createKanbanConfig,
    planningFilterConfig,
    schedulerConfig,
    schedulerResources,
    toGanttAssignments,
    PlanningWorkspaceStore,
    PlanningWorkspacePlugin,
    views,
    type PlanningEditDetail,
    type PlanningView,
} from '../data'

const rowSelect: RowSelectConfig = { rowOrder: true }
const gridPlugins = [
    RowOrderPlugin,
    RowSelectPlugin,
    PlanningWorkspacePlugin,
    EventManagerPlugin,
    AdvanceFilterPlugin,
    FilterHeaderPlugin,
    DataGridFormattingPlugin,
    ColumnStretchPlugin,
    ColumnHidePlugin,
]
const ganttPlugins = [GanttPlugin]
const kanbanPlugins = [KanbanPlugin]
const schedulerPlugins = [EventSchedulerPlugin]
const emptySource: never[] = []
export function usePlanningWorkspace() {
    const rootRef = ref<HTMLElement>()
    const activeView = ref<PlanningView>('grid')
    const planningStore = new PlanningWorkspaceStore(createTasks())
    const tasks = ref(planningStore.createSnapshot())
    const quickSearch = ref('')
    const visibleTaskIds = ref<string[] | undefined>()
    const selectedCount = ref(0)
    const gridKey = ref(0)
    const gridFilterConfig = ref<ColumnFilterConfig>(planningFilterConfig)
    const quickFilter = computed(() => ({
        text: quickSearch.value,
        columns: ['name', 'owner'],
        debounceMs: 150,
    }))
    const kanbanConfig = computed(() => createKanbanConfig())
    const refreshViewSnapshot = () => {
        tasks.value = planningStore.createSnapshot()
    }
    const deleteSelectedTasks = (taskIds: readonly string[]) => {
        planningStore.delete(taskIds)
        refreshViewSnapshot()
        selectedCount.value = 0
    }
    const dataGridContextMenu =
        createPlanningDataGridContextMenu(deleteSelectedTasks)
    const filterBadgeOptions = {
        className: 'planning-demo__filter-badges',
        badgeClassName: 'planning-demo__filter-badge',
        emptyClassName: 'planning-demo__filter-badges--empty',
        renderEmpty: () => '',
    } satisfies AdvancedFilterBadgesOptions
    const isDark = ref(currentTheme().isDark())
    const theme = computed(() => (isDark.value ? 'darkCompact' : 'compact'))
    const visibleTasks = computed(() => {
        if (activeView.value === 'grid') return tasks.value
        const ids = visibleTaskIds.value
        if (!ids) return tasks.value
        const byId = new Map(tasks.value.map((task) => [task.id, task]))
        return ids.flatMap((id) => {
            const task = byId.get(id)
            return task ? [task] : []
        })
    })
    const visibleTaskCount = computed(
        () => visibleTaskIds.value?.length ?? tasks.value.length
    )
    const ganttAssignments = computed(() =>
        toGanttAssignments(visibleTasks.value)
    )
    const visibleGanttDependencies = computed(() =>
        filterGanttDependencies(ganttDependencies, visibleTasks.value)
    )
    const disconnectTheme = observeCurrentTheme((value) => {
        isDark.value = value
    })

    onBeforeUnmount(() => {
        disconnectTheme()
    })

    async function syncVisibleTasks(event: Event) {
        if (activeView.value !== 'grid') return
        visibleTaskIds.value = (await getPlanningVisibleSource(event)).map(
            ({ id }) => id
        )
    }

    async function toggleFullscreen() {
        if (!rootRef.value) return
        if (document.fullscreenElement) await document.exitFullscreen()
        else await rootRef.value.requestFullscreen()
    }

    function applyActiveTasksPreset() {
        refreshViewSnapshot()
        gridFilterConfig.value = activePlanningFilterConfig
        visibleTaskIds.value = filterPlanningTasks(
            tasks.value,
            activePlanningFilters()
        ).map(({ id }) => id)
        gridKey.value += 1
    }

    function resetWorkspace() {
        planningStore.replace(createTasks())
        refreshViewSnapshot()
        quickSearch.value = ''
        visibleTaskIds.value = undefined
        selectedCount.value = 0
        gridFilterConfig.value = planningFilterConfig
        gridKey.value += 1
    }

    function selectPlanningView(view: PlanningView) {
        if (view === activeView.value) return
        refreshViewSnapshot()
        activeView.value = view
    }

    async function handleGridRowOrder(event: Event) {
        const visible = await getPlanningVisibleSource(event)
        planningStore.commitVisibleOrder(visible)
        visibleTaskIds.value = visible.map((task) => task.id)
    }

    function handleRowSelected(event: CustomEvent<{ count: number }>) {
        selectedCount.value = event.detail.count
    }

    function handlePlanningEdit(
        event: CustomEvent<PlanningEditDetail>
    ) {
        planningStore.commitPlanningEdit(event.detail)
    }

    return {
        activeView,
        applyActiveTasksPreset,
        calendarConfig,
        emptySource,
        filterBadgeOptions,
        ganttAssignments,
        ganttColumns,
        ganttConfig,
        ganttPlugins,
        ganttResources,
        planningDataGridContextMenu: dataGridContextMenu,
        planningDataGridFormatting,
        planningRowResize,
        gridColumnTypes,
        gridColumns,
        gridFilterConfig,
        gridKey,
        gridPlugins,
        handleGridRowOrder,
        handlePlanningEdit,
        handleRowSelected,
        kanbanConfig,
        kanbanPlugins,
        planningFilterConfig,
        quickFilter,
        quickSearch,
        resetWorkspace,
        rootRef,
        rowSelect,
        schedulerConfig,
        schedulerPlugins,
        schedulerResources,
        selectedCount,
        selectPlanningView,
        syncVisibleTasks,
        tasks,
        theme,
        toggleFullscreen,
        visibleTasks,
        visibleTaskCount,
        visibleGanttDependencies,
        views,
    }
}
