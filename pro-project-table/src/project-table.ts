import './project-tracker.scss';
import { defineCustomElements } from '@revolist/revogrid/loader';
import type { ColumnProp } from '@revolist/revogrid';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
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
  getProjectFilterOptions,
  getProjectHideableColumns,
  getSelectedProjectIndexes,
  projectFilterConfig,
  projectGridPreset,
  projectPlugins,
  projectRowOrder,
  projectRowSelect,
  openProjectStatusHeaderFilter,
  projectOwnerProfiles,
  resolveProjectSortValueFromConfig,
  projectSkillOptions,
  syncProjectCellEdit,
  tagTone,
  toProjectHiddenColumns,
  updateProjectCollapsedGroups,
  defineProjectTrackerToolbarElement,
  PROJECT_TRACKER_TOOLBAR_ACTION_EVENT,
  PROJECT_TRACKER_TOOLBAR_TAG,
  type ProjectGroupProp,
  type ProjectRow,
  type ProjectSortValue,
  type ProjectTaskDraft,
  type ProjectTrackerToolbarActionEvent,
  type ProjectTrackerToolbarElement,
} from './project-tracker.shared';

defineCustomElements();
defineProjectTrackerToolbarElement();

const { isDark } = currentTheme();

export function load(parentSelector: string) {
  let projectRows = createProjectRows();
  let hiddenColumns: ColumnProp[] = [];
  let selectedIndexes = new Set<number>();
  let selectedRowsCount = 0;
  let groupBy: ProjectGroupProp = 'section';
  let groupsExpanded = true;
  let collapsedGroups = new Set<string>();
  let sortBy: ProjectSortValue = '';
  let taskDraft = createProjectTaskDraft();
  let columns = createProjectColumns();

  const container = document.createElement('div');
  container.className = 'project-grid-host';
  container.innerHTML = renderTracker();

  const parent = document.querySelector(parentSelector);
  parent?.appendChild(container);

  const grid = container.querySelector<HTMLRevoGridElement>('revo-grid');
  if (!grid) return;
  const toolbar = container.querySelector<ProjectTrackerToolbarElement>(PROJECT_TRACKER_TOOLBAR_TAG);

  const syncToolbar = () => {
    if (!toolbar) return;
    toolbar.state = {
      totalRows: projectRows.length,
      selectedRowsCount,
      groupBy,
      groupsExpanded,
      sortBy,
      hiddenColumns,
      hideableColumns: getProjectHideableColumns(columns),
    };
  };

  const refreshGrid = () => {
    grid.grouping = createProjectGrouping(() => projectRows, groupBy, groupsExpanded, collapsedGroups);
    grid.source = projectRows;
    syncToolbar();
  };

  const resetSelection = () => {
    selectedIndexes = new Set();
    selectedRowsCount = 0;
    clearProjectSelection(grid);
    syncToolbar();
  };

  grid.className = 'project-tracker-grid skip-style color-grid cell-border';
  grid.theme = isDark() ? 'darkMaterial' : 'material';
  grid.canMoveColumns = true;
  const disconnectTheme = observeCurrentTheme((darkTheme) => {
    grid.theme = darkTheme ? 'darkMaterial' : 'material';
  });
  grid.columns = columns;
  grid.source = projectRows;
  grid.grouping = createProjectGrouping(() => projectRows, groupBy, groupsExpanded, collapsedGroups);
  grid.gridPreset = projectGridPreset;
  grid.plugins = projectPlugins;
  grid.rowOrder = projectRowOrder;
  grid.rowSelect = projectRowSelect;
  grid.stretch = 'last';
  grid.filter = projectFilterConfig;
  grid.hideColumns = hiddenColumns;
  const { rowContextMenu, columnContextMenu } = createProjectContextMenus({
    getRows: () => projectRows,
    setRows: (rows) => {
      projectRows = rows;
      refreshGrid();
    },
    getColumns: () => columns,
    setColumns: (nextColumns) => {
      columns = nextColumns as typeof columns;
      grid.columns = columns;
      syncToolbar();
    },
    getHiddenColumns: () => hiddenColumns,
    setHiddenColumns: (nextHiddenColumns) => {
      hiddenColumns = nextHiddenColumns;
      grid.hideColumns = hiddenColumns;
      syncHiddenColumnControls();
    },
    getGrid: () => grid,
    getSelectedIndexes: () => selectedIndexes,
    getGroupBy: () => groupBy,
    clearSelection: resetSelection,
    setSortBy: (value) => {
      sortBy = value;
      syncToolbar();
    },
  });
  const columnAddPopup = createProjectColumnAddPopupConfig({
    getRows: () => projectRows,
    setRows: (rows) => {
      projectRows = rows;
      refreshGrid();
    },
    getColumns: () => columns,
    setColumns: (nextColumns) => {
      columns = nextColumns as typeof columns;
      grid.columns = columns;
      syncToolbar();
    },
    getHiddenColumns: () => hiddenColumns,
    setHiddenColumns: (nextHiddenColumns) => {
      hiddenColumns = nextHiddenColumns;
      grid.hideColumns = hiddenColumns;
      syncToolbar();
    },
    getGrid: () => grid,
    getSelectedIndexes: () => selectedIndexes,
    clearSelection: resetSelection,
    setSortBy: (value) => {
      sortBy = value;
      syncToolbar();
    },
  });
  grid.rowContextMenu = rowContextMenu;
  grid.columnContextMenu = columnContextMenu;
  grid.columnAddPopup = columnAddPopup;
  const syncProjectEditState = (event: Event) => {
    const nextRows = syncProjectCellEdit(projectRows, (event as CustomEvent).detail);
    if (nextRows === projectRows) {
      return;
    }
    projectRows.splice(0, projectRows.length, ...nextRows);
    grid.source = projectRows;
    syncToolbar();
  };
  grid.addEventListener('celleditapply', syncProjectEditState);
  grid.addEventListener('afteredit', syncProjectEditState);
  grid.additionalData = {
    columnAddPopup,
  };
  grid.rowSize = 44;
  grid.resize = true;
  grid.hideAttribution = true;
  syncToolbar();

  toolbar?.addEventListener(PROJECT_TRACKER_TOOLBAR_ACTION_EVENT, (event: Event) => {
    const { action } = (event as ProjectTrackerToolbarActionEvent).detail;
    if (action === 'new') {
      taskDraft = createProjectTaskDraft();
      openTaskModal(container, taskDraft, (draft) => {
        projectRows = [createProjectTaskFromDraft(draft), ...projectRows];
        refreshGrid();
      });
      return;
    }
    if (action === 'filter') {
      openProjectStatusHeaderFilter(grid);
      return;
    }
    if (action === 'toggleGroups') {
      if (!groupBy) return;
      groupsExpanded = !groupsExpanded;
      collapsedGroups = new Set();
      grid.grouping = createProjectGrouping(() => projectRows, groupBy, groupsExpanded, collapsedGroups);
      syncToolbar();
      return;
    }
    const detail = (event as ProjectTrackerToolbarActionEvent).detail;
    if (detail.action === 'group') {
      groupBy = detail.value;
      if (groupBy) groupsExpanded = true;
      collapsedGroups = new Set();
      grid.grouping = createProjectGrouping(() => projectRows, groupBy, groupsExpanded, collapsedGroups);
      syncToolbar();
      return;
    }
    if (detail.action === 'sort') {
      sortBy = detail.value;
      syncToolbar();
      void applyProjectSort(grid, columns, sortBy);
      return;
    }
    if (detail.action === 'bulk') {
      if (!selectedIndexes.size) return;
      projectRows = applyProjectBulkAction(projectRows, selectedIndexes, detail.value, groupBy);
      resetSelection();
      refreshGrid();
      return;
    }
    if (detail.action === 'hideColumn') {
      hiddenColumns = detail.visible
        ? hiddenColumns.filter((column) => column !== detail.prop)
        : Array.from(new Set([...hiddenColumns, detail.prop]));
      grid.hideColumns = hiddenColumns;
      syncToolbar();
    }
  });

  grid.addEventListener('toggleHideColumn', (event: CustomEvent<ColumnProp[]>) => {
    hiddenColumns = toProjectHiddenColumns(event);
    grid.hideColumns = hiddenColumns;
    syncToolbar();
  });

  grid.addEventListener('rowselected', (event: CustomEvent<HTMLRevoGridElementEventMap['rowselected']>) => {
    selectedIndexes = getSelectedProjectIndexes(event);
    selectedRowsCount = event.detail.count;
    syncToolbar();
  });

  grid.addEventListener('sortingconfigchanged', (event: CustomEvent<unknown>) => {
    sortBy = resolveProjectSortValueFromConfig(event.detail);
    syncToolbar();
  });

  grid.addEventListener('groupexpandclick', (event: CustomEvent<{ model?: Record<string, unknown> }>) => {
    queueMicrotask(() => {
      collapsedGroups = new Set(updateProjectCollapsedGroups(event, collapsedGroups));
      groupsExpanded = collapsedGroups.size === 0;
      syncToolbar();
    });
  });

  return () => {
    disconnectTheme();
    container.remove();
  };
}

