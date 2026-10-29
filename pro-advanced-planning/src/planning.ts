import searchIcon from '@fortawesome/fontawesome-free/svgs/solid/magnifying-glass.svg?raw'
import { controlAttributes, createControl, createSearchInput } from '@revolist/ui';
import '@revolist/ui/styles.css';
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
    const { root: searchRoot, input: search } = createSearchInput(document, {
        rootClassName: 'planning-demo__search', iconSvg: searchIcon,
    })
    const project = createControl(document, 'select')
    const status = createControl(document, 'select')
    const priority = createControl(document, 'select')
    const activeTasks = createControl(document, 'button')
    const reset = createControl(document, 'button')
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
    toolbar.setAttribute('role', 'group')
    toolbar.ariaLabel = 'Task filters'
    const filterGroup = document.createElement('div')
    filterGroup.className = 'planning-demo__filters'
    for (const select of [project, status, priority]) select.classList.add('rv-control--compact')
    filterGroup.append(project, status, priority)
    search.type = 'search'
    search.placeholder = 'Search tasks…'
    search.ariaLabel = 'Search tasks'
    project.ariaLabel = 'Project'
    project.innerHTML = `<option value="all">Project: All</option>${planningProjects.map((item) => `<option value="${item.id}">${item.label}</option>`).join('')}`
    status.ariaLabel = 'Status'
    status.innerHTML = '<option value="">Status: All</option><option value="active" disabled>Status: Active</option><option value="not-started">Planned</option><option value="in-progress">In progress</option><option value="blocked">Blocked</option><option value="done">Done</option>'
    priority.ariaLabel = 'Priority'
    priority.innerHTML = '<option value="">Priority: All</option><option value="500">Normal</option><option value="700">High</option><option value="900">Critical</option>'
    activeTasks.type = 'button'
    activeTasks.textContent = 'Active tasks'
    const setActiveTasksPreset = (active: boolean) => {
        isActiveTasksPreset = active
        activeTasks.classList.toggle('on', isActiveTasksPreset)
        activeTasks.classList.add('rv-choice-chip'); activeTasks.ariaPressed = String(isActiveTasksPreset)
    }
    setActiveTasksPreset(false)
    reset.type = 'button'
    reset.textContent = 'Reset'
    reset.classList.add('rv-btn-ghost', 'planning-demo__reset')
    activeTasks.classList.add('planning-demo__active')
    footer.className = 'planning-demo__footer'
    footerMessage.textContent = 'Changes stay in this demo'
    const footerMeta = document.createElement('span')
    footerMeta.className = 'planning-demo__footer-meta'
    footerMeta.append(footerMessage)
    footer.append(footerMeta)
    toolbar.append(searchRoot, filterGroup, activeTasks, reset)
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
        status.hidden = priority.hidden = view !== 'kanban'
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
            button.classList.add('rv-segmented-switch-item'); button.ariaSelected = String(selected);
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
        filters = { ...filters, priorities: priority.value ? [Number(priority.value)] : [] }
        syncActiveGrid()
    })
    activeTasks.addEventListener('click', () => {
        setActiveTasksPreset(!isActiveTasksPreset)
        filters = isActiveTasksPreset ? activePlanningFilters() : defaultPlanningFilters()
        search.value = filters.query
        project.value = filters.projectId
        status.value = isActiveTasksPreset ? 'active' : ''
        priority.value = ''
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
        const button = createControl(document, 'button', { type: 'button' })
        button.type = 'button'
        button.className = controlAttributes('button', { class: 'rv-segmented-switch-item' }).class
        button.setAttribute('role', 'tab')
        button.dataset.view = view
        button.textContent = view
        button.addEventListener('click', () => {
            if (view !== activeView) render(view)
        })
        switcher.appendChild(button)
    }

    const disconnectTheme = observeCurrentTheme((isDark) => {
        root.dataset.theme = isDark ? 'dark' : 'light'
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
