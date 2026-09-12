import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
    AdvanceFilterPlugin,
    ColumnHidePlugin,
    ColumnStretchPlugin,
    DataGridFormattingPlugin,
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
    clearPlanningRowSelection,
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
    gridColumnTypes,
    gridColumns,
    createKanbanConfig,
    planningFilterConfig,
    schedulerConfig,
    schedulerResources,
    toGanttAssignments,
    toSchedulerEvents,
    PlanningWorkspaceStore,
    views,
    type PlanningEditDetail,
    type PlanningGridEditDetail,
    type PlanningTask,
    type PlanningView,
} from '../data'

const rowSelect: RowSelectConfig = { rowOrder: true }
const gridPlugins = [
    RowOrderPlugin,
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
const emptySource: never[] = []
export function usePlanningWorkspace() {
    const rootRef = ref<HTMLElement>()
    const gridRef = ref<any>()
    const filterBadgesRef = ref<HTMLElement>()
    const filterBadges = ref<HTMLElement>()
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
    const gridElement = () =>
        (gridRef.value?.$el ?? gridRef.value) as HTMLRevoGridElement | undefined
    const refreshViewSnapshot = () => {
        tasks.value = planningStore.createSnapshot()
    }
    const deleteSelectedTasks = (taskIds: readonly string[]) => {
        planningStore.delete(taskIds)
        refreshViewSnapshot()
        selectedCount.value = 0
        void clearPlanningRowSelection(gridElement())
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
        const ids = visibleTaskIds.value
        if (!ids) return tasks.value
        const byId = new Map(tasks.value.map((task) => [task.id, task]))
        return ids.flatMap((id) => {
            const task = byId.get(id)
            return task ? [task] : []
        })
    })
    const ganttAssignments = computed(() =>
        toGanttAssignments(visibleTasks.value)
    )
    const visibleGanttDependencies = computed(() =>
        filterGanttDependencies(ganttDependencies, visibleTasks.value)
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

    onMounted(() => {
        requestAnimationFrame(moveFilterBadges)
    })

    function moveFilterBadges() {
        const host = filterBadgesRef.value
        if (!host) return
        const nextBadges = gridElement()?.querySelector<HTMLElement>(
            '.planning-demo__filter-badges'
        )
        if (nextBadges) {
            filterBadges.value?.remove()
            filterBadges.value = nextBadges
        }
        const badges = filterBadges.value
        if (badges && badges.parentElement !== host) host.append(badges)
    }

    async function syncVisibleTasks() {
        const grid = gridElement()
        if (!grid) return
        visibleTaskIds.value = (await grid.getVisibleSource()).map(
            (task: PlanningTask) => task.id
        )
        moveFilterBadges()
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

    async function handleGridEdit(event: CustomEvent) {
        const detail = event.detail as PlanningGridEditDetail
        const hasTaskId = detail.model?.id !== undefined
        if (hasTaskId) planningStore.commitGridEdit(detail)
        const grid = gridElement()
        if (!grid) return
        const visible = (await grid.getVisibleSource()) as PlanningTask[]
        if (!hasTaskId) {
            planningStore.commitGridEditFromVisibleSource(detail, visible)
        }
        visibleTaskIds.value = visible.map((task) => task.id)
    }

    async function handleGridRowOrder(event: Event) {
        const grid = event.currentTarget as HTMLRevoGridElement
        const visible = (await grid.getVisibleSource()) as PlanningTask[]
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
        filterBadgesRef,
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
        gridRef,
        handleGridEdit,
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
        schedulerEvents,
        schedulerPlugins,
        schedulerResources,
        selectedCount,
        selectPlanningView,
        syncVisibleTasks,
        tasks,
        theme,
        toggleFullscreen,
        visibleTasks,
        visibleGanttDependencies,
        views,
    }
}
