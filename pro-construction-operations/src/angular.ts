import {
  ChangeDetectorRef,
  Component,
  NO_ERRORS_SCHEMA,
  NgZone,
  OnDestroy,
  ViewEncapsulation,
  inject,
} from '@angular/core';
import { RevoGrid } from '@revolist/angular-datagrid';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import { DEFAULT_LOOK_AHEAD, DEFAULT_LOOK_AHEAD_FILTERS } from './shared/data/projections';
import { moveLookAheadPeriod } from './shared/data/updates';
import { applySchedulerTaskChanges } from './shared/scheduler/updates';
import { applyConstructionTaskChange } from './shared/services/task-change';
import {
  createConstructionGridBindings,
  type ConstructionGridBindings,
  type ConstructionGridOptions,
} from './shared/grid';
import {
  constructionProjectName,
  constructionSource,
  constructionWorkAreas,
  createConstructionWorkspaceState,
  DEPARTMENT_FILTERS,
  defaultExpandedRows,
  departmentFilterLabel,
} from './shared/state';
import { displayDate } from './shared/ui';
import type {
  ConstructionScale,
  ConstructionTask,
  ConstructionView,
  LookAheadFilters,
  LookAheadPeriod,
  ProjectDepartmentFilter,
} from './shared/types';

@Component({
  selector: 'construction-operations-grid',
  standalone: true,
  imports: [RevoGrid],
  schemas: [NO_ERRORS_SCHEMA],
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./assets/styles.scss'],
  template: `
    <section
      class="construction-fabrication construction-fabrication--{{ view }}"
      [class.construction-fabrication--dark]="isDark"
      aria-label="Construction and Fabrication Operations"
    >
      <nav class="construction-fabrication__nav" aria-label="Schedule location">
        <button class="construction-fabrication__button construction-fabrication__button--quiet" [attr.aria-pressed]="view === 'master'" type="button" (click)="showMaster()">Company Master</button>
        @if (view !== 'master') {
          <span class="construction-fabrication__crumb">›</span>
          <button class="construction-fabrication__button construction-fabrication__button--quiet" [attr.aria-pressed]="view === 'project'" type="button" (click)="showSchedule()">{{ projectName }}</button>
        }
        @if (view === 'lookahead') {
          <span class="construction-fabrication__crumb">›</span>
          <span class="construction-fabrication__crumb-current">2-week Look-Ahead</span>
        }
      </nav>

      <div class="construction-fabrication__workspace">
        <main class="construction-fabrication__main">
          @if (view !== 'master') {
            <div class="construction-fabrication__command-deck">
              <div class="construction-fabrication__view-tabs" role="tablist">
                <button class="construction-fabrication__button construction-fabrication__button--tab" [attr.aria-pressed]="view === 'project' && !resourcesOpen" type="button" (click)="showSchedule()">Schedule</button>
                <button class="construction-fabrication__button construction-fabrication__button--tab" [attr.aria-pressed]="view === 'lookahead'" type="button" (click)="showLookAhead()">Look-Ahead</button>
                <button class="construction-fabrication__button construction-fabrication__button--tab" [attr.aria-pressed]="resourcesOpen" type="button" (click)="showResources()">Resources</button>
              </div>

              <div class="construction-fabrication__command-actions">
                @if (view === 'project' && !resourcesOpen) {
                  <div class="construction-fabrication__control-group">
                    <span class="construction-fabrication__toolbar-label">Timeline</span>
                    <div class="construction-fabrication__control-set">
                      <button class="construction-fabrication__button" [attr.aria-pressed]="scale === 'day-week'" type="button" (click)="setScale('day-week')">Days</button>
                      <button class="construction-fabrication__button" [attr.aria-pressed]="scale === 'week-month'" type="button" (click)="setScale('week-month')">Weeks</button>
                      <button class="construction-fabrication__button" [attr.aria-pressed]="scale === 'month-quarter'" type="button" (click)="setScale('month-quarter')">Months</button>
                    </div>
                  </div>
                } @else {
                  <div class="construction-fabrication__period-summary">
                    <span class="construction-fabrication__period-kicker">{{ resourcesOpen ? 'Resource timeline' : 'Active window' }}</span>
                    <strong class="construction-fabrication__period">{{ formatDate(period.start) }} – {{ formatDate(period.end) }}</strong>
                  </div>
                  <div class="construction-fabrication__control-set">
                    <button class="construction-fabrication__button construction-fabrication__button--icon-only" aria-label="Previous 14 days" title="Previous 14 days" type="button" (click)="movePeriod(-1)">‹</button>
                    <button class="construction-fabrication__button construction-fabrication__button--icon-only" aria-label="Reset to the featured window" title="Reset to the featured window" type="button" (click)="resetPeriod()">↺</button>
                    <button class="construction-fabrication__button construction-fabrication__button--icon-only" aria-label="Next 14 days" title="Next 14 days" type="button" (click)="movePeriod(1)">›</button>
                  </div>
                }

                @if (!resourcesOpen) {
                  <button class="construction-fabrication__button construction-fabrication__button--quiet" [attr.aria-pressed]="filtersOpen" type="button" (click)="filtersOpen = !filtersOpen">Filter</button>
                  @if (filtersOpen) {
                    <div class="construction-fabrication__filter-popover construction-fabrication__filter-popover--bound" role="dialog" aria-label="Schedule filters">
                      <div class="construction-fabrication__filter-header">
                        <strong class="construction-fabrication__filter-title">Filters</strong>
                        <button class="construction-fabrication__button construction-fabrication__button--quiet" type="button" (click)="resetFilters()">Reset</button>
                      </div>
                      <div class="construction-fabrication__filter-body">
                        <div class="construction-fabrication__control-group">
                          <span class="construction-fabrication__toolbar-label">Department</span>
                          <div class="construction-fabrication__control-set">
                            @for (department of departments; track department) {
                              <button class="construction-fabrication__button" [attr.aria-pressed]="activeDepartment === department" type="button" (click)="updateDepartment(department)">{{ departmentLabel(department) }}</button>
                            }
                          </div>
                        </div>
                        @if (view === 'lookahead') {
                          <label class="construction-fabrication__control-group">
                            <span class="construction-fabrication__toolbar-label">Work area</span>
                            <select class="construction-fabrication__select" [value]="filters.workArea" (change)="updateWorkArea($event)">
                              <option value="all">All work areas</option>
                              @for (area of workAreas; track area) { <option [value]="area">{{ area }}</option> }
                            </select>
                          </label>
                        }
                      </div>
                    </div>
                  }
                }
              </div>
            </div>
          }

          @if (resourcesOpen) {
            <revo-grid
              #grid
              class="construction-fabrication__grid skip-style cell-border"
              [theme]="gridBindings.theme"
              [hideAttribution]="true"
              [readonly]="false"
              [range]="true"
              [resize]="true"
              [rowSize]="32"
              [autoSizeColumn]="false"
              [filter]="gridBindings.filter"
              [plugins]="gridBindings.plugins"
              [columns]="gridBindings.columns"
              [source]="gridBindings.source"
              [eventScheduler]="gridBindings.eventScheduler"
              [eventSchedulerResources]="gridBindings.eventSchedulerResources"
              [eventSchedulerEvents]="gridBindings.eventSchedulerEvents"
              (event-scheduler-event-changed)="handleSchedulerChange($event)"
            ></revo-grid>
          } @else {
            <revo-grid
              #grid
              class="construction-fabrication__grid skip-style cell-border"
              [theme]="gridBindings.theme"
              [hideAttribution]="true"
              [readonly]="false"
              [range]="true"
              [resize]="true"
              [rowSize]="32"
              [autoSizeColumn]="false"
              [filter]="gridBindings.filter"
              [plugins]="gridBindings.plugins"
              [tree]="gridBindings.tree"
              [rowHeaders]="gridBindings.rowHeaders"
              [rowOrder]="gridBindings.rowOrder"
              [columns]="gridBindings.columns"
              [gantt]="gridBindings.gantt"
              [ganttResources]="gridBindings.ganttResources"
              [ganttAssignments]="gridBindings.ganttAssignments"
              [ganttCalendars]="gridBindings.ganttCalendars"
              [ganttDependencies]="gridBindings.ganttDependencies"
              [trimmedRows]="gridBindings.trimmedRows"
              [source]="gridBindings.source"
              (tree-state-changed)="handleTreeState($event)"
              (gantt-before-task-change)="handleTaskChange($event)"
            ></revo-grid>
          }
        </main>
      </div>
    </section>
  `,
})
export class ConstructionFabricationGanttComponent implements OnDestroy {
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);
  private readonly initial = createConstructionWorkspaceState();
  private activeSource = constructionSource(this.initial);
  private readonly disconnectTheme = observeCurrentTheme((dark) => this.zone.run(() => {
    this.isDark = dark;
    this.changeDetector.markForCheck();
  }));

  readonly departments = DEPARTMENT_FILTERS;
  readonly departmentLabel = departmentFilterLabel;
  readonly formatDate = displayDate;
  view: ConstructionView = this.initial.view;
  selectedProject = this.initial.selectedProject;
  period: LookAheadPeriod = this.initial.period;
  filters: LookAheadFilters = this.initial.filters;
  projectDepartment: ProjectDepartmentFilter = 'all';
  scale: ConstructionScale = 'day-week';
  tasks: ConstructionTask[] = this.initial.tasks;
  expandedRowIds = this.initial.expandedRowIds;
  resourcesOpen = false;
  filtersOpen = false;
  isDark = currentTheme().isDark();
  gridBindings!: ConstructionGridBindings;

  constructor() {
    this.refreshBindings();
  }

  get projectName() { return constructionProjectName(this.selectedProject); }
  get activeDepartment() { return this.view === 'lookahead' ? this.filters.department : this.projectDepartment; }
  get workAreas() { return constructionWorkAreas(this.state); }
  private get state() {
    return {
      view: this.view,
      selectedProject: this.selectedProject,
      period: this.period,
      filters: this.filters,
      projectDepartment: this.projectDepartment,
      scale: this.scale,
      tasks: this.tasks,
      expandedRowIds: this.expandedRowIds,
      resourcesOpen: this.resourcesOpen,
    };
  }

  ngOnDestroy() { this.disconnectTheme(); }

  openProject = (projectRef: string) => this.zone.run(() => {
    this.selectedProject = projectRef;
    this.showSchedule();
  });
  private expandedFor(view: ConstructionView) {
    const nextState = { ...this.state, view, resourcesOpen: false };
    return defaultExpandedRows(view, this.selectedProject, constructionSource(nextState));
  }
  showMaster() { this.expandedRowIds = new Set(); this.view = 'master'; this.resourcesOpen = false; this.filtersOpen = false; this.commit(); }
  showSchedule() { this.expandedRowIds = this.expandedFor('project'); this.view = 'project'; this.resourcesOpen = false; this.filtersOpen = false; this.commit(); }
  showLookAhead() { this.expandedRowIds = this.expandedFor('lookahead'); this.view = 'lookahead'; this.resourcesOpen = false; this.filtersOpen = false; this.commit(); }
  showResources() { this.view = 'project'; this.resourcesOpen = true; this.filtersOpen = false; this.commit(); }
  setScale(scale: ConstructionScale) { this.scale = scale; this.commit(false); }
  movePeriod(direction: -1 | 1) { this.period = moveLookAheadPeriod(this.period, direction); this.commit(); }
  resetPeriod() { this.period = { ...DEFAULT_LOOK_AHEAD }; this.commit(); }
  resetFilters() {
    if (this.view === 'lookahead') this.filters = { ...DEFAULT_LOOK_AHEAD_FILTERS };
    else this.projectDepartment = 'all';
    this.commit();
  }
  updateDepartment(department: typeof DEPARTMENT_FILTERS[number]) {
    if (this.view === 'lookahead') this.filters = { ...this.filters, department };
    else this.projectDepartment = department;
    this.commit(this.view === 'lookahead');
  }
  updateWorkArea(event: Event) {
    this.filters = { ...this.filters, workArea: (event.target as HTMLSelectElement).value };
    this.commit();
  }
  handleTreeState(event: CustomEvent<{ expandedRowIds: Set<string> }>) {
    this.expandedRowIds = new Set(event.detail.expandedRowIds);
    this.refreshBindings();
  }
  handleTaskChange(event: CustomEvent) {
    const result = applyConstructionTaskChange(event.detail, this.tasks, this.view === 'master');
    if (!result.accepted) {
      event.preventDefault();
      return;
    }
    this.tasks = result.tasks;
    if (result.refreshProjection) this.commit();
    else this.changeDetector.detectChanges();
  }
  handleSchedulerChange(event: CustomEvent) {
    this.tasks = applySchedulerTaskChanges(this.tasks, event.detail);
    this.commit();
  }

  private refreshBindings() {
    const options: ConstructionGridOptions = {
      ...this.state,
      projectName: this.projectName,
      sourceForView: () => this.activeSource,
      openProject: this.openProject,
      setTasks: (tasks) => { this.tasks = tasks; },
      setExpandedRowIds: (ids) => { this.expandedRowIds = ids; },
    };
    this.gridBindings = createConstructionGridBindings(options);
  }
  private commit(refreshProjection = true) {
    if (refreshProjection) this.activeSource = constructionSource(this.state);
    this.refreshBindings();
    this.changeDetector.detectChanges();
  }
}