function renderTracker() {
  return `
    <div class="project-grid-shell">
      <${PROJECT_TRACKER_TOOLBAR_TAG}></${PROJECT_TRACKER_TOOLBAR_TAG}>
      <revo-grid></revo-grid>
    </div>
  `;
}

function openTaskModal(
  container: HTMLElement,
  draft: ProjectTaskDraft,
  onSubmit: (draft: ProjectTaskDraft) => void,
) {
  const options = getProjectFilterOptions(createProjectRows());
  const backdrop = document.createElement('div');
  backdrop.className = 'project-modal-backdrop';
  backdrop.innerHTML = `
    <form class="project-modal">
      <div class="project-modal__header">
        <div>
          <p>New project</p>
          <h2>Pipeline details</h2>
        </div>
        <button type="button" class="project-modal__close" aria-label="Close task dialog">×</button>
      </div>
      <label class="project-modal__field project-modal__field--wide">
        <span>Project</span>
        <input id="taskDraftTask" required placeholder="Describe the project" value="${escapeAttr(draft.task)}" />
      </label>
      <label class="project-modal__field project-modal__field--wide">
        <span>AI summary</span>
        <input id="taskDraftSummary" required placeholder="Short project summary" value="${escapeAttr(draft.summary)}" />
      </label>
      <div class="project-modal__grid">
        ${renderModalSelect('taskDraftOwner', 'Owner', options.owners, draft.owner, 'owner')}
        ${renderModalCheckboxes('taskDraftSkills', 'Skills', options.skills, draft.skills)}
        ${renderModalSelect('taskDraftPriority', 'Priority', options.priorities, draft.priority, 'block')}
        ${renderModalSelect('taskDraftRisk', 'Risk', options.risks, draft.risk, 'block')}
        ${renderModalSelect('taskDraftStatus', 'Status', options.statuses, draft.status, 'block')}
        ${renderModalSelect('taskDraftDepartment', 'Department', options.departments, draft.department, 'department')}
        <label class="project-modal__field">
          <span>Progress</span>
          <input id="taskDraftProgress" type="number" min="0" max="100" value="${draft.progress}" />
        </label>
        <label class="project-modal__field">
          <span>Start</span>
          <input id="taskDraftFrom" type="date" value="${draft.from}" />
        </label>
        <label class="project-modal__field">
          <span>End</span>
          <input id="taskDraftTo" type="date" value="${draft.to}" />
        </label>
        <label class="project-modal__field">
          <span>Budget</span>
          <input id="taskDraftBudget" type="number" min="0" step="1000" value="${draft.budget}" />
        </label>
        <label class="project-modal__field">
          <span>Rating</span>
          <input id="taskDraftRating" type="number" min="0" max="5" step="1" value="${draft.rating}" />
        </label>
        ${renderModalSelect('taskDraftSection', 'Section', options.sections, draft.section, 'section')}
      </div>
      <div class="project-modal__footer">
        <button type="button" data-close>Cancel</button>
        <button type="submit" class="project-grid-primary">Create project</button>
      </div>
    </form>
  `;

  const close = () => backdrop.remove();
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) close();
  });
  backdrop.querySelector<HTMLButtonElement>('.project-modal__close')?.addEventListener('click', close);
  backdrop.querySelector<HTMLButtonElement>('[data-close]')?.addEventListener('click', close);
  backdrop.querySelectorAll<HTMLSelectElement>('.project-modal-select__native').forEach((select) => {
    select.addEventListener('change', () => updateModalSelectPreview(select));
  });
  backdrop.querySelector<HTMLFormElement>('form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const nextDraft = readTaskDraft(backdrop, draft);
    onSubmit(nextDraft);
    close();
  });

  container.querySelector('.project-grid-shell')?.appendChild(backdrop);
}

