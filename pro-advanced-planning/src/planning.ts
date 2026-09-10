import { defineCustomElements } from '@revolist/revogrid/loader'
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
    AdvanceFilterPlugin,
    ColumnHidePlugin,
    ColumnStretchPlugin,
    DataGridFormattingPlugin,
    RowSelectPlugin,
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
    deletePlanningTasks,
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
    schedulerConfig,
    schedulerResources,
    toGanttAssignments,
    toGanttTasks,
    toSchedulerEvents,
    updateFromGantt,
    updateFromGanttAssignment,
    updateFromGrid,
    updateFromGridSource,
    updateFromKanban,
    updateFromKanbanDelete,
    updateFromKanbanUpdate,
    updateFromScheduler,
    views,
    type PlanningTask,
    type PlanningFilters,
    type PlanningView,
} from './data'
import './planning.scss'
import {
    changedPlanningTaskName,
    planningTipCompletionCopy,
    planningTipCopy,
    readPlanningTip,
    updatePlanningTip,
    type PlanningTipStep,
} from './planning.tips'
import { revealPlanningKanbanCard } from './planning.kanban'

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

    let tasks = createTasks()
    let activeView: PlanningView = 'grid'
    let filters: PlanningFilters = defaultPlanningFilters()
    let selectedCount = 0
    let tipStep: PlanningTipStep = readPlanningTip()
    let updatedTaskId: string | undefined
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
    const showTips = document.createElement('button')
    const tip = document.createElement('aside')
    const tipText = document.createElement('span')
    const dismissTips = document.createElement('button')
    const completion = document.createElement('p')

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
    showTips.type = 'button'
    showTips.textContent = 'Show tips'
    tip.className = 'planning-demo__tip'
    tipText.setAttribute('role', 'status')
    tipText.setAttribute('aria-live', 'polite')
    dismissTips.type = 'button'
    dismissTips.ariaLabel = 'Dismiss tips'
    dismissTips.textContent = '×'
    tip.append(tipText, dismissTips)
    completion.className = 'planning-demo__completion'
    completion.setAttribute('role', 'status')
    const footerMeta = document.createElement('span')
    footerMeta.className = 'planning-demo__footer-meta'
    footerMeta.append(footerMessage, showTips)
    footer.append(footerMeta)
    toolbar.append(search, project, status, priority, activeTasks, reset, count)
    root.append(switcher, tip, completion, toolbar, panel, footer)
    parent.appendChild(root)

    function renderTip() {
        const visible = activeView === 'grid' && tipStep !== 'done'
        tip.hidden = !visible
        completion.hidden = activeView !== 'kanban' || !updatedTaskId
        completion.textContent = planningTipCompletionCopy
        if (activeView !== 'grid' || tipStep === 'done') return
        tip.className = `planning-demo__tip planning-demo__tip--${tipStep}`
        tipText.textContent = planningTipCopy[tipStep]
    }

    function render(view: PlanningView) {
        if (view === 'kanban') {
            tipStep = updatePlanningTip(tipStep, 'kanban-opened')
        }
        activeView = view
        renderTip()
        panel.classList.toggle(
            'planning-demo__grid--timeline',
            view === 'gantt' || view === 'scheduler' || view === 'calendar'
        )
        const visibleTasks = filterPlanningTasks(tasks, filters)
        const visibleIds = new Set(visibleTasks.map(({ id }) => id))
        const visibleGanttDependencies = filterGanttDependencies(
            ganttDependencies,
            visibleTasks
        )
        count.textContent = `${visibleTasks.length} of ${tasks.length} tasks${selectedCount ? ` · ${selectedCount} selected` : ''}`
        const grid = document.createElement('revo-grid') as PlanningGridElement
        grid.hideAttribution = true
        grid.theme = currentTheme().isDark() ? 'darkCompact' : 'compact'

        if (view === 'grid') {
            grid.plugins = [
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
                    tasks = deletePlanningTasks(tasks, taskIds)
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
            grid.rowSelect = { rowOrder: false }
            grid.addEventListener('afteredit', (event) => {
                const detail = event.detail as Parameters<
                    typeof updateFromGrid
                >[1]
                const previous = tasks
                const next = updateFromGrid(previous, detail)
                const taskId = changedPlanningTaskName(previous, next)
                tasks = next
                if (taskId) {
                    updatedTaskId = taskId
                    tipStep = updatePlanningTip(tipStep, 'edit-committed')
                    renderTip()
                }
                void grid.getVisibleSource().then((visible: PlanningTask[]) => {
                    const resolved = updateFromGridSource(tasks, detail, visible)
                    const resolvedTaskId = changedPlanningTaskName(tasks, resolved)
                    tasks = resolved
                    if (resolvedTaskId) {
                        updatedTaskId = resolvedTaskId
                        tipStep = updatePlanningTip(tipStep, 'edit-committed')
                        renderTip()
                    }
                })
            })
            grid.addEventListener('rowselected', (event) => {
                selectedCount = (
                    event as CustomEvent<
                        HTMLRevoGridElementEventMap['rowselected']
                    >
                ).detail.count
                count.textContent = `${visibleTasks.length} of ${tasks.length} tasks${selectedCount ? ` · ${selectedCount} selected` : ''}`
            })
        } else if (view === 'kanban') {
            grid.plugins = [KanbanPlugin]
            grid.columns = gridColumns
            grid.kanban = createKanbanConfig(updatedTaskId)
            grid.addEventListener('kanbancardmove', (event) => {
                tasks = updateFromKanban(
                    tasks,
                    (
                        event as unknown as CustomEvent<
                            KanbanCardMoveDetail<PlanningTask>
                        >
                    ).detail
                )
            })
            grid.addEventListener('kanbancardcreate', (event) => {
                tasks = [
                    ...tasks,
                    (
                        event as unknown as CustomEvent<
                            KanbanCardCreateDetail<PlanningTask>
                        >
                    ).detail.card,
                ]
            })
            grid.addEventListener('kanbancardupdate', (event) => {
                tasks = updateFromKanbanUpdate(
                    tasks,
                    (
                        event as unknown as CustomEvent<
                            KanbanCardUpdateDetail<PlanningTask>
                        >
                    ).detail
                )
            })
            grid.addEventListener('kanbancarddelete', (event) => {
                tasks = updateFromKanbanDelete(
                    tasks,
                    (
                        event as unknown as CustomEvent<
                            KanbanCardDeleteDetail<PlanningTask>
                        >
                    ).detail
                )
            })
        } else if (view === 'gantt') {
            grid.plugins = [GanttPlugin]
            grid.columns = ganttColumns
            grid.gantt = ganttConfig
            grid.ganttDependencies = visibleGanttDependencies
            grid.ganttResources = ganttResources
            grid.ganttAssignments = toGanttAssignments(tasks).filter(
                ({ taskId }) => visibleIds.has(String(taskId))
            )
            grid.addEventListener('gantt-before-task-change', (event) => {
                event.preventDefault()
                tasks = updateFromGantt(
                    tasks,
                    (event as CustomEvent<GanttBeforeTaskChangeDetail>).detail
                )
            })
            grid.addEventListener('gantt-before-assignment-change', (event) => {
                tasks = updateFromGanttAssignment(
                    tasks,
                    (event as CustomEvent<GanttBeforeAssignmentChangeDetail>)
                        .detail
                )
            })
        } else {
            grid.plugins = [EventSchedulerPlugin]
            grid.columns = []
            grid.resize = true
            grid.canMoveColumns = false
            grid.eventScheduler =
                view === 'calendar' ? calendarConfig : schedulerConfig
            grid.eventSchedulerResources = schedulerResources
            grid.eventSchedulerEvents = toSchedulerEvents(visibleTasks)
            grid.addEventListener('event-scheduler-event-changed', (event) => {
                tasks = updateFromScheduler(
                    tasks,
                    (event as CustomEvent<EventSchedulerEventChangedDetail>)
                        .detail
                )
            })
        }

        panel.replaceChildren(grid)
        if (view === 'kanban') void revealPlanningKanbanCard(grid, updatedTaskId)
        grid.source =
            view === 'scheduler' || view === 'calendar'
                ? []
                : view === 'gantt'
                  ? toGanttTasks(visibleTasks)
                  : visibleTasks
        switcher.querySelectorAll('button').forEach((button) => {
            const selected = button.dataset.view === activeView
            button.classList.toggle('on', selected)
            button.ariaSelected = String(selected)
        })
        renderTip()
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
        tasks = createTasks()
        filters = defaultPlanningFilters()
        selectedCount = 0
        search.value = ''
        project.value = 'all'
        status.value = ''
        priority.value = ''
        render(activeView)
    })
    dismissTips.addEventListener('click', () => {
        tipStep = updatePlanningTip(tipStep, 'dismiss')
        renderTip()
    })
    showTips.addEventListener('click', () => {
        tipStep = updatePlanningTip(tipStep, 'restart')
        render('grid')
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
