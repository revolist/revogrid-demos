import {
    Component,
    NO_ERRORS_SCHEMA,
    ViewEncapsulation,
} from '@angular/core'
import { RevoGrid } from '@revolist/angular-datagrid'
import type { AdvancedFilterConfig } from '@revolist/revogrid-pro'
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
import { currentTheme } from '../../composables/useRandomData'
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
    type PlanningEditDetail,
    type PlanningFilters,
    type PlanningView,
    updateFromGanttDependencies,
} from './data'

@Component({
    selector: 'planning-views-grid',
    standalone: true,
    schemas: [NO_ERRORS_SCHEMA],
    imports: [RevoGrid],
    encapsulation: ViewEncapsulation.None,
    styleUrls: ['./planning.scss'],
    template: `
        <section class="planning-demo">
            <nav
                class="planning-demo__switch rv-segmented-switch"
                role="tablist"
                aria-label="Planning view"
            >
                <button
                    type="button"
                    class="rv-segmented-switch-item"
                    role="tab"
                    [class.on]="activeView === 'grid'"
                    [attr.aria-selected]="activeView === 'grid'"
                    (click)="selectPlanningView('grid')"
                >
                    Grid
                </button>
                <button
                    type="button"
                    class="rv-segmented-switch-item"
                    role="tab"
                    [class.on]="activeView === 'kanban'"
                    [attr.aria-selected]="activeView === 'kanban'"
                    (click)="selectPlanningView('kanban')"
                >
                    Kanban
                </button>
                <button
                    type="button"
                    class="rv-segmented-switch-item"
                    role="tab"
                    [class.on]="activeView === 'gantt'"
                    [attr.aria-selected]="activeView === 'gantt'"
                    (click)="selectPlanningView('gantt')"
                >
                    Gantt
                </button>
                <button
                    type="button"
                    class="rv-segmented-switch-item"
                    role="tab"
                    [class.on]="activeView === 'scheduler'"
                    [attr.aria-selected]="activeView === 'scheduler'"
                    (click)="selectPlanningView('scheduler')"
                >
                    Scheduler
                </button>
                <button
                    type="button"
                    class="rv-segmented-switch-item"
                    role="tab"
                    [class.on]="activeView === 'calendar'"
                    [attr.aria-selected]="activeView === 'calendar'"
                    (click)="selectPlanningView('calendar')"
                >
                    Calendar
                </button>
            </nav>

            <div class="planning-demo__toolbar">
                <label class="planning-demo__search"
                    ><span aria-hidden="true">⌕</span
                    ><input
                        aria-label="Search tasks"
                        type="search"
                        placeholder="Search tasks…"
                        [value]="filters.query"
                        (input)="setQuery($event)"
                /></label>
                <label class="planning-demo__select"
                    ><select
                        aria-label="Project"
                        [value]="filters.projectId"
                        (change)="setProject($event)"
                    >
                        <option value="all">All projects</option>
                        @for (project of planningProjects; track project.id) {
                            <option [value]="project.id">
                                {{ project.label }}
                            </option>
                        }
                    </select></label
                >
                <label class="planning-demo__select"
                    ><select
                        aria-label="Status"
                        [value]="filters.statuses[0] || ''"
                        (change)="setStatus($event)"
                    >
                        <option value="">All statuses</option>
                        <option value="not-started">Planned</option>
                        <option value="in-progress">In progress</option>
                        <option value="blocked">Blocked</option>
                        <option value="done">Done</option>
                    </select></label
                >
                <label class="planning-demo__select"
                    ><select
                        aria-label="Priority"
                        [value]="filters.priorities[0] || ''"
                        (change)="setPriority($event)"
                    >
                        <option value="">All priorities</option>
                        <option value="500">Normal</option>
                        <option value="700">High</option>
                        <option value="900">Critical</option>
                    </select></label
                >
                <button
                    type="button"
                    [class.on]="isActiveTasksPreset"
                    [attr.aria-pressed]="isActiveTasksPreset"
                    (click)="applyActiveTasksPreset()"
                >
                    Active tasks
                </button>
                <button type="button" (click)="resetWorkspace()">Reset</button>
            </div>

            @switch (activeView) {
                @case ('grid') {
                    <revo-grid
                        class="planning-demo__grid"
                        [hideAttribution]="true"
                        [theme]="theme"
                        [plugins]="gridPlugins"
                        [source]="tasks"
                        [columns]="gridColumns"
                        [columnTypes]="gridColumnTypes"
                        [dataGridContextMenu]="planningDataGridContextMenu"
                        [dataGridFormatting]="planningDataGridFormatting"
                        [stretch]="1"
                        [filter]="gridFilterConfig"
                        [filterBadges]="filterBadgeOptions"
                        [range]="true"
                        [rangeSelectionLimit]="'column'"
                        [resize]="true"
                        [canMoveColumns]="true"
                        [rowSize]="40"
                        [rowOrder]="planningRowOrder"
                        [rowSelect]="rowSelect"
                        (gridedit)="handlePlanningEdit($event)"
                        (roworderapplied)="handleGridRowOrder($event)"
                        (filterastchange)="
                            $any($event).detail.origin === 'ui' &&
                            (gridFilterConfig.filterAst = $any($event).detail.filterAst)
                        "
                    ></revo-grid>
                }
                @case ('gantt') {
                    <revo-grid
                        class="planning-demo__grid planning-demo__grid--timeline"
                        [hideAttribution]="true"
                        [theme]="theme"
                        [plugins]="ganttPlugins"
                        [source]="tasks"
                        [columns]="ganttColumns"
                        [rowOrder]="false"
                        [gantt]="ganttConfig"
                        [ganttDependencies]="visibleGanttDependencies"
                        [ganttResources]="ganttResources"
                        [ganttAssignments]="ganttAssignments"
                        [filter]="ganttFilterConfig"
                        [filterBadges]="filterBadgeOptions"
                        (gridedit)="handlePlanningEdit($event)"
                        (filterastchange)="
                            $any($event).detail.origin === 'ui' &&
                            (ganttFilterConfig.filterAst = $any($event).detail.filterAst)
                        "
                    ></revo-grid>
                }
                @case ('kanban') {
                    <revo-grid
                        class="planning-demo__grid"
                        [hideAttribution]="true"
                        [theme]="theme"
                        [plugins]="kanbanPlugins"
                        [source]="tasks"
                        [columns]="gridColumns"
                        [kanban]="kanbanConfig"
                        [filter]="kanbanFilterConfig"
                        [filterBadges]="filterBadgeOptions"
                        (gridedit)="handlePlanningEdit($event)"
                        (filterastchange)="
                            $any($event).detail.origin === 'ui' &&
                            (kanbanFilterConfig.filterAst = $any($event).detail.filterAst)
                        "
                    ></revo-grid>
                }
                @case ('scheduler') {
                    <revo-grid
                        class="planning-demo__grid planning-demo__grid--timeline"
                        [hideAttribution]="true"
                        [theme]="theme"
                        [plugins]="schedulerPlugins"
                        [source]="tasks"
                        [columns]="empty"
                        [resize]="true"
                        [canMoveColumns]="false"
                        [eventScheduler]="schedulerConfig"
                        [eventSchedulerResources]="schedulerResources"
                        (gridedit)="handlePlanningEdit($event)"
                    ></revo-grid>
                }
                @case ('calendar') {
                    <revo-grid
                        class="planning-demo__grid planning-demo__grid--timeline"
                        [hideAttribution]="true"
                        [theme]="theme"
                        [plugins]="schedulerPlugins"
                        [source]="tasks"
                        [columns]="empty"
                        [resize]="true"
                        [canMoveColumns]="false"
                        [eventScheduler]="calendarConfig"
                        [eventSchedulerResources]="schedulerResources"
                        (gridedit)="handlePlanningEdit($event)"
                    ></revo-grid>
                }
            }
            <footer class="planning-demo__footer">
                <span class="planning-demo__footer-meta">
                    <span>Changes stay in this demo</span>
                </span>
            </footer>
        </section>
    `,
})
export class PlanningViewsGridComponent {
    theme = currentTheme().isDark() ? 'darkCompact' : 'compact'
    activeView: PlanningView = 'grid'
    private readonly planningStore = new PlanningWorkspaceStore(createTasks())
    tasks = this.planningStore.createSnapshot()
    filters: PlanningFilters = defaultPlanningFilters()
    isActiveTasksPreset = false
    readonly planningProjects = planningProjects
    readonly gridColumns = gridColumns
    readonly gridColumnTypes = gridColumnTypes
    readonly gridFilterConfig: AdvancedFilterConfig = {
        ...planningFilterConfig,
        multiFilterItems: { ...planningFilterConfig.multiFilterItems },
    }
    readonly kanbanFilterConfig: AdvancedFilterConfig = {
        ...planningFilterConfig,
        multiFilterItems: { ...planningFilterConfig.multiFilterItems },
    }
    readonly ganttFilterConfig: AdvancedFilterConfig = {
        ...planningFilterConfig,
        multiFilterItems: { ...planningFilterConfig.multiFilterItems },
    }
    readonly filterBadgeOptions = {
        className: 'planning-demo__filter-badges',
        badgeClassName: 'planning-demo__filter-badge',
        emptyClassName: 'planning-demo__filter-badges--empty',
        renderEmpty: () => '',
    }
    readonly planningDataGridContextMenu = createPlanningDataGridContextMenu(
        (taskIds) => this.deleteSelectedTasks(taskIds)
    )
    readonly planningDataGridFormatting = planningDataGridFormatting
    readonly ganttColumns = ganttColumns
    readonly ganttConfig = ganttConfig
    ganttDependencyState = [...ganttDependencies]
    readonly kanbanConfig = createKanbanConfig()
    readonly ganttResources = ganttResources
    readonly schedulerConfig = schedulerConfig
    readonly calendarConfig = calendarConfig
    readonly schedulerResources = schedulerResources
    readonly ganttPlugins = [GanttPlugin, AdvanceFilterPlugin, FilterHeaderPlugin]
    readonly gridPlugins = [
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
    readonly rowSelect = { rowOrder: true }
    readonly planningRowOrder = planningRowOrder
    readonly kanbanPlugins = [KanbanPlugin, AdvanceFilterPlugin]
    readonly schedulerPlugins = [EventSchedulerPlugin]
    readonly empty: never[] = []
    ganttAssignments = toGanttAssignments(this.tasks)
    visibleGanttDependencies = filterGanttDependencies(
        this.ganttDependencyState,
        this.tasks
    )

    refreshViewSnapshot() {
        this.tasks = filterPlanningTasks(
            this.planningStore.createSnapshot(),
            this.filters
        )
        this.ganttAssignments = toGanttAssignments(this.tasks)
        this.visibleGanttDependencies = filterGanttDependencies(
            this.ganttDependencyState,
            this.tasks
        )
    }
    setQuery(event: Event) {
        this.filters = {
            ...this.filters,
            query: (event.target as HTMLInputElement).value,
        }
        this.applyToolbarFilters()
    }
    setProject(event: Event) {
        this.filters = {
            ...this.filters,
            projectId: (event.target as HTMLSelectElement)
                .value as PlanningFilters['projectId'],
        }
        this.applyToolbarFilters()
    }
    setStatus(event: Event) {
        const value = (event.target as HTMLSelectElement).value
        this.filters = { ...this.filters, statuses: value ? [value] : [] }
        this.applyToolbarFilters()
    }
    setPriority(event: Event) {
        const value = (event.target as HTMLSelectElement).value
        this.filters = {
            ...this.filters,
            priorities: value ? [Number(value)] : [],
        }
        this.applyToolbarFilters()
    }
    resetWorkspace() {
        this.planningStore.replace(createTasks())
        this.ganttDependencyState = [...ganttDependencies]
        this.filters = defaultPlanningFilters()
        this.isActiveTasksPreset = false
        this.refreshViewSnapshot()
    }

    selectPlanningView(view: PlanningView) {
        if (view === this.activeView) return
        this.refreshViewSnapshot()
        this.activeView = view
    }

    applyActiveTasksPreset() {
        this.filters = activePlanningFilters()
        this.isActiveTasksPreset = true
        this.refreshViewSnapshot()
    }

    deleteSelectedTasks(taskIds: readonly string[]) {
        this.planningStore.delete(taskIds)
        this.refreshViewSnapshot()
    }

    async handleGridRowOrder(event: Event) {
        const visible = await getPlanningVisibleSource(event)
        this.planningStore.commitVisibleOrder(visible)
        this.refreshViewSnapshot()
    }

    handlePlanningEdit(
        event: CustomEvent<PlanningEditDetail>
    ) {
        this.ganttDependencyState = updateFromGanttDependencies(
            this.ganttDependencyState,
            event.detail
        )
        this.planningStore.commitPlanningEdit(event.detail)
        this.refreshViewSnapshot()
    }

    private applyToolbarFilters() {
        this.isActiveTasksPreset = false
        this.refreshViewSnapshot()
    }
}