function renderModalCheckboxes(name: string, label: string, options: string[], values: string[]) {
  return `
    <fieldset class="project-modal__field project-modal__field--wide project-modal__checks">
      <legend>${label}</legend>
      <div>
        ${options.map((option) => `
          <label>
            <input type="checkbox" name="${name}" value="${escapeAttr(option)}"${values.includes(option) ? ' checked' : ''} />
            <span class="project-modal-skill project-skill--${modalSkillTone(option)}">${option}</span>
          </label>
        `).join('')}
      </div>
    </fieldset>
  `;
}

type ModalSelectKind = 'plain' | 'owner' | 'block' | 'department' | 'section';

function renderModalSelect(id: string, label: string, options: string[], value: string, kind: ModalSelectKind = 'plain') {
  return `
    <label class="project-modal__field project-modal__field--select">
      <span>${label}</span>
      <span class="project-modal-select">
        ${renderModalSelectPreview(kind, value)}
        <select id="${id}" class="project-modal-select__native" data-modal-select-kind="${kind}">
          ${options
            .map((option) => `<option value="${escapeAttr(option)}"${option === value ? ' selected' : ''}>${option}</option>`)
            .join('')}
        </select>
      </span>
    </label>
  `;
}

function updateModalSelectPreview(select: HTMLSelectElement) {
  const wrapper = select.closest('.project-modal-select');
  const preview = wrapper?.querySelector('.project-modal-select__preview');
  if (!preview) return;
  preview.outerHTML = renderModalSelectPreview((select.dataset.modalSelectKind as ModalSelectKind) || 'plain', select.value);
}

