import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RevoGrid } from '@revolist/angular-datagrid';
import type { ColumnProp } from '@revolist/revogrid';
import { currentTheme } from '../../composables/useRandomData';
import {
  createProjectColumns,
  createProjectColumnAddPopupConfig,
  createProjectContextMenus,
  createProjectGrouping,
  createProjectRows,
  createProjectTaskDraft,
  createProjectTaskFromDraft,
  applyProjectBulkAction,
  applyProjectSort,
  clearProjectSelection,
  formatProjectBudget,
  getProjectFilterOptions,
  getProjectHideableColumns,
  getSelectedProjectIndexes,
  getProjectSummary,
  projectFilterConfig,
  projectGridPreset,
  projectPlugins,
  openProjectStatusHeaderFilter,
  projectOwnerProfiles,
  resolveProjectSortValueFromConfig,
  projectSkillOptions,
  syncProjectCellEdit,
  tagTone,
  updateProjectCollapsedGroups,
  defineProjectTrackerToolbarElement,
  type ProjectBulkAction,
  type ProjectGroupProp,
  type ProjectRow,
  type ProjectSortValue,
  type ProjectTaskDraft,
  type ProjectTrackerToolbarActionEvent,
  type ProjectTrackerToolbarState,
} from './project-tracker.shared';

defineProjectTrackerToolbarElement();

