import type { ColumnProp } from '@revolist/revogrid';
import chevronDownIcon from '@fortawesome/fontawesome-free/svgs/solid/chevron-down.svg?raw';
import {
  projectBulkActions,
  projectGroupOptions,
  projectHideableColumns,
  projectSortOptions,
  projectToolbarIcons,
  type ProjectToolbarOption,
  type ProjectHideableColumnOption,
} from './options';
import type { ProjectBulkAction, ProjectGroupProp, ProjectSortValue } from './types';
import { getProjectSelectionLabel } from './actions';

export const PROJECT_TRACKER_TOOLBAR_TAG = 'project-tracker-toolbar';
export const PROJECT_TRACKER_TOOLBAR_ACTION_EVENT = 'project-tracker-toolbar-action';

export type ProjectTrackerToolbarAction =
  | { action: 'new' }
  | { action: 'filter' }
  | { action: 'toggleGroups' }
  | { action: 'group'; value: ProjectGroupProp }
  | { action: 'sort'; value: ProjectSortValue }
  | { action: 'bulk'; value: ProjectBulkAction }
  | { action: 'hideColumn'; prop: ColumnProp; visible: boolean };

export type ProjectTrackerToolbarActionEvent = CustomEvent<ProjectTrackerToolbarAction>;

export type ProjectTrackerToolbarState = {
  totalRows: number;
  selectedRowsCount: number;
  groupBy: ProjectGroupProp;
  groupsExpanded: boolean;
  sortBy: ProjectSortValue;
  hiddenColumns: ColumnProp[];
  hideableColumns: ProjectHideableColumnOption[];
};

const defaultToolbarState: ProjectTrackerToolbarState = {
  totalRows: 0,
  selectedRowsCount: 0,
  groupBy: 'section',
  groupsExpanded: true,
  sortBy: '',
  hiddenColumns: [],
  hideableColumns: projectHideableColumns,
};

export function defineProjectTrackerToolbarElement() {
  if (customElements.get(PROJECT_TRACKER_TOOLBAR_TAG)) {
    return;
  }
  customElements.define(PROJECT_TRACKER_TOOLBAR_TAG, ProjectTrackerToolbarElement);
}

export function createProjectTrackerToolbar(state: Partial<ProjectTrackerToolbarState> = {}) {
  defineProjectTrackerToolbarElement();
  const toolbar = document.createElement(PROJECT_TRACKER_TOOLBAR_TAG) as ProjectTrackerToolbarElement;
  toolbar.state = state;
  return toolbar;
}

export class ProjectTrackerToolbarElement extends HTMLElement {
  private currentState: ProjectTrackerToolbarState = { ...defaultToolbarState };
  private readonly handleDocumentPointerDown = (event: PointerEvent) => {
    if (!this.isConnected) {
      return;
    }
    if (!this.contains(event.target as Node)) {
      this.closeMenus();
      return;
    }
    if (!(event.target as HTMLElement | null)?.closest?.('.project-grid-menu')) {
      this.closeMenus();
    }
  };

  set state(state: Partial<ProjectTrackerToolbarState>) {
    this.currentState = {
      ...this.currentState,
      ...state,
      hiddenColumns: [...(state.hiddenColumns ?? this.currentState.hiddenColumns)],
      hideableColumns: [...(state.hideableColumns ?? this.currentState.hideableColumns)],
    };
    this.render();
  }

  get state() {
    return {
      ...this.currentState,
      hiddenColumns: [...this.currentState.hiddenColumns],
      hideableColumns: [...this.currentState.hideableColumns],
    };
  }

  connectedCallback() {
    document.addEventListener('pointerdown', this.handleDocumentPointerDown);
    this.render();
  }

  disconnectedCallback() {
    document.removeEventListener('pointerdown', this.handleDocumentPointerDown);
  }

  private emit(detail: ProjectTrackerToolbarAction) {
    this.dispatchEvent(new CustomEvent<ProjectTrackerToolbarAction>(
      PROJECT_TRACKER_TOOLBAR_ACTION_EVENT,
      { bubbles: true, detail },
    ));
  }

  private closeMenus(except?: HTMLDetailsElement) {
    this.querySelectorAll<HTMLDetailsElement>('.project-grid-menu[open]').forEach((menu) => {
      if (menu !== except) {
        menu.open = false;
      }
    });
  }

