import searchIcon from './assets/search.svg'
import '@revolist/ui/styles.css';
import { ButtonControl as UiButton, Input as UiInput, Select as UiSelect } from '@revolist/ui/react-control';
import React, { useEffect, useMemo, useState } from 'react'
import { RevoGrid } from '@revolist/react-datagrid'
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
    type PlanningView,
    type PlanningFilters,
    updateFromGanttDependencies,
} from './data'
import './planning.scss'

type PlanningGridProps = React.ComponentProps<typeof RevoGrid> & {
    gantt?: typeof ganttConfig
    ganttResources?: typeof ganttResources
    ganttAssignments?: ReturnType<typeof toGanttAssignments>
    ganttDependencies?: typeof ganttDependencies
    eventScheduler?: typeof schedulerConfig
    eventSchedulerResources?: typeof schedulerResources
    kanban?: ReturnType<typeof createKanbanConfig>
    rowSelect?: { rowOrder: boolean }
    filter?: ColumnFilterConfig
    onGridedit?: (
        event: CustomEvent<PlanningEditDetail>
    ) => void
    onRoworderapplied?: (event: CustomEvent) => void
    onFilterastchange?: (event: CustomEvent) => void
    filterBadges?: object
    rangeSelectionLimit?: 'column'
}

const PlanningGrid = RevoGrid as React.ComponentType<PlanningGridProps>

