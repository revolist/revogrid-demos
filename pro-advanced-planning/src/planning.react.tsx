import React, { useEffect, useMemo, useRef, useState } from 'react'
import { RevoGrid } from '@revolist/react-datagrid'
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
    planningRowOrder,
    planningRowResize,
    schedulerConfig,
    schedulerResources,
    toGanttAssignments,
    toSchedulerEvents,
    updateFromGrid,
    updateFromGridSource,
    updateFromPlanningEdit,
    views,
    type PlanningView,
    type PlanningTask,
    type PlanningFilters,
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

type PlanningGridProps = React.ComponentProps<typeof RevoGrid> & {
    gantt?: typeof ganttConfig
    ganttResources?: typeof ganttResources
    ganttAssignments?: ReturnType<typeof toGanttAssignments>
    ganttDependencies?: typeof ganttDependencies
    eventScheduler?: typeof schedulerConfig
    eventSchedulerResources?: typeof schedulerResources
    eventSchedulerEvents?: ReturnType<typeof toSchedulerEvents>
    kanban?: ReturnType<typeof createKanbanConfig>
    rowSelect?: { rowOrder: boolean }
    filter?: typeof planningFilterConfig
    onRowselected?: (
        event: CustomEvent<HTMLRevoGridElementEventMap['rowselected']>
    ) => void
    onGridedit?: (
        event: CustomEvent<Parameters<typeof updateFromPlanningEdit>[1]>
    ) => void
}

const PlanningGrid = RevoGrid as React.ComponentType<PlanningGridProps>

