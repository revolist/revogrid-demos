import { createDropdownControl } from '@revolist/ui/dropdown/control'
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
    toPlanningGanttSource,
    ganttTaskEditorDialog,
    ganttDependencies,
    ganttResources,
    gridColumnTypes,
    gridColumns,
    createKanbanConfig,
    planningFilterDropdowns,
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
    const root = document.createElement('section')
    const switcher = document.createElement('nav')
    const panel = document.createElement('article')
    const toolbar = document.createElement('div')
    const { root: searchRoot, input: search } = createSearchInput(document, {
        rootClassName: 'planning-demo__search', iconSvg: searchIcon,
    })
    const project = createDropdownControl(document, { ...planningFilterDropdowns.project, value: 'all' })
    const status = createDropdownControl(document, { ...planningFilterDropdowns.status, value: '' })
    const priority = createDropdownControl(document, { ...planningFilterDropdowns.priority, value: '' })
    const activeTasks = createControl(document, 'button')
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
    for (const dropdown of [project, status, priority]) {
        dropdown.element.classList.add('planning-demo__filter')
        filterGroup.append(dropdown.element)
    }
    search.type = 'search'
    search.placeholder = 'Search tasks…'
    search.ariaLabel = 'Search tasks'
    activeTasks.type = 'button'
    activeTasks.textContent = 'Active tasks'
    const setActiveTasksPreset = (active: boolean) => {
        isActiveTasksPreset = active
        activeTasks.classList.toggle('on', isActiveTasksPreset)
        activeTasks.classList.add('rv-choice-chip'); activeTasks.ariaPressed = String(isActiveTasksPreset)
    }
    setActiveTasksPreset(false)
    activeTasks.classList.add('planning-demo__active')
    toolbar.append(searchRoot, filterGroup, activeTasks)
    root.append(switcher, toolbar, panel)
    parent.appendChild(root)

    function syncActiveGrid() {
        if (!activeGrid) return

        const allTasks = filterPlanningTasks(
            planningStore.createSnapshot(),
            filters
        )
        activeGrid.source = activeView === 'gantt' ? toPlanningGanttSource(allTasks) : allTasks

        if (activeView === 'gantt') {
            activeGrid.ganttAssignments = toGanttAssignments(allTasks)
            activeGrid.ganttDependencies = filterGanttDependencies(
                currentGanttDependencies,
                allTasks
            )
        }
    }

    function render(view: PlanningView) {
        status.element.hidden = priority.element.hidden = view !== 'kanban'
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
                FilterHeaderPlugin,
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
        } else if (view === 'gantt') {
            grid.plugins = [GanttPlugin, AdvanceFilterPlugin]
            grid.columns = ganttColumns
            grid.rowOrder = false
            grid.gantt = ganttConfig
            grid.ganttTaskEditorDialog = ganttTaskEditorDialog
            grid.ganttDependencies = visibleGanttDependencies
            grid.ganttResources = ganttResources
            grid.ganttAssignments = toGanttAssignments(allTasks)
            grid.filter = filterConfigs.gantt
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
        grid.source = view === 'gantt' ? toPlanningGanttSource(allTasks) : allTasks
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
    project.onChange = value => {
        setActiveTasksPreset(false)
        filters = {
            ...filters,
            projectId: value as PlanningFilters['projectId'],
        }
        syncActiveGrid()
    }
    status.onChange = value => {
        setActiveTasksPreset(false)
        filters = { ...filters, statuses: value ? [value] : [] }
        syncActiveGrid()
    }
    priority.onChange = value => {
        setActiveTasksPreset(false)
        filters = { ...filters, priorities: value ? [Number(value)] : [] }
        syncActiveGrid()
    }
    activeTasks.addEventListener('click', () => {
        setActiveTasksPreset(!isActiveTasksPreset)
        filters = isActiveTasksPreset ? activePlanningFilters() : defaultPlanningFilters()
        search.value = filters.query
        project.value = filters.projectId
        status.value = isActiveTasksPreset ? 'active' : ''
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
        project.destroy()
        status.destroy()
        priority.destroy()
        root.remove()
    }
}