function renderModalSelectPreview(kind: ModalSelectKind, value: string) {
  if (kind === 'owner') {
    const profile = projectOwnerProfiles.find((owner) => owner.value === value);
    const index = Math.max(0, projectOwnerProfiles.findIndex((owner) => owner.value === value));
    return `
      <span class="project-modal-select__preview">
        <span class="project-modal-owner">
          <span class="avatar-cell avatar-cell--${index % 8} project-avatar">${escapeAttr(value.slice(0, 1))}</span>
          <span class="project-modal-select__text">${escapeHtml(profile?.label ?? value)}</span>
        </span>
      </span>
    `;
  }
  if (kind === 'block') {
    return `
      <span class="project-modal-select__preview">
        <span class="project-modal-block project-filter-block--${modalBlockTone(value)}">${escapeHtml(value)}</span>
      </span>
    `;
  }
  if (kind === 'department') {
    return `
      <span class="project-modal-select__preview">
        <span class="project-modal-pill project-filter-department--${tagTone(value)}">${escapeHtml(value)}</span>
      </span>
    `;
  }
  if (kind === 'section') {
    return `
      <span class="project-modal-select__preview">
        <span class="project-modal-section" style="--project-modal-section-color: ${modalSectionColor(value)}">
          <span class="project-modal-section__dot"></span>
          <span class="project-modal-select__text">${escapeHtml(value)}</span>
        </span>
      </span>
    `;
  }
  return `<span class="project-modal-select__preview"><span class="project-modal-select__text">${escapeHtml(value)}</span></span>`;
}

function modalBlockTone(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes('blocked') || normalized.includes('high')) return 'red';
  if (normalized.includes('review') || normalized.includes('medium')) return 'orange';
  if (normalized.includes('ready') || normalized.includes('low')) return 'green';
  if (normalized.includes('new')) return 'blue';
  return 'violet';
}

function modalSectionColor(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes('review')) return '#ff8b00';
  if (normalized.includes('ready')) return '#00c875';
  if (normalized.includes('blocked')) return '#ff4d5e';
  return '#1f7aff';
}

function modalSkillTone(value: string) {
  return projectSkillOptions.find((skill) => skill.value === value)?.tone ?? tagTone(value);
}

function readTaskDraft(root: HTMLElement, draft: ProjectTaskDraft): ProjectTaskDraft {
  return {
    task: getInputValue(root, 'taskDraftTask') || draft.task,
    owner: getInputValue(root, 'taskDraftOwner') || draft.owner,
    summary: getInputValue(root, 'taskDraftSummary') || draft.summary,
    skills: getCheckedValues(root, 'taskDraftSkills', draft.skills),
    priority: getInputValue(root, 'taskDraftPriority') || draft.priority,
    risk: getInputValue(root, 'taskDraftRisk') || draft.risk,
    status: getInputValue(root, 'taskDraftStatus') || draft.status,
    department: getInputValue(root, 'taskDraftDepartment') || draft.department,
    progress: Number(getInputValue(root, 'taskDraftProgress') || draft.progress),
    from: getInputValue(root, 'taskDraftFrom') || draft.from,
    to: getInputValue(root, 'taskDraftTo') || draft.to,
    budget: Number(getInputValue(root, 'taskDraftBudget') || draft.budget),
    rating: Number(getInputValue(root, 'taskDraftRating') || draft.rating),
    section: getInputValue(root, 'taskDraftSection') || draft.section,
  };
}

function getCheckedValues(container: HTMLElement, name: string, fallback: string[]) {
  const values = Array.from(container.querySelectorAll<HTMLInputElement>(`input[name="${name}"]:checked`)).map((input) => input.value);
  return values.length ? values : fallback;
}

function getInputValue(container: HTMLElement, id: string) {
  return container.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`)?.value ?? '';
}

function escapeAttr(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function escapeHtml(value: string) {
  return escapeAttr(value).replace(/>/g, '&gt;');
}