export default function PlanningViews() {
    const planningStore = useMemo(
        () => new PlanningWorkspaceStore(createTasks()),
        []
    )
    const [activeView, setActiveView] = useState<PlanningView>('grid')
    const [tasks, setTasks] = useState(() => planningStore.createSnapshot())
    const [currentGanttDependencies, setCurrentGanttDependencies] = useState(
        () => [...ganttDependencies]
    )
    const [filters, setFilters] = useState<PlanningFilters>(
        defaultPlanningFilters
    )
    const [isActiveTasksPreset, setIsActiveTasksPreset] = useState(false)
    const filterConfigs = useMemo<Record<'grid' | 'kanban' | 'gantt', ColumnFilterConfig>>(
        () => ({
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
        }),
        []
    )
    const [isDark, setIsDark] = useState(() => currentTheme().isDark())
    const ganttPlugins = useMemo(() => [GanttPlugin, AdvanceFilterPlugin, FilterHeaderPlugin], [])
    const kanbanPlugins = useMemo(() => [KanbanPlugin, AdvanceFilterPlugin], [])
    const schedulerPlugins = useMemo(() => [EventSchedulerPlugin], [])
    const emptySource = useMemo<never[]>(() => [], [])
    const gridPlugins = useMemo(
        () => [
            RowOrderPlugin,
            RowSelectPlugin,
            PlanningWorkspacePlugin,
            EventManagerPlugin,
            AdvanceFilterPlugin,
            DataGridFormattingPlugin,
            RangeSelectionLimitPlugin,
            ColumnStretchPlugin,
            ColumnHidePlugin,
        ],
        []
    )
    const dataGridFormatting = useMemo(() => planningDataGridFormatting, [])
    const kanbanConfig = useMemo(() => createKanbanConfig(), [])
    const dataGridContextMenu = useMemo(
        () =>
            createPlanningDataGridContextMenu((taskIds) => {
                planningStore.delete(taskIds)
                setTasks(planningStore.createSnapshot())
            }),
        [planningStore]
    )
    const ganttAssignments = useMemo(
        () => toGanttAssignments(tasks),
        [tasks]
    )
    const visibleGanttDependencies = useMemo(
        () => filterGanttDependencies(currentGanttDependencies, tasks),
        [currentGanttDependencies, tasks]
    )
    const visibleTasks = useMemo(
        () => filterPlanningTasks(tasks, filters),
        [tasks, filters]
    )
    useEffect(() => observeCurrentTheme(setIsDark), [])
    const handlePlanningEdit = (
        event: CustomEvent<PlanningEditDetail>
    ) => {
        setCurrentGanttDependencies((current) =>
            updateFromGanttDependencies(current, event.detail)
        )
        planningStore.commitPlanningEdit(event.detail)
        setTasks(planningStore.createSnapshot())
    }
    const filterBadgeOptions = useMemo(() => ({
        className: 'planning-demo__filter-badges',
        badgeClassName: 'planning-demo__filter-badge',
        emptyClassName: 'planning-demo__filter-badges--empty',
        renderEmpty: () => '',
    }), [])

    const selectPlanningView = (view: PlanningView) => {
        if (view === activeView) return
        setTasks(planningStore.createSnapshot())
        setActiveView(view)
    }

    const changeFilters = (
        update: React.SetStateAction<PlanningFilters>
    ) => {
        setIsActiveTasksPreset(false)
        setFilters((current) => {
            const next = typeof update === 'function' ? update(current) : update
            return next
        })
    }

    return (
        <section className="planning-demo" data-theme={isDark ? 'dark' : 'light'}>
            <nav
                className="planning-demo__switch rv-segmented-switch"
                role="tablist"
                aria-label="Planning view"
            >
                {views.map((view) => (
                    <UiButton
                        key={view}
                        type="button"
                        className={"rv-segmented-switch-item " + (`rv-segmented-switch-item${activeView === view ? ' on' : ''}`) + ((activeView === view) ? ' on' : '')}
                        role="tab"
                        aria-selected={activeView === view}
                        onClick={() => selectPlanningView(view)}
                    >
                        {view}
                    </UiButton>
                ))}
            </nav>

            <div className="planning-demo__toolbar" role="group" aria-label="Task filters">
                <label className="planning-demo__search rv-search-input rv-search-input--no-shortcut">
                    <span className="rv-search-input-icon" aria-hidden="true"><img src={searchIcon} alt="" /></span>
                    <UiInput
                        aria-label="Search tasks"
                        type="search"
                        placeholder="Search tasks…"
                        value={filters.query}
                        onChange={(event) =>
                            changeFilters((current) => ({
                                ...current,
                                query: event.target.value,
                            }))
                        }
                    />
                </label>
                <div className="planning-demo__filters">
                    <UiSelect
                        className="rv-control--compact"
                        aria-label="Project"
                        value={filters.projectId}
                        onChange={(event) =>
                            changeFilters((current) => ({
                                ...current,
                                projectId: event.target
                                    .value as PlanningFilters['projectId'],
                            }))
                        }
                    >
                        <option value="all">Project: All</option>
                        {planningProjects.map((project) => (
                            <option key={project.id} value={project.id}>
                                {project.label}
                            </option>
                        ))}
                    </UiSelect>
                    {activeView === 'kanban' && <>
                        <UiSelect className="rv-control--compact" aria-label="Status" value={filters.statuses.length > 1 ? 'active' : filters.statuses[0] || ''}
                            onChange={event => changeFilters(current => ({ ...current, statuses: event.target.value ? [event.target.value] : [] }))}>
                            <option value="">Status: All</option>{filters.statuses.length > 1 && <option value="active" disabled>Status: Active</option>}
                            <option value="not-started">Planned</option><option value="in-progress">In progress</option><option value="blocked">Blocked</option><option value="done">Done</option>
                        </UiSelect>
                        <UiSelect className="rv-control--compact" aria-label="Priority" value={filters.priorities[0] || ''}
                            onChange={event => changeFilters(current => ({ ...current, priorities: event.target.value ? [Number(event.target.value)] : [] }))}>
                            <option value="">Priority: All</option><option value="500">Normal</option><option value="700">High</option><option value="900">Critical</option>
                        </UiSelect>
                    </>}
                </div>
                <UiButton
                    type="button"
                    className={"rv-choice-chip planning-demo__active " + (isActiveTasksPreset ? 'on' : undefined)}
                    aria-pressed={isActiveTasksPreset}
                    onClick={() => {
                        setIsActiveTasksPreset(!isActiveTasksPreset)
                        setFilters(isActiveTasksPreset ? defaultPlanningFilters() : activePlanningFilters())
                    }}
                >
                    Active tasks
                </UiButton>
                <UiButton
                    className="rv-btn-ghost planning-demo__reset"
                    type="button"
                    onClick={() => {
                        planningStore.replace(createTasks())
                        setCurrentGanttDependencies([...ganttDependencies])
                        setTasks(planningStore.createSnapshot())
                        setIsActiveTasksPreset(false)
                        setFilters(defaultPlanningFilters())
                    }}
                >
                    Reset
                </UiButton>
            </div>

            {activeView === 'grid' && (
                <PlanningGrid
                    key="grid"
                    className="planning-demo__grid"
                    theme={isDark ? 'darkCompact' : 'compact'}
                    hideAttribution
                    plugins={gridPlugins}
                    source={visibleTasks}
                    columns={gridColumns}
                    hideColumns={['activityAt']}
                    columnTypes={gridColumnTypes}
                    dataGridContextMenu={dataGridContextMenu}
                    dataGridFormatting={dataGridFormatting}
                    range
                    rangeSelectionLimit="column"
                    resize
                    canMoveColumns
                    rowSize={40}
                    stretch={1}
                    rowOrder={planningRowOrder}
                    rowSelect={{ rowOrder: true }}
                    filter={filterConfigs.grid}
                    filterBadges={filterBadgeOptions}
                    onFilterastchange={(event) => {
                        if (event.detail.origin === 'ui') {
                            filterConfigs.grid.filterAst = event.detail.filterAst
                        }
                    }}
                    onGridedit={handlePlanningEdit}
                    onRoworderapplied={(event) => {
                        void getPlanningVisibleSource(event)
                            .then((visible) => {
                                planningStore.commitVisibleOrder(visible)
                                setTasks(planningStore.createSnapshot())
                            })
                    }}
                />
            )}
            {activeView === 'gantt' && (
                <PlanningGrid
                    key="gantt"
                    className="planning-demo__grid planning-demo__grid--timeline"
                    theme={isDark ? 'darkCompact' : 'compact'}
                    hideAttribution
                    plugins={ganttPlugins}
                    source={visibleTasks}
                    columns={ganttColumns}
                    rowOrder={false}
                    gantt={ganttConfig}
                    ganttDependencies={visibleGanttDependencies}
                    ganttResources={ganttResources}
                    ganttAssignments={ganttAssignments}
                    filter={filterConfigs.gantt}
                    filterBadges={filterBadgeOptions}
                    onFilterastchange={(event) => {
                        if (event.detail.origin === 'ui') {
                            filterConfigs.gantt.filterAst = event.detail.filterAst
                        }
                    }}
                    onGridedit={handlePlanningEdit}
                />
            )}
            {activeView === 'kanban' && (
                <PlanningGrid
                    key="kanban"
                    className="planning-demo__grid"
                    theme={isDark ? 'darkCompact' : 'compact'}
                    hideAttribution
                    plugins={kanbanPlugins}
                    source={visibleTasks}
                    columns={gridColumns}
                    kanban={kanbanConfig}
                    filter={filterConfigs.kanban}
                    filterBadges={filterBadgeOptions}
                    onFilterastchange={(event) => {
                        if (event.detail.origin === 'ui') {
                            filterConfigs.kanban.filterAst = event.detail.filterAst
                        }
                    }}
                    onGridedit={handlePlanningEdit}
                />
            )}
            {(activeView === 'scheduler' || activeView === 'calendar') && (
                    <PlanningGrid
                        key={activeView}
                        className="planning-demo__grid planning-demo__grid--timeline"
                        theme={isDark ? 'darkCompact' : 'compact'}
                        hideAttribution
                        plugins={schedulerPlugins}
                        source={tasks}
                        columns={emptySource}
                        resize
                        canMoveColumns={false}
                        eventScheduler={
                            activeView === 'calendar'
                                ? calendarConfig
                                : schedulerConfig
                        }
                        eventSchedulerResources={schedulerResources}
                        onGridedit={handlePlanningEdit}
                    />
                )}
            <footer className="planning-demo__footer">
                <span className="planning-demo__footer-meta">
                    <span>Changes stay in this demo</span>
                </span>
            </footer>
        </section>
    )
}
