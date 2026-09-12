import { defineCustomElements } from '@revolist/revogrid/loader'
import { GanttPlugin } from '@revolist/gantt'
import { KanbanPlugin } from '@revolist/kanban'
import { EventSchedulerPlugin } from '@revolist/scheduler'
import {
    AdvanceFilterPlugin,
    ColumnHidePlugin,
    ColumnStretchPlugin,
    DataGridFormattingPlugin,
    RowSelectPlugin,
    RowOrderPlugin,
} from '@revolist/revogrid-pro'
import {
    currentTheme,
    observeCurrentTheme,
} from '../../composables/useRandomData'
import {
    activePlanningFilters,
    calendarConfig,
    clearPlanningRowSelection,
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
    planningRowResize,
    schedulerConfig,
    schedulerResources,
    toGanttAssignments,
    toSchedulerEvents,
    PlanningWorkspaceStore,
    views,
    type PlanningEditDetail,
    type PlanningGridEditDetail,
    type PlanningTask,
    type PlanningFilters,
    type PlanningView,
} from './data'
import './planning.scss'

defineCustomElements()

type PlanningGridElement = HTMLRevoGridElement & {
    filter?: typeof planningFilterConfig
    gantt?: typeof ganttConfig
    ganttResources?: typeof ganttResources
    ganttAssignments?: ReturnType<typeof toGanttAssignments>
    ganttDependencies?: typeof ganttDependencies
    eventScheduler?: typeof schedulerConfig
    eventSchedulerResources?: typeof schedulerResources
    eventSchedulerEvents?: ReturnType<typeof toSchedulerEvents>
}

