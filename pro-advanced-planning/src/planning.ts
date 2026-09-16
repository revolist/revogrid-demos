import { defineCustomElements } from '@revolist/revogrid/loader'
import type { ColumnFilterConfig } from '@revolist/revogrid'
import { GanttPlugin } from '@revolist/gantt'
import { KanbanPlugin } from '@revolist/kanban'
import { EventSchedulerPlugin } from '@revolist/scheduler'
import {
    AdvanceFilterPlugin,
    ColumnHidePlugin,
    ColumnStretchPlugin,
    DataGridFormattingPlugin,
    EventManagerPlugin,
    FilterHeaderPlugin,
    RowSelectPlugin,
    RowOrderPlugin,
    RangeSelectionLimitPlugin,
} from '@revolist/revogrid-pro'
import {
    currentTheme,
    observeCurrentTheme,
} from '../../composables/useRandomData'
import {
    activePlanningFilters,
    calendarConfig,
    createPlanningDataGridContextMenu,
    createTasks,
    filterGanttDependencies,
    defaultPlanningFilters,
    filterPlanningTasks,
    ganttColumns,
    ganttConfig,
    ganttDependencies,
    ganttResources,
    gridColumnTypes,
    gridColumns,
    createKanbanConfig,
    planningProjects,
    planningFilterConfig,
    planningDataGridFormatting,
    planningRowOrder,
    getPlanningVisibleSource,
    schedulerConfig,
    schedulerResources,
    toGanttAssignments,
    PlanningWorkspaceStore,
    PlanningWorkspacePlugin,
    views,
    type PlanningEditDetail,
    type PlanningFilters,
    type PlanningView,
    updateFromGanttDependencies,
} from './data'
import './planning.scss'

defineCustomElements()

type PlanningGridElement = HTMLRevoGridElement & {
    filter?: typeof planningFilterConfig
    filterBadges?: object
    gantt?: typeof ganttConfig
    ganttResources?: typeof ganttResources
    ganttAssignments?: ReturnType<typeof toGanttAssignments>
    ganttDependencies?: typeof ganttDependencies
    eventScheduler?: typeof schedulerConfig
    eventSchedulerResources?: typeof schedulerResources
    rangeSelectionLimit?: 'column'
}

