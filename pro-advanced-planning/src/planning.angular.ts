import {
    Component,
    NO_ERRORS_SCHEMA,
    ViewEncapsulation,
} from '@angular/core'
import { RevoGrid } from '@revolist/angular-datagrid'
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
import { currentTheme } from '../../composables/useRandomData'
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
    type PlanningTask,
    type PlanningFilters,
    type PlanningView,
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
                <button type="button" (click)="applyActiveTasksPreset()">
                    Active tasks
                </button>
                <button type="button" (click)="resetWorkspace()">Reset</button>
                <span class="planning-demo__count"
                    >{{ visibleTasks.length }} of {{ tasks.length }} tasks
                    @if (selectedCount) {
                        · {{ selectedCount }} selected
                    }
                </span>
            </div>

            @switch (activeView) {
                @case ('grid') {
                    <revo-grid
                        class="planning-demo__grid"
                        [hideAttribution]="true"
                        [theme]="theme"
                        [plugins]="gridPlugins"
                        [source]="visibleTasks"
                        [columns]="gridColumns"
                        [columnTypes]="gridColumnTypes"
                        [dataGridContextMenu]="planningDataGridContextMenu"
                        [dataGridFormatting]="planningDataGridFormatting"
                        [stretch]="1"
                        [filter]="planningFilterConfig"
                        [range]="true"
                        [resize]="true"
                        [canMoveColumns]="true"
                        [rowSize]="40"
                        [resizeRow]="planningRowResize"
                        [rowOrder]="planningRowOrder"
                        [rowSelect]="rowSelect"
                        (afteredit)="handleGridEdit($event)"
                        (rowselected)="handleRowSelected($event)"
                    ></revo-grid>
                }
                @case ('gantt') {
                    <revo-grid
                        class="planning-demo__grid planning-demo__grid--timeline"
                        [hideAttribution]="true"
                        [theme]="theme"
                        [plugins]="ganttPlugins"
                        [source]="visibleTasks"
                        [columns]="ganttColumns"
                        [resizeRow]="planningRowResize"
                        [gantt]="ganttConfig"
                        [ganttDependencies]="visibleGanttDependencies"
                        [ganttResources]="ganttResources"
                        [ganttAssignments]="ganttAssignments"
                        (gridedit)="handlePlanningEdit($event)"
                    ></revo-grid>
                }
                @case ('kanban') {
                    <revo-grid
                        class="planning-demo__grid"
                        [hideAttribution]="true"
                        [theme]="theme"
                        [plugins]="kanbanPlugins"
                        [source]="visibleTasks"
                        [columns]="gridColumns"
                        [kanban]="kanbanConfig"
                        (gridedit)="handlePlanningEdit($event)"
                    ></revo-grid>
                }
                @case ('scheduler') {
                    <revo-grid
                        class="planning-demo__grid planning-demo__grid--timeline"
                        [hideAttribution]="true"
                        [theme]="theme"
                        [plugins]="schedulerPlugins"
                        [source]="empty"
                        [columns]="empty"
                        [resize]="true"
                        [canMoveColumns]="false"
                        [eventScheduler]="schedulerConfig"
                        [eventSchedulerResources]="schedulerResources"
                        [eventSchedulerEvents]="schedulerEvents"
                        (gridedit)="handlePlanningEdit($event)"
                    ></revo-grid>
                }
                @case ('calendar') {
                    <revo-grid
                        class="planning-demo__grid planning-demo__grid--timeline"
                        [hideAttribution]="true"
                        [theme]="theme"
                        [plugins]="schedulerPlugins"
                        [source]="empty"
                        [columns]="empty"
                        [resize]="true"
                        [canMoveColumns]="false"
                        [eventScheduler]="calendarConfig"
                        [eventSchedulerResources]="schedulerResources"
                        [eventSchedulerEvents]="schedulerEvents"
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
    tasks = createTasks()
    filters: PlanningFilters = defaultPlanningFilters()
    selectedCount = 0
    private grid?: HTMLRevoGridElement
    readonly planningProjects = planningProjects
    readonly gridColumns = gridColumns
    readonly gridColumnTypes = gridColumnTypes
    readonly planningFilterConfig = planningFilterConfig
    readonly planningDataGridContextMenu = createPlanningDataGridContextMenu(
        (taskIds) => this.deleteSelectedTasks(taskIds)
    )
    readonly planningDataGridFormatting = planningDataGridFormatting
    readonly ganttColumns = ganttColumns
    readonly ganttConfig = ganttConfig
    readonly ganttDependencies = ganttDependencies
    readonly kanbanConfig = createKanbanConfig()
    readonly ganttResources = ganttResources
    readonly schedulerConfig = schedulerConfig
    readonly calendarConfig = calendarConfig
    readonly schedulerResources = schedulerResources
    readonly ganttPlugins = [GanttPlugin]
    readonly gridPlugins = [
        RowOrderPlugin,
        RowSelectPlugin,
        AdvanceFilterPlugin,
        DataGridFormattingPlugin,
        ColumnStretchPlugin,
        ColumnHidePlugin,
    ]
    readonly rowSelect = { rowOrder: true }
    readonly planningRowOrder = planningRowOrder
    readonly planningRowResize = planningRowResize
    readonly kanbanPlugins = [KanbanPlugin]
    readonly schedulerPlugins = [EventSchedulerPlugin]
    readonly empty: never[] = []
    get visibleTasks() {
        return filterPlanningTasks(this.tasks, this.filters)
    }
    get ganttAssignments() {
        return toGanttAssignments(this.visibleTasks)
    }
    get visibleGanttDependencies() {
        return filterGanttDependencies(ganttDependencies, this.visibleTasks)
    }
    get schedulerEvents() {
        return toSchedulerEvents(this.visibleTasks)
    }
    setQuery(event: Event) {
        this.filters = {
            ...this.filters,
            query: (event.target as HTMLInputElement).value,
        }
    }
    setProject(event: Event) {
        this.filters = {
            ...this.filters,
            projectId: (event.target as HTMLSelectElement)
                .value as PlanningFilters['projectId'],
        }
    }
    setStatus(event: Event) {
        const value = (event.target as HTMLSelectElement).value
        this.filters = { ...this.filters, statuses: value ? [value] : [] }
    }
    setPriority(event: Event) {
        const value = (event.target as HTMLSelectElement).value
        this.filters = {
            ...this.filters,
            priorities: value ? [Number(value)] : [],
        }
    }
    resetWorkspace() {
        this.tasks = createTasks()
        this.filters = defaultPlanningFilters()
        this.selectedCount = 0
    }

    selectPlanningView(view: PlanningView) {
        this.activeView = view
    }

    applyActiveTasksPreset() {
        this.filters = activePlanningFilters()
    }

    deleteSelectedTasks(taskIds: readonly string[]) {
        this.tasks = deletePlanningTasks(this.tasks, taskIds)
        this.selectedCount = 0
        void clearPlanningRowSelection(this.grid)
    }

    async handleGridEdit(event: CustomEvent) {
        const previous = this.tasks
        const next = updateFromGrid(previous, event.detail)
        this.setTasks(next)
        const grid = event.currentTarget as HTMLRevoGridElement
        const visible = (await grid.getVisibleSource()) as PlanningTask[]
        const resolved = updateFromGridSource(this.tasks, event.detail, visible)
        this.setTasks(resolved)
    }

    handleRowSelected(
        event: CustomEvent<HTMLRevoGridElementEventMap['rowselected']>
    ) {
        this.grid = event.currentTarget as HTMLRevoGridElement
        this.selectedCount = event.detail.count
    }

    handlePlanningEdit(
        event: CustomEvent<Parameters<typeof updateFromPlanningEdit>[1]>
    ) {
        this.setTasks(updateFromPlanningEdit(this.tasks, event.detail))
    }

    private setTasks(tasks: PlanningTask[]) {
        this.tasks = tasks
    }
}
