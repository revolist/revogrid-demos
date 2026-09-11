import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
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
    deletePlanningTasks,
    filterGanttDependencies,
    filterPlanningTasks,
    ganttColumns,
    ganttConfig,
    ganttDependencies,
    ganttResources,
    planningDataGridFormatting,
    gridColumnTypes,
    gridColumns,
    createKanbanConfig,
    planningFilterConfig,
    schedulerConfig,
    schedulerResources,
    toGanttAssignments,
    toSchedulerEvents,
    updateFromGrid,
    updateFromGridSource,
    updateFromPlanningEdit,
    views,
    type PlanningTask,
    type PlanningView,
} from '../data'
import { revealPlanningKanbanCard } from '../planning.kanban'

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
    const kanbanRef = ref<any>()
    const filterBadgesRef = ref<HTMLElement>()
    const filterBadges = ref<HTMLElement>()
    const activeView = ref<PlanningView>('grid')
    const updatedTaskId = ref<string>()
    const tasks = ref(createTasks())
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
    const kanbanConfig = computed(() => createKanbanConfig(updatedTaskId.value))
    const gridElement = () =>
        (gridRef.value?.$el ?? gridRef.value) as HTMLRevoGridElement | undefined
    const deleteSelectedTasks = (taskIds: readonly string[]) => {
        tasks.value = deletePlanningTasks(tasks.value, taskIds)
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
        gridFilterConfig.value = activePlanningFilterConfig
        visibleTaskIds.value = filterPlanningTasks(
            tasks.value,
            activePlanningFilters()
        ).map(({ id }) => id)
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

    async function selectPlanningView(view: PlanningView) {
        activeView.value = view
        if (view === 'kanban' && updatedTaskId.value) {
            await nextTick()
            await revealPlanningKanbanCard(
                kanbanRef.value?.$el ?? kanbanRef.value,
                updatedTaskId.value
            )
        }
    }

    async function handleGridEdit(event: CustomEvent) {
        const previous = tasks.value
        const next = updateFromGrid(previous, event.detail)
        tasks.value = next
        const grid = gridElement()
        if (!grid) return
        const visible = (await grid.getVisibleSource()) as PlanningTask[]
        const resolved = updateFromGridSource(tasks.value, event.detail, visible)
        tasks.value = resolved
        visibleTaskIds.value = visible.map((task) => task.id)
    }

    function handleRowSelected(event: CustomEvent<{ count: number }>) {
        selectedCount.value = event.detail.count
    }

    function handlePlanningEdit(
        event: CustomEvent<Parameters<typeof updateFromPlanningEdit>[1]>
    ) {
        tasks.value = updateFromPlanningEdit(tasks.value, event.detail)
    }

    return {
        activeView,
        applyActiveTasksPreset,
        calendarConfig,
        filterBadgeOptions,
        filterBadgesRef,
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
        gridKey,
        gridPlugins,
        gridRef,
        handleGridEdit,
        handlePlanningEdit,
        handleRowSelected,
        kanbanConfig,
        kanbanRef,
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