export default function PlanningViews() {
    const [activeView, setActiveView] = useState<PlanningView>('grid')
    const [tasks, setTasks] = useState(createTasks)
    const [filters, setFilters] = useState<PlanningFilters>(
        defaultPlanningFilters
    )
    const [selectedCount, setSelectedCount] = useState(0)
    const [tipStep, setTipStep] = useState<PlanningTipStep>(readPlanningTip)
    const [updatedTaskId, setUpdatedTaskId] = useState<string>()
    const gridRef = useRef<HTMLRevoGridElement>(null)
    const kanbanRef = useRef<HTMLRevoGridElement>(null)
    const [isDark, setIsDark] = useState(() => currentTheme().isDark())
    const ganttPlugins = useMemo(() => [GanttPlugin], [])
    const kanbanPlugins = useMemo(() => [KanbanPlugin], [])
    const schedulerPlugins = useMemo(() => [EventSchedulerPlugin], [])
    const gridPlugins = useMemo(
        () => [
            RowOrderPlugin,
            RowSelectPlugin,
            AdvanceFilterPlugin,
            DataGridFormattingPlugin,
            ColumnStretchPlugin,
            ColumnHidePlugin,
        ],
        []
    )
    const dataGridFormatting = useMemo(() => planningDataGridFormatting, [])
    const kanbanConfig = useMemo(
        () => createKanbanConfig(updatedTaskId),
        [updatedTaskId]
    )
    const dataGridContextMenu = useMemo(
        () =>
            createPlanningDataGridContextMenu((taskIds) => {
                setTasks((current) => deletePlanningTasks(current, taskIds))
                setSelectedCount(0)
                void clearPlanningRowSelection(gridRef.current)
            }),
        []
    )
    const visibleTasks = useMemo(
        () => filterPlanningTasks(tasks, filters),
        [tasks, filters]
    )
    const ganttAssignments = useMemo(
        () => toGanttAssignments(visibleTasks),
        [visibleTasks]
    )
    const visibleGanttDependencies = useMemo(
        () => filterGanttDependencies(ganttDependencies, visibleTasks),
        [visibleTasks]
    )
    const schedulerEvents = useMemo(
        () => toSchedulerEvents(visibleTasks),
        [visibleTasks]
    )

    useEffect(() => observeCurrentTheme(setIsDark), [])
    useEffect(() => {
        if (activeView === 'kanban') {
            void revealPlanningKanbanCard(kanbanRef.current, updatedTaskId)
        }
    }, [activeView, updatedTaskId])

    const handleCommittedTaskNameEdit = (
        previous: PlanningTask[],
        next: PlanningTask[]
    ) => {
        const taskId = changedPlanningTaskName(previous, next)
        if (!taskId) return
        setUpdatedTaskId(taskId)
        setTipStep((current) => updatePlanningTip(current, 'edit-committed'))
    }

    const handlePlanningEdit = (
        event: CustomEvent<Parameters<typeof updateFromPlanningEdit>[1]>
    ) =>
        setTasks((current) =>
            updateFromPlanningEdit(current, event.detail)
        )

    const selectPlanningView = (view: PlanningView) => {
        if (view === 'kanban') {
            setTipStep((current) => updatePlanningTip(current, 'kanban-opened'))
        }
        setActiveView(view)
    }

    const visibleTip =
        activeView === 'grid' && tipStep !== 'done' ? tipStep : null

    return (
        <section className="planning-demo">
            <nav
                className="planning-demo__switch rv-segmented-switch"
                role="tablist"
                aria-label="Planning view"
            >
                {views.map((view) => (
                    <button
                        key={view}
                        type="button"
                        className={`rv-segmented-switch-item${activeView === view ? ' on' : ''}`}
                        role="tab"
                        aria-selected={activeView === view}
                        onClick={() => selectPlanningView(view)}
                    >
                        {view}
                    </button>
                ))}
            </nav>

            {visibleTip && (
                <aside
                    className={`planning-demo__tip planning-demo__tip--${visibleTip}`}
                >
                    <span role="status" aria-live="polite">
                        {planningTipCopy[visibleTip]}
                    </span>
                    <button
                        type="button"
                        aria-label="Dismiss tips"
                        onClick={() =>
                            setTipStep((current) =>
                                updatePlanningTip(current, 'dismiss')
                            )
                        }
                    >
                        ×
                    </button>
                </aside>
            )}
            {activeView === 'kanban' && updatedTaskId && (
                <p className="planning-demo__completion" role="status">
                    {planningTipCompletionCopy}
                </p>
            )}

            <div className="planning-demo__toolbar">
                <label className="planning-demo__search">
                    <span aria-hidden="true">⌕</span>
                    <input
                        aria-label="Search tasks"
                        type="search"
                        placeholder="Search tasks…"
                        value={filters.query}
                        onChange={(event) =>
                            setFilters((current) => ({
                                ...current,
                                query: event.target.value,
                            }))
                        }
                    />
                </label>
                <label className="planning-demo__select">
                    <select
                        aria-label="Project"
                        value={filters.projectId}
                        onChange={(event) =>
                            setFilters((current) => ({
                                ...current,
                                projectId: event.target
                                    .value as PlanningFilters['projectId'],
                            }))
                        }
                    >
                        <option value="all">All projects</option>
                        {planningProjects.map((project) => (
                            <option key={project.id} value={project.id}>
                                {project.label}
                            </option>
                        ))}
                    </select>
                </label>
                <details className="planning-demo__filter-wrap">
                    <summary>
                        Filter ·{' '}
                        {filters.statuses.length + filters.priorities.length}
                    </summary>
                    <div className="planning-demo__filter-popover">
                        <fieldset>
                            <legend>Status</legend>
                            {(
                                [
                                    ['not-started', 'Planned'],
                                    ['in-progress', 'In progress'],
                                    ['blocked', 'Blocked'],
                                    ['done', 'Done'],
                                ] as const
                            ).map(([value, label]) => (
                                <label key={value}>
                                    <input
                                        type="checkbox"
                                        checked={filters.statuses.includes(
                                            value
                                        )}
                                        onChange={() =>
                                            setFilters((current) => ({
                                                ...current,
                                                statuses:
                                                    current.statuses.includes(
                                                        value
                                                    )
                                                        ? current.statuses.filter(
                                                              (item) =>
                                                                  item !== value
                                                          )
                                                        : [
                                                              ...current.statuses,
                                                              value,
                                                          ],
                                            }))
                                        }
                                    />
                                    {label}
                                </label>
                            ))}
                        </fieldset>
                        <fieldset>
                            <legend>Priority</legend>
                            {[
                                [500, 'Normal'],
                                [700, 'High'],
                                [900, 'Critical'],
                            ].map(([value, label]) => (
                                <label key={value}>
                                    <input
                                        type="checkbox"
                                        checked={filters.priorities.includes(
                                            Number(value)
                                        )}
                                        onChange={() =>
                                            setFilters((current) => ({
                                                ...current,
                                                priorities:
                                                    current.priorities.includes(
                                                        Number(value)
                                                    )
                                                        ? current.priorities.filter(
                                                              (item) =>
                                                                  item !==
                                                                  Number(value)
                                                          )
                                                        : [
                                                              ...current.priorities,
                                                              Number(value),
                                                          ],
                                            }))
                                        }
                                    />
                                    {label}
                                </label>
                            ))}
                        </fieldset>
                        <button
                            type="button"
                            className="planning-demo__clear"
                            onClick={() => setFilters(defaultPlanningFilters())}
                        >
                            Clear filters
                        </button>
                    </div>
                </details>
                <button
                    type="button"
                    onClick={() => setFilters(activePlanningFilters())}
                >
                    Active tasks
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setTasks(createTasks())
                        setFilters(defaultPlanningFilters())
                        setSelectedCount(0)
                    }}
                >
                    Reset
                </button>
                <span className="planning-demo__count">
                    {visibleTasks.length} of {tasks.length} tasks ·{' '}
                    {selectedCount} selected
                </span>
            </div>

            {!visibleTasks.length && (
                <div className="planning-demo__empty">
                    <strong>No tasks match your filters</strong>
                    <button
                        type="button"
                        onClick={() => setFilters(defaultPlanningFilters())}
                    >
                        Clear filters
                    </button>
                </div>
            )}
            {!!visibleTasks.length && activeView === 'grid' && (
                <PlanningGrid
                    key="grid"
                    ref={gridRef}
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
                    resize
                    canMoveColumns
                    rowSize={40}
                    resizeRow={planningRowResize}
                    stretch={1}
                    rowOrder={planningRowOrder}
                    rowSelect={{ rowOrder: true }}
                    filter={planningFilterConfig}
                    onRowselected={(event: CustomEvent<{ count: number }>) =>
                        setSelectedCount(event.detail.count)
                    }
                    onAfteredit={(event) => {
                        const detail = event.detail as Parameters<
                            typeof updateFromGrid
                        >[1]
                        const next = updateFromGrid(tasks, detail)
                        handleCommittedTaskNameEdit(tasks, next)
                        setTasks(next)
                        const grid =
                            event.currentTarget as unknown as HTMLRevoGridElement
                        void grid
                            .getVisibleSource()
                            .then((visible: PlanningTask[]) => {
                                setTasks((current) => {
                                    const resolved = updateFromGridSource(
                                        current,
                                        detail,
                                        visible
                                    )
                                    handleCommittedTaskNameEdit(
                                        current,
                                        resolved
                                    )
                                    return resolved
                                })
                            })
                    }}
                />
            )}
            {!!visibleTasks.length && activeView === 'gantt' && (
                <PlanningGrid
                    key="gantt"
                    className="planning-demo__grid planning-demo__grid--timeline"
                    theme={isDark ? 'darkCompact' : 'compact'}
                    hideAttribution
                    plugins={ganttPlugins}
                    source={visibleTasks}
                    columns={ganttColumns}
                    resizeRow={planningRowResize}
                    gantt={ganttConfig}
                    ganttDependencies={visibleGanttDependencies}
                    ganttResources={ganttResources}
                    ganttAssignments={ganttAssignments}
                    onGridedit={handlePlanningEdit}
                />
            )}
            {!!visibleTasks.length && activeView === 'kanban' && (
                <PlanningGrid
                    key="kanban"
                    ref={kanbanRef}
                    className="planning-demo__grid"
                    theme={isDark ? 'darkCompact' : 'compact'}
                    hideAttribution
                    plugins={kanbanPlugins}
                    source={visibleTasks}
                    columns={gridColumns}
                    kanban={kanbanConfig}
                    onGridedit={handlePlanningEdit}
                />
            )}
            {!!visibleTasks.length &&
                (activeView === 'scheduler' || activeView === 'calendar') && (
                    <PlanningGrid
                        key={activeView}
                        className="planning-demo__grid planning-demo__grid--timeline"
                        theme={isDark ? 'darkCompact' : 'compact'}
                        hideAttribution
                        plugins={schedulerPlugins}
                        source={[]}
                        columns={[]}
                        resize
                        canMoveColumns={false}
                        eventScheduler={
                            activeView === 'calendar'
                                ? calendarConfig
                                : schedulerConfig
                        }
                        eventSchedulerResources={schedulerResources}
                        eventSchedulerEvents={schedulerEvents}
                        onGridedit={handlePlanningEdit}
                    />
                )}
            <footer className="planning-demo__footer">
                <span className="planning-demo__footer-meta">
                    <span>Changes stay in this demo</span>
                    <button
                        type="button"
                        onClick={() => {
                            setActiveView('grid')
                            setTipStep((current) =>
                                updatePlanningTip(current, 'restart')
                            )
                        }}
                    >
                        Show tips
                    </button>
                </span>
            </footer>
        </section>
    )
}
