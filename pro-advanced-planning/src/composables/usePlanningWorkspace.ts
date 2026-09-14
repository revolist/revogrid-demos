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
    RangeSelectionLimitPlugin,
    type AdvancedFilterBadgesOptions,
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
    calendarConfig,
    activePlanningFilters,
    createPlanningDataGridContextMenu,
    createTasks,
    defaultPlanningFilters,
    filterPlanningTasks,
    filterGanttDependencies,
    ganttColumns,
    ganttConfig,
    ganttDependencies,
    ganttResources,
    planningDataGridFormatting,
    planningRowOrder,
    getPlanningVisibleSource,
    gridColumnTypes,
    gridColumns,
    createKanbanConfig,
    schedulerConfig,
    schedulerResources,
    toGanttAssignments,
    PlanningWorkspaceStore,
    PlanningWorkspacePlugin,
    createPlanningViewFilters,
    planningFilterConfigFor,
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
    RangeSelectionLimitPlugin,
    ColumnStretchPlugin,
    ColumnHidePlugin,
]
const ganttPlugins = [GanttPlugin, AdvanceFilterPlugin, FilterHeaderPlugin]
const kanbanPlugins = [KanbanPlugin, AdvanceFilterPlugin]
// Scheduler projects resource rows, so task-table filter rules do not apply
// there. It retains its own native eventScheduler.filters boundary.
const schedulerPlugins = [EventSchedulerPlugin]
const emptySource: never[] = []
export function usePlanningWorkspace() {
    const rootRef = ref<HTMLElement>()
    const activeView = ref<PlanningView>('grid')
    const planningStore = new PlanningWorkspaceStore(createTasks())
    const filters = ref(defaultPlanningFilters())
    const isActiveTasksPreset = ref(false)
    const tasks = ref(filterPlanningTasks(planningStore.createSnapshot(), filters.value))
    const gridKey = ref(0)
    const viewFilters = createPlanningViewFilters()
    const gridFilterConfig = planningFilterConfigFor(viewFilters, 'grid')
    const kanbanFilterConfig = planningFilterConfigFor(viewFilters, 'kanban')
    const ganttFilterConfig = planningFilterConfigFor(viewFilters, 'gantt')
    const kanbanConfig = computed(() => createKanbanConfig())
    const refreshViewSnapshot = () => {
        tasks.value = filterPlanningTasks(
            planningStore.createSnapshot(),
            filters.value
        )
    }
    const deleteSelectedTasks = (taskIds: readonly string[]) => {
        planningStore.delete(taskIds)
        refreshViewSnapshot()
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
    // Every view receives the canonical source. Its own AdvanceFilterPlugin
    // owns row visibility without transferring rules to another view.
    const ganttAssignments = computed(() =>
        toGanttAssignments(tasks.value)
    )
    const visibleGanttDependencies = computed(() =>
        filterGanttDependencies(ganttDependencies, tasks.value)
    )
    const disconnectTheme = observeCurrentTheme((value) => {
        isDark.value = value
    })

    onBeforeUnmount(() => {
        disconnectTheme()
    })

    async function toggleFullscreen() {
        if (!rootRef.value) return
        if (document.fullscreenElement) await document.exitFullscreen()
        else await rootRef.value.requestFullscreen()
    }

    function applyActiveTasksPreset() {
        filters.value = activePlanningFilters()
        isActiveTasksPreset.value = true
        refreshViewSnapshot()
    }

    function resetWorkspace() {
        planningStore.replace(createTasks())
        filters.value = defaultPlanningFilters()
        isActiveTasksPreset.value = false
        refreshViewSnapshot()
    }

    function selectPlanningView(view: PlanningView) {
        if (view === activeView.value) return
        refreshViewSnapshot()
        activeView.value = view
    }

    async function handleGridRowOrder(event: Event) {
        const visible = await getPlanningVisibleSource(event)
        planningStore.commitVisibleOrder(visible)
        refreshViewSnapshot()
    }

    function handlePlanningEdit(
        event: CustomEvent<PlanningEditDetail>
    ) {
        planningStore.commitPlanningEdit(event.detail)
        refreshViewSnapshot()
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
        gridColumnTypes,
        gridColumns,
        gridFilterConfig,
        isActiveTasksPreset,
        ganttFilterConfig,
        kanbanFilterConfig,
        viewFilters,
        gridKey,
        gridPlugins,
        handleGridRowOrder,
        handlePlanningEdit,
        kanbanConfig,
        kanbanPlugins,
        resetWorkspace,
        rootRef,
        rowSelect,
        schedulerConfig,
        schedulerPlugins,
        schedulerResources,
        selectPlanningView,
        tasks,
        theme,
        toggleFullscreen,
        visibleGanttDependencies,
        views,
    }
}