export function load(parentSelector: string): (() => void) | undefined {
    const parent = document.querySelector(parentSelector)
    if (!parent) return

    const planningStore = new PlanningWorkspaceStore(createTasks())
    let activeView: PlanningView = 'grid'
    let filters: PlanningFilters = defaultPlanningFilters()
    let selectedCount = 0
    const root = document.createElement('section')
    const switcher = document.createElement('nav')
    const panel = document.createElement('article')
    const toolbar = document.createElement('div')
    const search = document.createElement('input')
    const project = document.createElement('select')
    const status = document.createElement('select')
    const priority = document.createElement('select')
    const count = document.createElement('span')
    const activeTasks = document.createElement('button')
    const reset = document.createElement('button')
    const footer = document.createElement('footer')
    const footerMessage = document.createElement('span')

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
    reset.type = 'button'
    reset.textContent = 'Reset'
    count.className = 'planning-demo__count'
    footer.className = 'planning-demo__footer'
    footerMessage.textContent = 'Changes stay in this demo'
    const footerMeta = document.createElement('span')
    footerMeta.className = 'planning-demo__footer-meta'
    footerMeta.append(footerMessage)
    footer.append(footerMeta)
    toolbar.append(search, project, status, priority, activeTasks, reset, count)
    root.append(switcher, toolbar, panel, footer)
    parent.appendChild(root)

    function render(view: PlanningView) {
        activeView = view
        panel.classList.toggle(
            'planning-demo__grid--timeline',
            view === 'gantt' || view === 'scheduler' || view === 'calendar'
        )
        const visibleTasks = filterPlanningTasks(
            planningStore.createSnapshot(),
            filters
        )
        const visibleGanttDependencies = filterGanttDependencies(
            ganttDependencies,
            visibleTasks
        )
        count.textContent = `${visibleTasks.length} of ${planningStore.size} tasks${selectedCount ? ` · ${selectedCount} selected` : ''}`
        const grid = document.createElement('revo-grid') as PlanningGridElement
        grid.hideAttribution = true
        grid.theme = currentTheme().isDark() ? 'darkCompact' : 'compact'

        if (view === 'grid') {
            grid.plugins = [
                RowOrderPlugin,
                RowSelectPlugin,
                AdvanceFilterPlugin,
                DataGridFormattingPlugin,
                ColumnStretchPlugin,
                ColumnHidePlugin,
            ]
            grid.columnTypes = gridColumnTypes
            grid.columns = gridColumns
            grid.dataGridContextMenu = createPlanningDataGridContextMenu(
                (taskIds) => {
                    planningStore.delete(taskIds)
                    selectedCount = 0
                    void clearPlanningRowSelection(grid).then(() =>
                        render(activeView)
                    )
                }
            )
            grid.dataGridFormatting = planningDataGridFormatting
            grid.stretch = 1
            grid.filter = planningFilterConfig
            grid.range = true
            grid.resize = true
            grid.canMoveColumns = true
            grid.rowSize = 40
            grid.resizeRow = planningRowResize
            grid.rowOrder = planningRowOrder
            grid.rowSelect = { rowOrder: true }
            grid.addEventListener('afteredit', (event) => {
                const detail = event.detail as PlanningGridEditDetail
                const hasTaskId = detail.model?.id !== undefined
                if (hasTaskId) planningStore.commitGridEdit(detail)
                void grid.getVisibleSource().then((visible: PlanningTask[]) => {
                    if (!hasTaskId) {
                        planningStore.commitGridEditFromVisibleSource(
                            detail,
                            visible
                        )
                    }
                })
            })
            grid.addEventListener('roworderapplied', () => {
                void grid
                    .getVisibleSource()
                    .then((visible: PlanningTask[]) =>
                        planningStore.commitVisibleOrder(visible)
                    )
            })
            grid.addEventListener('rowselected', (event) => {
                selectedCount = (
                    event as CustomEvent<
                        HTMLRevoGridElementEventMap['rowselected']
                    >
                ).detail.count
                count.textContent = `${visibleTasks.length} of ${planningStore.size} tasks${selectedCount ? ` · ${selectedCount} selected` : ''}`
            })
        } else if (view === 'kanban') {
            grid.plugins = [KanbanPlugin]
            grid.columns = gridColumns
            grid.kanban = createKanbanConfig()
        } else if (view === 'gantt') {
            grid.plugins = [GanttPlugin]
            grid.columns = ganttColumns
            grid.resizeRow = planningRowResize
            grid.gantt = ganttConfig
            grid.ganttDependencies = visibleGanttDependencies
            grid.ganttResources = ganttResources
            grid.ganttAssignments = toGanttAssignments(visibleTasks)
        } else {
            grid.plugins = [EventSchedulerPlugin]
            grid.columns = []
            grid.resize = true
            grid.canMoveColumns = false
            grid.eventScheduler =
                view === 'calendar' ? calendarConfig : schedulerConfig
            grid.eventSchedulerResources = schedulerResources
            grid.eventSchedulerEvents = toSchedulerEvents(visibleTasks)
        }

        if (view !== 'grid') {
            grid.addEventListener('gridedit', (event) => {
                planningStore.commitPlanningEdit(
                    event.detail as PlanningEditDetail
                )
            })
        }

        panel.replaceChildren(grid)
        grid.source =
            view === 'scheduler' || view === 'calendar' ? [] : visibleTasks
        switcher.querySelectorAll('button').forEach((button) => {
            const selected = button.dataset.view === activeView
            button.classList.toggle('on', selected)
            button.ariaSelected = String(selected)
        })
    }

    search.addEventListener('input', () => {
        filters = { ...filters, query: search.value }
        render(activeView)
    })
    project.addEventListener('change', () => {
        filters = {
            ...filters,
            projectId: project.value as PlanningFilters['projectId'],
        }
        render(activeView)
    })
    status.addEventListener('change', () => {
        filters = { ...filters, statuses: status.value ? [status.value] : [] }
        render(activeView)
    })
    priority.addEventListener('change', () => {
        filters = {
            ...filters,
            priorities: priority.value ? [Number(priority.value)] : [],
        }
        render(activeView)
    })
    activeTasks.addEventListener('click', () => {
        filters = activePlanningFilters()
        status.value = ''
        render(activeView)
    })
    reset.addEventListener('click', () => {
        planningStore.replace(createTasks())
        filters = defaultPlanningFilters()
        selectedCount = 0
        search.value = ''
        project.value = 'all'
        status.value = ''
        priority.value = ''
        render(activeView)
    })
    for (const view of views) {
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'rv-segmented-switch-item'
        button.setAttribute('role', 'tab')
        button.dataset.view = view
        button.textContent = view
        button.addEventListener('click', () => render(view))
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
        root.remove()
    }
}