@Component({
  selector: 'color-grid',
  standalone: true,
  imports: [RevoGrid, CommonModule, FormsModule],
  host: { class: 'project-grid-host' },
  template: `
    <div class="project-grid-shell">
      <div class="project-grid-summary" aria-label="Project summary">
        <span class="project-grid-stat">
          <span>Projects</span>
          <span>{{ summary.total }}</span>
        </span>
        <span class="project-grid-stat">
          <span>In progress</span>
          <span>{{ summary.inProgress }}</span>
        </span>
        <span class="project-grid-stat">
          <span>Ready</span>
          <span>{{ summary.complete }}</span>
        </span>
        <span class="project-grid-stat">
          <span>Blocked</span>
          <span>{{ summary.blocked }}</span>
        </span>
        <span class="project-grid-stat">
          <span>Budget</span>
          <span>{{ formatProjectBudget(summary.budget) }}</span>
        </span>
      </div>
      <project-tracker-toolbar
        [state]="toolbarState"
        (project-tracker-toolbar-action)="handleToolbarAction($event)"
      ></project-tracker-toolbar>

      <revo-grid
        #gridRef
        class="project-tracker-grid skip-style color-grid cell-border"
        [theme]="theme"
        [columns]="columns"
        [source]="projectRows"
        [grouping]="grouping"
        [gridPreset]="gridPreset"
        [plugins]="plugins"
        stretch="last"
        [filter]="filterConfig"
        [hideColumns]="hiddenColumns"
        [columnAddPopup]="additionalData.columnAddPopup"
        [additionalData]="additionalData"
        [rowContextMenu]="rowContextMenu"
        [columnContextMenu]="columnContextMenu"
        [rowSize]="44"
        [resize]="true"
        [hideAttribution]="true"
        (toggleHideColumn)="toggleHideColumn($event)"
        (celleditapply)="handleCellEditApply($event)"
        (sortingconfigchanged)="handleSortingConfigChanged($event)"
        (rowselected)="handleRowSelected($event)"
        (groupexpandclick)="handleGroupExpandClick($event)"
      ></revo-grid>

      <div *ngIf="isTaskModalOpen" class="project-modal-backdrop" (mousedown)="closeOnBackdrop($event)">
        <form class="project-modal" (ngSubmit)="addTask()">
          <div class="project-modal__header">
            <div>
              <p>New project</p>
              <h2>Pipeline details</h2>
            </div>
            <button type="button" class="project-modal__close" aria-label="Close task dialog" (click)="closeTaskModal()">×</button>
          </div>

          <label class="project-modal__field project-modal__field--wide">
            <span>Project</span>
            <input [(ngModel)]="taskDraft.task" name="task" required placeholder="Describe the project" />
          </label>
          <label class="project-modal__field project-modal__field--wide">
            <span>AI summary</span>
            <input [(ngModel)]="taskDraft.summary" name="summary" required placeholder="Short project summary" />
          </label>

          <div class="project-modal__grid">
            <label class="project-modal__field">
              <span>Owner</span>
              <span class="project-modal-select">
                <span class="project-modal-select__preview">
                  <span class="project-modal-owner">
                    <span class="avatar-cell project-avatar" [ngClass]="ownerAvatarClass(taskDraft.owner)">{{ taskDraft.owner.slice(0, 1) }}</span>
                    <span class="project-modal-select__text">{{ ownerLabel(taskDraft.owner) }}</span>
                  </span>
                </span>
                <select class="project-modal-select__native" [(ngModel)]="taskDraft.owner" name="owner">
                  <option *ngFor="let owner of options.owners" [value]="owner">{{ owner }}</option>
                </select>
              </span>
            </label>
            <fieldset class="project-modal__field project-modal__field--wide project-modal__checks">
              <legend>Skills</legend>
              <div>
                <label *ngFor="let skill of options.skills">
                  <input
                    type="checkbox"
                    [checked]="taskDraft.skills.includes(skill)"
                    (change)="toggleDraftSkill(skill, $any($event.target).checked)"
                  />
                  <span class="project-modal-skill" [ngClass]="skillClass(skill)">{{ skill }}</span>
                </label>
              </div>
            </fieldset>
            <label class="project-modal__field">
              <span>Priority</span>
              <span class="project-modal-select">
                <span class="project-modal-select__preview">
                  <span class="project-modal-block" [ngClass]="blockClass(taskDraft.priority)">{{ taskDraft.priority }}</span>
                </span>
                <select class="project-modal-select__native" [(ngModel)]="taskDraft.priority" name="priority">
                  <option *ngFor="let priority of options.priorities" [value]="priority">{{ priority }}</option>
                </select>
              </span>
            </label>
            <label class="project-modal__field">
              <span>Risk</span>
              <span class="project-modal-select">
                <span class="project-modal-select__preview">
                  <span class="project-modal-block" [ngClass]="blockClass(taskDraft.risk)">{{ taskDraft.risk }}</span>
                </span>
                <select class="project-modal-select__native" [(ngModel)]="taskDraft.risk" name="risk">
                  <option *ngFor="let risk of options.risks" [value]="risk">{{ risk }}</option>
                </select>
              </span>
            </label>
            <label class="project-modal__field">
              <span>Status</span>
              <span class="project-modal-select">
                <span class="project-modal-select__preview">
                  <span class="project-modal-block" [ngClass]="blockClass(taskDraft.status)">{{ taskDraft.status }}</span>
                </span>
                <select class="project-modal-select__native" [(ngModel)]="taskDraft.status" name="status">
                  <option *ngFor="let status of options.statuses" [value]="status">{{ status }}</option>
                </select>
              </span>
            </label>
            <label class="project-modal__field">
              <span>Department</span>
              <span class="project-modal-select">
                <span class="project-modal-select__preview">
                  <span class="project-modal-pill" [ngClass]="departmentClass(taskDraft.department)">{{ taskDraft.department }}</span>
                </span>
                <select class="project-modal-select__native" [(ngModel)]="taskDraft.department" name="department">
                  <option *ngFor="let department of options.departments" [value]="department">{{ department }}</option>
                </select>
              </span>
            </label>
            <label class="project-modal__field">
              <span>Progress</span>
              <input [(ngModel)]="taskDraft.progress" name="progress" type="number" min="0" max="100" />
            </label>
            <label class="project-modal__field">
              <span>Start</span>
              <input [(ngModel)]="taskDraft.from" name="from" type="date" />
            </label>
            <label class="project-modal__field">
              <span>End</span>
              <input [(ngModel)]="taskDraft.to" name="to" type="date" />
            </label>
            <label class="project-modal__field">
              <span>Budget</span>
              <input [(ngModel)]="taskDraft.budget" name="budget" type="number" min="0" step="1000" />
            </label>
            <label class="project-modal__field">
              <span>Rating</span>
              <input [(ngModel)]="taskDraft.rating" name="rating" type="number" min="0" max="5" step="1" />
            </label>
            <label class="project-modal__field">
              <span>Section</span>
              <span class="project-modal-select">
                <span class="project-modal-select__preview">
                  <span class="project-modal-section" [style.--project-modal-section-color]="sectionColor(taskDraft.section)">
                    <span class="project-modal-section__dot"></span>
                    <span class="project-modal-select__text">{{ taskDraft.section }}</span>
                  </span>
                </span>
                <select class="project-modal-select__native" [(ngModel)]="taskDraft.section" name="section">
                  <option *ngFor="let section of options.sections" [value]="section">{{ section }}</option>
                </select>
              </span>
            </label>
          </div>

          <div class="project-modal__footer">
            <button type="button" (click)="closeTaskModal()">Cancel</button>
            <button type="submit" class="project-grid-primary">Create project</button>
          </div>
        </form>
      </div>
    </div>
  `,
  styleUrls: ['./project-tracker.scss'],
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ColorGridComponent {
  @ViewChild('gridRef', { static: true }) gridRef!: ElementRef<HTMLRevoGridElement>;

  theme = currentTheme().isDark() ? 'darkMaterial' : 'material';
  columns = createProjectColumns();
  gridPreset = projectGridPreset;
  plugins = projectPlugins;
  filterConfig = projectFilterConfig;
  projectRows: ProjectRow[] = createProjectRows();
  options = getProjectFilterOptions(this.projectRows);
  summary = getProjectSummary(this.projectRows);
  groupBy: ProjectGroupProp = 'section';
  groupsExpanded = true;
  collapsedGroups = new Set<string>();
  grouping = createProjectGrouping(() => this.projectRows, this.groupBy, this.groupsExpanded, this.collapsedGroups);
  sortBy: ProjectSortValue = '';
  hiddenColumns: ColumnProp[] = [];
  selectedIndexes = new Set<number>();
  selectedRowsCount = 0;
  toolbarState: ProjectTrackerToolbarState = this.createToolbarState();
  isTaskModalOpen = false;
  taskDraft: ProjectTaskDraft = createProjectTaskDraft();
  formatProjectBudget = formatProjectBudget;
  projectOwnerProfiles = projectOwnerProfiles;
  contextMenus = createProjectContextMenus({
    getRows: () => this.projectRows,
    setRows: (rows) => {
      this.projectRows = rows;
      this.refreshVisibleRows();
    },
    getColumns: () => this.columns,
    setColumns: (columns) => {
      this.columns = columns as typeof this.columns;
      this.syncToolbarState();
    },
    getHiddenColumns: () => this.hiddenColumns,
    setHiddenColumns: (columns) => {
      this.hiddenColumns = columns;
      if (this.gridRef?.nativeElement) {
        (this.gridRef.nativeElement as any).hideColumns = columns;
      }
      this.syncToolbarState();
    },
    getGrid: () => this.gridRef?.nativeElement,
    getSelectedIndexes: () => this.selectedIndexes,
    getGroupBy: () => this.groupBy,
    clearSelection: () => this.resetSelection(),
    setSortBy: (value) => {
      this.sortBy = value;
      this.syncToolbarState();
    },
  });
  rowContextMenu = this.contextMenus.rowContextMenu;
  columnContextMenu = this.contextMenus.columnContextMenu;
  additionalData = {
    columnAddPopup: createProjectColumnAddPopupConfig({
      getRows: () => this.projectRows,
      setRows: (rows) => {
        this.projectRows = rows;
        this.refreshVisibleRows();
      },
      getColumns: () => this.columns,
      setColumns: (columns) => {
        this.columns = columns as typeof this.columns;
        this.syncToolbarState();
      },
      getHiddenColumns: () => this.hiddenColumns,
      setHiddenColumns: (columns) => {
        this.hiddenColumns = columns;
        if (this.gridRef?.nativeElement) {
          (this.gridRef.nativeElement as any).hideColumns = columns;
        }
        this.syncToolbarState();
      },
      getGrid: () => this.gridRef?.nativeElement,
      getSelectedIndexes: () => this.selectedIndexes,
      clearSelection: () => this.resetSelection(),
      setSortBy: (value) => {
        this.sortBy = value;
        this.syncToolbarState();
      },
    }),
  };

  constructor() {
    this.refreshVisibleRows();
  }

  refreshVisibleRows() {
    this.options = getProjectFilterOptions(this.projectRows);
    this.summary = getProjectSummary(this.projectRows);
    this.grouping = createProjectGrouping(() => this.projectRows, this.groupBy, this.groupsExpanded, this.collapsedGroups);
    this.syncToolbarState();
  }

  createToolbarState(): ProjectTrackerToolbarState {
    return {
      totalRows: this.projectRows.length,
      selectedRowsCount: this.selectedRowsCount,
      groupBy: this.groupBy,
      groupsExpanded: this.groupsExpanded,
      sortBy: this.sortBy,
      hiddenColumns: this.hiddenColumns,
      hideableColumns: getProjectHideableColumns(this.columns),
    };
  }

  syncToolbarState() {
    this.toolbarState = this.createToolbarState();
  }

  openTaskModal() {
    this.taskDraft = createProjectTaskDraft();
    this.isTaskModalOpen = true;
  }

  closeTaskModal() {
    this.isTaskModalOpen = false;
  }

  closeOnBackdrop(event: MouseEvent) {
    if (event.target === event.currentTarget) this.closeTaskModal();
  }

  addTask() {
    this.projectRows = [createProjectTaskFromDraft(this.taskDraft), ...this.projectRows];
    this.refreshVisibleRows();
    this.closeTaskModal();
  }

  toggleDraftSkill(skill: string, checked: boolean) {
    const next = checked
      ? Array.from(new Set([...this.taskDraft.skills, skill]))
      : this.taskDraft.skills.filter((item) => item !== skill);
    this.taskDraft = { ...this.taskDraft, skills: next.length ? next : this.taskDraft.skills };
  }

  ownerLabel(value: string) {
    return projectOwnerProfiles.find((owner) => owner.value === value)?.label ?? value;
  }

  ownerAvatarClass(value: string) {
    const index = Math.max(0, projectOwnerProfiles.findIndex((owner) => owner.value === value));
    return `avatar-cell--${index % 8}`;
  }

  skillClass(value: string) {
    return `project-skill--${projectSkillOptions.find((skill) => skill.value === value)?.tone ?? tagTone(value)}`;
  }

  departmentClass(value: string) {
    return `project-filter-department--${tagTone(value)}`;
  }

  blockClass(value: string) {
    return `project-filter-block--${this.blockTone(value)}`;
  }

  blockTone(value: string) {
    const normalized = value.toLowerCase();
    if (normalized.includes('blocked') || normalized.includes('high')) return 'red';
    if (normalized.includes('review') || normalized.includes('medium')) return 'orange';
    if (normalized.includes('ready') || normalized.includes('low')) return 'green';
    if (normalized.includes('new')) return 'blue';
    return 'violet';
  }

  sectionColor(value: string) {
    const normalized = value.toLowerCase();
    if (normalized.includes('review')) return '#ff8b00';
    if (normalized.includes('ready')) return '#00c875';
    if (normalized.includes('blocked')) return '#ff4d5e';
    return '#1f7aff';
  }

  changeGroup(value: ProjectGroupProp) {
    this.groupBy = value;
    if (this.groupBy) this.groupsExpanded = true;
    this.collapsedGroups = new Set();
    this.grouping = createProjectGrouping(() => this.projectRows, this.groupBy, this.groupsExpanded, this.collapsedGroups);
    this.syncToolbarState();
  }

  toggleGroups() {
    if (!this.groupBy) return;
    this.groupsExpanded = !this.groupsExpanded;
    this.collapsedGroups = new Set();
    this.grouping = createProjectGrouping(() => this.projectRows, this.groupBy, this.groupsExpanded, this.collapsedGroups);
    this.syncToolbarState();
  }

  changeSort(value: ProjectSortValue) {
    this.sortBy = value;
    this.syncToolbarState();
    void applyProjectSort(this.gridRef?.nativeElement, this.columns, this.sortBy);
  }

  openStatusFilter() {
    openProjectStatusHeaderFilter(this.gridRef?.nativeElement);
  }

  resetSelection() {
    clearProjectSelection(this.gridRef?.nativeElement);
    this.selectedIndexes = new Set();
    this.selectedRowsCount = 0;
    this.syncToolbarState();
  }

  runBulkAction(action: ProjectBulkAction) {
    if (!this.selectedIndexes.size) return;
    this.projectRows = applyProjectBulkAction(this.projectRows, this.selectedIndexes, action, this.groupBy);
    this.resetSelection();
    this.refreshVisibleRows();
  }

  handleRowSelected(event: CustomEvent<HTMLRevoGridElementEventMap['rowselected']>) {
    this.selectedIndexes = getSelectedProjectIndexes(event);
    this.selectedRowsCount = event.detail.count;
    this.syncToolbarState();
  }

  handleCellEditApply(event: CustomEvent) {
    this.projectRows = syncProjectCellEdit(this.projectRows, event.detail);
    this.refreshVisibleRows();
  }

  handleSortingConfigChanged(event: CustomEvent<unknown>) {
    this.sortBy = resolveProjectSortValueFromConfig(event.detail);
    this.syncToolbarState();
  }

  handleGroupExpandClick(event: CustomEvent<{ model?: Record<string, unknown> }>) {
    queueMicrotask(() => {
      this.collapsedGroups = new Set(updateProjectCollapsedGroups(event, this.collapsedGroups));
      this.groupsExpanded = this.collapsedGroups.size === 0;
      this.grouping = createProjectGrouping(() => this.projectRows, this.groupBy, this.groupsExpanded, this.collapsedGroups);
      this.syncToolbarState();
    });
  }

  toggleHiddenColumn(prop: ColumnProp, visible: boolean) {
    this.hiddenColumns = visible
      ? this.hiddenColumns.filter((column) => column !== prop)
      : Array.from(new Set([...this.hiddenColumns, prop]));
    (this.gridRef.nativeElement as any).hideColumns = this.hiddenColumns;
    this.syncToolbarState();
  }

  toggleHideColumn(event: CustomEvent<ColumnProp[]>) {
    this.hiddenColumns = [...event.detail];
    (this.gridRef.nativeElement as any).hideColumns = this.hiddenColumns;
    this.syncToolbarState();
  }

  handleToolbarAction(event: ProjectTrackerToolbarActionEvent) {
    const detail = event.detail;
    if (detail.action === 'new') {
      this.openTaskModal();
      return;
    }
    if (detail.action === 'filter') {
      this.openStatusFilter();
      return;
    }
    if (detail.action === 'toggleGroups') {
      this.toggleGroups();
      return;
    }
    if (detail.action === 'group') {
      this.changeGroup(detail.value);
      return;
    }
    if (detail.action === 'sort') {
      this.changeSort(detail.value);
      return;
    }
    if (detail.action === 'bulk') {
      this.runBulkAction(detail.value);
      return;
    }
    if (detail.action === 'hideColumn') {
      this.toggleHiddenColumn(detail.prop, detail.visible);
    }
  }
}