export function load(parentSelector: string): (() => void) | undefined {
    const parent = document.querySelector(parentSelector)
    if (!parent) return

    const planningStore = new PlanningWorkspaceStore(createTasks())
    let activeView: PlanningView = 'grid'
    let filters: PlanningFilters = defaultPlanningFilters()
    let currentGanttDependencies = [...ganttDependencies]
    let isActiveTasksPreset = false
    const filterConfigs: Record<'grid' | 'kanban' | 'gantt', ColumnFilterConfig> = {
        grid: {
            ...planningFilterConfig,
            multiFilterItems: { ...planningFilterConfig.multiFilterItems },
        },
        kanban: {
            ...planningFilterConfig,
            multiFilterItems: { ...planningFilterConfig.multiFilterItems },
        },
        gantt: {
            ...planningFilterConfig,
            multiFilterItems: { ...planningFilterConfig.multiFilterItems },
        },
    }
    const filterBadgeOptions = {
        className: 'planning-demo__filter-badges',
        badgeClassName: 'planning-demo__filter-badge',
        emptyClassName: 'planning-demo__filter-badges--empty',
        renderEmpty: () => '',
    }
    const root = document.createElement('section')
    const switcher = document.createElement('nav')
    const panel = document.createElement('article')
    const toolbar = document.createElement('div')
    const search = document.createElement('input')
    const project = document.createElement('select')
    const status = document.createElement('select')
    const priority = document.createElement('select')
    const activeTasks = document.createElement('button')
    const reset = document.createElement('button')
    const footer = document.createElement('footer')
    const footerMessage = document.createElement('span')
    let activeGridAbort: AbortController | undefined
    let activeGrid: PlanningGridElement | undefined

    root.className = 'planning-demo'
    switcher.className = 'planning-demo__switch rv-segmented-switch'
    switcher.setAttribute('role', 'tablist')
    switcher.ariaLabel = 'Planning view'
    panel.className = 'planning-demo__grid'
    toolbar.className = 'planning-demo__toolbar'
    search.type = 'search'
    search.placeholder = 'Search tasks…'
    search.ariaLabel = 'Search tasks'
    project.ariaLabel = 'Project'
    project.innerHTML = `<option value="all">All projects</option>${planningProjects.map((item) => `<option value="${item.id}">${item.label}</option>`).join('')}`
    status.ariaLabel = 'Status'
    status.innerHTML =
        '<option value="">All statuses</option><option value="not-started">Planned</option><option value="in-progress">In progress</option><option value="blocked">Blocked</option><option value="done">Done</option>'
    priority.ariaLabel = 'Priority'
    priority.innerHTML =
        '<option value="">All priorities</option><option value="500">Normal</option><option value="700">High</option><option value="900">Critical</option>'
    activeTasks.type = 'button'
    activeTasks.textContent = 'Active tasks'
    const setActiveTasksPreset = (active: boolean) => {
        isActiveTasksPreset = active
        activeTasks.classList.toggle('on', isActiveTasksPreset)
        activeTasks.ariaPressed = String(isActiveTasksPreset)
    }
    setActiveTasksPreset(false)
    reset.type = 'button'
    reset.textContent = 'Reset'
    footer.className = 'planning-demo__footer'
    footerMessage.textContent = 'Changes stay in this demo'
    const footerMeta = document.createElement('span')
    footerMeta.className = 'planning-demo__footer-meta'
    footerMeta.append(footerMessage)
    footer.append(footerMeta)
    toolbar.append(search, project, status, priority, activeTasks, reset)
    root.append(switcher, toolbar, panel, footer)
    parent.appendChild(root)

    function syncActiveGrid() {
        if (!activeGrid) return

        const allTasks = filterPlanningTasks(
            planningStore.createSnapshot(),
            filters
        )
        activeGrid.source = allTasks

        if (activeView === 'gantt') {
            activeGrid.ganttAssignments = toGanttAssignments(allTasks)
            activeGrid.ganttDependencies = filterGanttDependencies(
                currentGanttDependencies,
                allTasks
            )
        }
    }

    function render(view: PlanningView) {
        activeGridAbort?.abort()
        activeGridAbort = new AbortController()
        activeView = view
        panel.classList.toggle(
            'planning-demo__grid--timeline',
            view === 'gantt' || view === 'scheduler' || view === 'calendar'
        )
        const allTasks = filterPlanningTasks(
            planningStore.createSnapshot(),
            filters
        )
        const visibleGanttDependencies = filterGanttDependencies(
            currentGanttDependencies,
            allTasks
        )
        const grid = document.createElement('revo-grid') as PlanningGridElement
        grid.hideAttribution = true
        grid.theme = currentTheme().isDark() ? 'darkCompact' : 'compact'

        if (view === 'grid') {
            grid.plugins = [
                RowOrderPlugin,
                RowSelectPlugin,
                PlanningWorkspacePlugin,
                EventManagerPlugin,
                AdvanceFilterPlugin,
                DataGridFormattingPlugin,
                RangeSelectionLimitPlugin,
                ColumnStretchPlugin,
                ColumnHidePlugin,
            ]
            grid.columnTypes = gridColumnTypes
            grid.columns = gridColumns
            grid.dataGridContextMenu = createPlanningDataGridContextMenu(
                (taskIds) => {
                    planningStore.delete(taskIds)
                    syncActiveGrid()
                }
            )
            grid.dataGridFormatting = planningDataGridFormatting
            grid.stretch = 1
            grid.filter = filterConfigs.grid
            grid.filterBadges = filterBadgeOptions
            grid.range = true
            grid.rangeSelectionLimit = 'column'
            grid.resize = true
            grid.canMoveColumns = true
            grid.rowSize = 40
            grid.rowOrder = planningRowOrder
            grid.rowSelect = { rowOrder: true }
            grid.addEventListener('roworderapplied', (event) => {
                void getPlanningVisibleSource(event)
                    .then((visible) => {
                        planningStore.commitVisibleOrder(visible)
                        syncActiveGrid()
                    })
            }, { signal: activeGridAbort.signal })
        } else if (view === 'kanban') {
            grid.plugins = [KanbanPlugin, AdvanceFilterPlugin]
            grid.columns = gridColumns
            grid.kanban = createKanbanConfig()
            grid.filter = filterConfigs.kanban
            grid.filterBadges = filterBadgeOptions
        } else if (view === 'gantt') {
            grid.plugins = [GanttPlugin, AdvanceFilterPlugin, FilterHeaderPlugin]
            grid.columns = ganttColumns
            grid.rowOrder = false
            grid.gantt = ganttConfig
            grid.ganttDependencies = visibleGanttDependencies
            grid.ganttResources = ganttResources
            grid.ganttAssignments = toGanttAssignments(allTasks)
            grid.filter = filterConfigs.gantt
            grid.filterBadges = filterBadgeOptions
        } else {
            grid.plugins = [EventSchedulerPlugin]
            grid.columns = []
            grid.resize = true
            grid.canMoveColumns = false
            grid.eventScheduler =
                view === 'calendar' ? calendarConfig : schedulerConfig
            grid.eventSchedulerResources = schedulerResources
        }

        grid.addEventListener('gridedit', (event) => {
            currentGanttDependencies = updateFromGanttDependencies(
                currentGanttDependencies,
                (event as CustomEvent<PlanningEditDetail>).detail
            )
            planningStore.commitPlanningEdit(
                event.detail as PlanningEditDetail
            )
            syncActiveGrid()
        }, { signal: activeGridAbort.signal })

        if (view === 'grid' || view === 'kanban' || view === 'gantt') {
            grid.addEventListener('filterastchange', (event) => {
                const detail = (event as CustomEvent).detail
                if (detail.origin === 'ui') {
                    filterConfigs[view].filterAst = detail.filterAst
                }
            }, { signal: activeGridAbort.signal })
        }

        panel.replaceChildren(grid)
        activeGrid = grid
        grid.source = allTasks
        switcher.querySelectorAll('button').forEach((button) => {
            const selected = button.dataset.view === activeView
            button.classList.toggle('on', selected)
            button.ariaSelected = String(selected)
        })
    }

    search.addEventListener('input', () => {
        setActiveTasksPreset(false)
        filters = { ...filters, query: search.value }
        syncActiveGrid()
    })
    project.addEventListener('change', () => {
        setActiveTasksPreset(false)
        filters = {
            ...filters,
            projectId: project.value as PlanningFilters['projectId'],
        }
        syncActiveGrid()
    })
    status.addEventListener('change', () => {
        setActiveTasksPreset(false)
        filters = { ...filters, statuses: status.value ? [status.value] : [] }
        syncActiveGrid()
    })
    priority.addEventListener('change', () => {
        setActiveTasksPreset(false)
        filters = {
            ...filters,
            priorities: priority.value ? [Number(priority.value)] : [],
        }
        syncActiveGrid()
    })
    activeTasks.addEventListener('click', () => {
        setActiveTasksPreset(true)
        filters = activePlanningFilters()
        status.value = ''
        syncActiveGrid()
    })
    reset.addEventListener('click', () => {
        setActiveTasksPreset(false)
        planningStore.replace(createTasks())
        currentGanttDependencies = [...ganttDependencies]
        filters = defaultPlanningFilters()
        search.value = ''
        project.value = 'all'
        status.value = ''
        priority.value = ''
        syncActiveGrid()
    })
    for (const view of views) {
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'rv-segmented-switch-item'
        button.setAttribute('role', 'tab')
        button.dataset.view = view
        button.textContent = view
        button.addEventListener('click', () => {
            if (view !== activeView) render(view)
        })
        switcher.appendChild(button)
    }

    const disconnectTheme = observeCurrentTheme((isDark) => {
        const grid = panel.querySelector(
            'revo-grid'
        ) as PlanningGridElement | null
        if (grid) grid.theme = isDark ? 'darkCompact' : 'compact'
    })
    render(activeView)

    return () => {
        disconnectTheme()
        activeGridAbort?.abort()
        root.remove()
    }
}
