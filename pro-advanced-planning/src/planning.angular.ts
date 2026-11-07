import searchIconSvg from '@fortawesome/fontawesome-free/svgs/solid/magnifying-glass.svg?raw'
import '@revolist/ui/styles.css';
import { UiComponent, UiSlotDirective } from '@revolist/ui/angular';
import { UiControlDirective } from '@revolist/ui/angular-control';
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
    type PlanningEditDetail,
    type PlanningFilters,
    type PlanningView,
    updateFromGanttDependencies,
} from './data'

@Component({
    selector: 'planning-views-grid',
    standalone: true,
    schemas: [NO_ERRORS_SCHEMA],
    imports: [UiComponent, UiSlotDirective, UiControlDirective, RevoGrid],
    encapsulation: ViewEncapsulation.None,
    styleUrls: ['./planning.scss'],
    template: `
        <section class="planning-demo" [attr.data-theme]="theme === 'darkCompact' ? 'dark' : 'light'">
            <nav
                class="planning-demo__switch rv-segmented-switch"
                role="tablist"
                aria-label="Planning view"
            >
                <button rvControl [class.on]="activeView === 'grid'"
                    type="button"
                    class="rv-segmented-switch-item rv-segmented-switch-item"
                    role="tab"
                    [class.on]="activeView === 'grid'"
                    [attr.aria-selected]="activeView === 'grid'"
                    (click)="selectPlanningView('grid')"
                >
                    Grid
                </button>
                <button rvControl [class.on]="activeView === 'kanban'"
                    type="button"
                    class="rv-segmented-switch-item rv-segmented-switch-item"
                    role="tab"
                    [class.on]="activeView === 'kanban'"
                    [attr.aria-selected]="activeView === 'kanban'"
                    (click)="selectPlanningView('kanban')"
                >
                    Kanban
                </button>
                <button rvControl [class.on]="activeView === 'gantt'"
                    type="button"
                    class="rv-segmented-switch-item rv-segmented-switch-item"
                    role="tab"
                    [class.on]="activeView === 'gantt'"
                    [attr.aria-selected]="activeView === 'gantt'"
                    (click)="selectPlanningView('gantt')"
                >
                    Gantt
                </button>
                <button rvControl [class.on]="activeView === 'scheduler'"
                    type="button"
                    class="rv-segmented-switch-item rv-segmented-switch-item"
                    role="tab"
                    [class.on]="activeView === 'scheduler'"
                    [attr.aria-selected]="activeView === 'scheduler'"
                    (click)="selectPlanningView('scheduler')"
                >
                    Scheduler
                </button>
                <button rvControl [class.on]="activeView === 'calendar'"
                    type="button"
                    class="rv-segmented-switch-item rv-segmented-switch-item"
                    role="tab"
                    [class.on]="activeView === 'calendar'"
                    [attr.aria-selected]="activeView === 'calendar'"
                    (click)="selectPlanningView('calendar')"
                >
                    Calendar
                </button>
            </nav>

            <div class="planning-demo__toolbar" role="group" aria-label="Task filters">
                <rv-ui component="SearchInput"
                    [props]="{ rootClassName: 'planning-demo__search', 'aria-label': 'Search tasks', placeholder: 'Search tasks…', value: filters.query }"
                    (valueChange)="setQuery($event)">
                    <ng-template rvUiSlot="icon"><img [src]="searchIcon" alt="" /></ng-template>
                </rv-ui>
                <div class="planning-demo__filters">
                    <span class="planning-demo__filter">
                        <rv-ui component="Dropdown" [props]="{ ...planningFilterDropdowns.project, className: 'rv-select', value: filters.projectId }" (valueChange)="setProject($event)" />
                    </span>
                    @if (activeView === 'kanban') {
                        <span class="planning-demo__filter">
                            <rv-ui component="Dropdown" [props]="{ ...planningFilterDropdowns.status, className: 'rv-select', value: filters.statuses.length > 1 ? 'active' : filters.statuses[0] || '' }" (valueChange)="setStatus($event)" />
                        </span>
                        <span class="planning-demo__filter">
                            <rv-ui component="Dropdown" [props]="{ ...planningFilterDropdowns.priority, className: 'rv-select', value: filters.priorities[0]?.toString() ?? '' }" (valueChange)="setPriority($event)" />
                        </span>
                    }
                </div>
                <button rvControl class="rv-choice-chip planning-demo__active"
                    type="button"
                    [class.on]="isActiveTasksPreset"
                    [attr.aria-pressed]="isActiveTasksPreset"
                    (click)="applyActiveTasksPreset()"
                >
                    Active tasks
                </button>
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
                        [source]="ganttSource"
                        [columns]="ganttColumns"
                        [rowSize]="40"
                        [rowOrder]="false"
                        [gantt]="ganttConfig"
                        [ganttTaskEditorDialog]="ganttTaskEditorDialog"
                        [ganttDependencies]="visibleGanttDependencies"
                        [ganttResources]="ganttResources"
                        [ganttAssignments]="ganttAssignments"
                        [filter]="ganttFilterConfig"
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
    readonly planningFilterDropdowns = planningFilterDropdowns
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
    readonly planningDataGridContextMenu = createPlanningDataGridContextMenu(
        (taskIds) => this.deleteSelectedTasks(taskIds)
    )
    readonly planningDataGridFormatting = planningDataGridFormatting
    readonly ganttColumns = ganttColumns
    readonly ganttConfig = ganttConfig
    readonly ganttTaskEditorDialog = ganttTaskEditorDialog
    ganttDependencyState = [...ganttDependencies]
    readonly kanbanConfig = createKanbanConfig()
    readonly ganttResources = ganttResources
    readonly schedulerConfig = schedulerConfig
    readonly calendarConfig = calendarConfig
    readonly schedulerResources = schedulerResources
    readonly ganttPlugins = [GanttPlugin, AdvanceFilterPlugin]
    readonly gridPlugins = [
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
    readonly rowSelect = { rowOrder: true }
    readonly planningRowOrder = planningRowOrder
    readonly kanbanPlugins = [KanbanPlugin, AdvanceFilterPlugin]
    readonly schedulerPlugins = [EventSchedulerPlugin]
    readonly empty: never[] = []
    ganttAssignments = toGanttAssignments(this.tasks)
    ganttSource = toPlanningGanttSource(this.tasks)
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
        this.ganttSource = toPlanningGanttSource(this.tasks)
        this.visibleGanttDependencies = filterGanttDependencies(
            this.ganttDependencyState,
            this.tasks
        )
    }
    readonly searchIcon = `data:image/svg+xml,${encodeURIComponent(searchIconSvg)}`

    setQuery(value: unknown) {
        this.filters = {
            ...this.filters,
            query: String(value),
        }
        this.applyToolbarFilters()
    }
    setProject(value: unknown) {
        this.filters = {
            ...this.filters,
            projectId: value as PlanningFilters['projectId'],
        }
        this.applyToolbarFilters()
    }
    setStatus(value: unknown) {
        this.filters = { ...this.filters, statuses: value ? [String(value)] : [] }
        this.applyToolbarFilters()
    }
    setPriority(value: unknown) {
        this.filters = { ...this.filters, priorities: value ? [Number(value)] : [] }
        this.applyToolbarFilters()
    }
    selectPlanningView(view: PlanningView) {
        if (view === this.activeView) return
        this.refreshViewSnapshot()
        this.activeView = view
    }

    applyActiveTasksPreset() {
        this.isActiveTasksPreset = !this.isActiveTasksPreset
        this.filters = this.isActiveTasksPreset ? activePlanningFilters() : defaultPlanningFilters()
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
