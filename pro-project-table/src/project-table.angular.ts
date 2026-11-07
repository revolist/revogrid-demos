import '@revolist/ui/styles.css';
import { UiControlDirective } from '@revolist/ui/angular-control';
import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, ViewChild, ViewEncapsulation } from '@angular/core';
import type { OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RevoGrid } from '@revolist/angular-datagrid';
import type { ColumnProp } from '@revolist/revogrid';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import {
  createProjectColumns,
  createProjectColumnTypes,
  createProjectColumnAddPopupConfig,
  createProjectContextMenus,
  createProjectGrouping,
  createProjectRows,
  createProjectTaskDraft,
  createProjectTaskFromDraft,
  applyProjectBulkAction,
  applyProjectSort,
  clearProjectSelection,
  getProjectFilterOptions,
  getProjectHideableColumns,
  getSelectedProjectIndexes,
  projectFilterConfig,
  projectPlugins,
  projectRowOrder,
  projectRowSelect,
  openProjectStatusHeaderFilter,
  projectOwnerProfiles,
  resolveProjectSortValueFromConfig,
  syncProjectCellEdit,
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
  imports: [UiControlDirective, RevoGrid, CommonModule, FormsModule],
  host: { class: 'project-grid-host' },
  template: `
    <div class="project-grid-shell">
      <project-tracker-toolbar
        [state]="toolbarState"
        (project-tracker-toolbar-action)="handleToolbarAction($event)"
      ></project-tracker-toolbar>

      <revo-grid
        #gridRef
        class="project-tracker-grid skip-style color-grid cell-border"
        [theme]="theme"
        [canMoveColumns]="true"
        [columns]="columns"
        [columnTypes]="columnTypes"
        [source]="projectRows"
        [grouping]="grouping"
        [plugins]="plugins"
        [rowOrder]="projectRowOrder"
        [rowSelect]="projectRowSelect"
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
            <button rvControl type="button" class="project-modal__close" aria-label="Close task dialog" (click)="closeTaskModal()">×</button>
          </div>

          <label class="project-modal__field project-modal__field--wide">
            <span>Project</span>
            <input rvControl [(ngModel)]="taskDraft.task" name="task" required placeholder="Describe the project" />
          </label>
          <label class="project-modal__field project-modal__field--wide">
            <span>AI summary</span>
            <input rvControl [(ngModel)]="taskDraft.summary" name="summary" required placeholder="Short project summary" />
          </label>

          <div class="project-modal__grid">
            <label class="project-modal__field">
              <span>Owner</span>
              <span class="project-modal-select">

                <select rvControl class="project-modal-select__native" [(ngModel)]="taskDraft.owner" name="owner">
                  <option *ngFor="let owner of options.owners" [value]="owner">{{ ownerLabel(owner) }}</option>
                </select>
              </span>
            </label>
            <fieldset class="project-modal__field project-modal__field--wide project-modal__checks">
              <legend>Skills</legend>
              <div>
                <label *ngFor="let skill of options.skills">
                  <input rvControl
                    type="checkbox"
                    [checked]="taskDraft.skills.includes(skill)"
                    (change)="toggleDraftSkill(skill, $event)"
                  />
                  <span>{{ skill }}</span>
                </label>
              </div>
            </fieldset>
            <label class="project-modal__field">
              <span>Priority</span>
              <span class="project-modal-select">

                <select rvControl class="project-modal-select__native" [(ngModel)]="taskDraft.priority" name="priority">
                  <option *ngFor="let priority of options.priorities" [value]="priority">{{ priority }}</option>
                </select>
              </span>
            </label>
            <label class="project-modal__field">
              <span>Risk</span>
              <span class="project-modal-select">

                <select rvControl class="project-modal-select__native" [(ngModel)]="taskDraft.risk" name="risk">
                  <option *ngFor="let risk of options.risks" [value]="risk">{{ risk }}</option>
                </select>
              </span>
            </label>
            <label class="project-modal__field">
              <span>Status</span>
              <span class="project-modal-select">

                <select rvControl class="project-modal-select__native" [(ngModel)]="taskDraft.status" name="status">
                  <option *ngFor="let status of options.statuses" [value]="status">{{ status }}</option>
                </select>
              </span>
            </label>
            <label class="project-modal__field">
              <span>Department</span>
              <span class="project-modal-select">

                <select rvControl class="project-modal-select__native" [(ngModel)]="taskDraft.department" name="department">
                  <option *ngFor="let department of options.departments" [value]="department">{{ department }}</option>
                </select>
              </span>
            </label>
            <label class="project-modal__field">
              <span>Progress</span>
              <input rvControl [(ngModel)]="taskDraft.progress" name="progress" type="number" min="0" max="100" />
            </label>
            <label class="project-modal__field">
              <span>Start</span>
              <input rvControl [(ngModel)]="taskDraft.from" name="from" type="date" />
            </label>
            <label class="project-modal__field">
              <span>End</span>
              <input rvControl [(ngModel)]="taskDraft.to" name="to" type="date" />
            </label>
            <label class="project-modal__field">
              <span>Budget</span>
              <input rvControl [(ngModel)]="taskDraft.budget" name="budget" type="number" min="0" step="1000" />
            </label>
            <label class="project-modal__field">
              <span>Rating</span>
              <input rvControl [(ngModel)]="taskDraft.rating" name="rating" type="number" min="0" max="5" step="1" />
            </label>
            <label class="project-modal__field">
              <span>Section</span>
              <span class="project-modal-select">

                <select rvControl class="project-modal-select__native" [(ngModel)]="taskDraft.section" name="section">
                  <option *ngFor="let section of options.sections" [value]="section">{{ section }}</option>
                </select>
              </span>
            </label>
          </div>

          <div class="project-modal__footer">
            <button rvControl type="button" (click)="closeTaskModal()">Cancel</button>
            <button rvControl type="submit" class="project-grid-primary">Create project</button>
          </div>
        </form>
      </div>
    </div>
  `,
  styleUrls: ['./project-tracker.scss'],
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ColorGridComponent implements OnDestroy {
  @ViewChild('gridRef', { static: true, read: ElementRef }) gridRef!: ElementRef<HTMLRevoGridElement>;

  theme = currentTheme().isDark() ? 'darkMaterial' : 'material';
  private readonly disconnectTheme = observeCurrentTheme((isDark) => {
    this.theme = isDark ? 'darkMaterial' : 'material';
  });
  columns = createProjectColumns();
  columnTypes = createProjectColumnTypes();
  plugins = projectPlugins;
  projectRowOrder = projectRowOrder;
  projectRowSelect = projectRowSelect;
  filterConfig = projectFilterConfig;
  projectRows: ProjectRow[] = createProjectRows();
  options = getProjectFilterOptions(this.projectRows);
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

  ownerLabel(value: string) {
    return projectOwnerProfiles.find(owner => owner.value === value)?.label ?? value;
  }

  toggleDraftSkill(skill: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const next = input.checked
      ? Array.from(new Set([...this.taskDraft.skills, skill]))
      : this.taskDraft.skills.filter((item) => item !== skill);
    if (!next.length) {
      input.checked = true;
      return;
    }
    this.taskDraft = { ...this.taskDraft, skills: next };
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

  changeSort(value: ProjectSortValue, additive = false) {
    this.sortBy = value;
    this.syncToolbarState();
    void applyProjectSort(this.gridRef?.nativeElement, this.columns, this.sortBy, additive);
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
      this.changeSort(detail.value, detail.additive);
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

  ngOnDestroy(): void {
    this.disconnectTheme();
  }
}