  private render() {
    if (!this.isConnected) {
      return;
    }
    const { totalRows, selectedRowsCount, groupBy, groupsExpanded, sortBy, hiddenColumns, hideableColumns } = this.currentState;
    const groupToggleLabel = groupsExpanded ? 'Collapse all groups' : 'Expand all groups';
    const openMenu = this.querySelector<HTMLDetailsElement>('.project-grid-menu[open]')?.dataset.toolbarMenu;

    this.innerHTML = `
      <div class="project-grid-toolbar">
        <button data-toolbar-action="new" type="button" class="project-grid-primary">
          ${renderToolbarIcon(projectToolbarIcons.add)}
          <span>New</span>
        </button>
        ${renderMenuControl('Group', 'group', projectGroupOptions, groupBy, projectToolbarIcons.group)}
        <button
          data-toolbar-action="toggleGroups"
          type="button"
          class="project-grid-menu__trigger project-grid-menu__trigger--button project-grid-icon-button"
          title="${groupToggleLabel}"
          aria-label="${groupToggleLabel}"
          ${groupBy ? '' : 'disabled'}
        >${renderToolbarIcon(groupsExpanded ? projectToolbarIcons.collapse : projectToolbarIcons.expand)}</button>
        ${renderMenuControl('Sort', 'sort', projectSortOptions, sortBy, projectToolbarIcons.sort)}
        <button data-toolbar-action="filter" type="button" class="project-grid-menu__trigger project-grid-menu__trigger--button">
          ${renderToolbarIcon(projectToolbarIcons.filter)}
          <span>Filter</span>
        </button>
        <details class="project-grid-menu project-hide-menu" data-toolbar-menu="hide">
          <summary>${renderToolbarIcon(projectToolbarIcons.hide)}<span>Hide</span></summary>
          <div class="project-grid-menu__panel project-grid-menu__panel--columns">
            ${hideableColumns.map((column) => `
              <label class="project-grid-menu__column-option">
                <input type="checkbox" data-hide-column="${String(column.prop)}"${hiddenColumns.includes(column.prop) ? '' : ' checked'} />
                ${renderMenuIcon(column.icon, column.tone)}
                <span>${column.label}</span>
              </label>
            `).join('')}
          </div>
        </details>
        <span class="project-grid-spacer"></span>
        <div class="project-bulk-bar">
          <span class="project-selection-count">${getProjectSelectionLabel(selectedRowsCount, totalRows)}</span>
          ${projectBulkActions.map((action) => `
            <button
              type="button"
              class="project-bulk-action${action.value === 'delete' ? ' project-bulk-danger' : ''}"
              data-bulk-action="${action.value}"
              ${selectedRowsCount ? '' : 'disabled'}
            ><span class="project-bulk-icon" aria-hidden="true">${action.icon}</span><span>${action.label}</span></button>
          `).join('')}
        </div>
      </div>
    `;

    this.bindEvents();
    if (openMenu) {
      const menu = this.querySelector<HTMLDetailsElement>(`.project-grid-menu[data-toolbar-menu="${openMenu}"]`);
      if (menu) menu.open = true;
    }
  }

  private bindEvents() {
    this.querySelectorAll<HTMLDetailsElement>('.project-grid-menu').forEach((menu) => {
      menu.addEventListener('toggle', () => {
        if (menu.open) {
          this.closeMenus(menu);
        }
      });
      menu.querySelector('summary')?.addEventListener('click', () => this.closeMenus(menu));
    });

    this.querySelectorAll<HTMLButtonElement>('[data-toolbar-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.toolbarAction;
        if (action === 'new' || action === 'filter' || action === 'toggleGroups') {
          this.emit({ action });
        }
      });
    });

    this.querySelectorAll<HTMLButtonElement>('[data-menu-value]').forEach((button) => {
      button.addEventListener('click', () => {
        const menu = button.closest<HTMLElement>('[data-toolbar-menu]')?.dataset.toolbarMenu;
        if (menu === 'group') {
          this.emit({ action: 'group', value: button.dataset.menuValue as ProjectGroupProp });
        }
        if (menu === 'sort') {
          this.emit({ action: 'sort', value: button.dataset.menuValue as ProjectSortValue });
        }
        this.closeMenus();
      });
    });

    this.querySelectorAll<HTMLButtonElement>('[data-bulk-action]').forEach((button) => {
      button.addEventListener('click', () => {
        this.emit({ action: 'bulk', value: button.dataset.bulkAction as ProjectBulkAction });
      });
    });

    this.querySelectorAll<HTMLInputElement>('[data-hide-column]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        this.emit({
          action: 'hideColumn',
          prop: checkbox.dataset.hideColumn as ColumnProp,
          visible: checkbox.checked,
        });
      });
    });
  }
}

function renderMenuControl<T extends string>(
  label: string,
  id: string,
  options: Array<ProjectToolbarOption<T>>,
  value: T,
  icon: string,
) {
  return `
    <details class="project-grid-menu" data-toolbar-menu="${id}">
      <summary>${renderToolbarIcon(icon)}<span>${label}</span>${renderChevronIcon()}</summary>
      <div class="project-grid-menu__panel">
        ${options.map((option) => `
          <button
            type="button"
            class="project-grid-menu__option${option.value === value ? ' is-selected' : ''}"
            data-menu-value="${escapeAttr(option.value)}"
          ><span class="project-grid-menu__check" aria-hidden="true"></span>${renderMenuIcon(option.icon, option.tone)}<span>${option.label}</span></button>
        `).join('')}
      </div>
    </details>
  `;
}

function renderToolbarIcon(icon: string) {
  return `<span class="project-toolbar-icon" aria-hidden="true">${icon}</span>`;
}

function renderChevronIcon() {
  return `<span class="project-chevron-icon" aria-hidden="true">${chevronDownIcon}</span>`;
}

function renderMenuIcon(icon?: string, tone = 'blue') {
  if (!icon) {
    return '<span class="project-grid-menu__type-icon project-grid-menu__type-icon--empty" aria-hidden="true"></span>';
  }
  return `<span class="project-grid-menu__type-icon project-grid-menu__type-icon--${escapeAttr(tone)}" aria-hidden="true">${icon}</span>`;
}

function escapeAttr(value: unknown) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
