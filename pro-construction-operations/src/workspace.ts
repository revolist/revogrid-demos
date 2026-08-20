import './assets/styles.scss';
import buildingIcon from '@fortawesome/fontawesome-free/svgs/solid/building.svg?raw';
import calendarIcon from '@fortawesome/fontawesome-free/svgs/solid/calendar-days.svg?raw';
import chevronLeftIcon from '@fortawesome/fontawesome-free/svgs/solid/chevron-left.svg?raw';
import chevronRightIcon from '@fortawesome/fontawesome-free/svgs/solid/chevron-right.svg?raw';
import clockResetIcon from '@fortawesome/fontawesome-free/svgs/solid/clock-rotate-left.svg?raw';
import filterIcon from '@fortawesome/fontawesome-free/svgs/solid/filter.svg?raw';
import folderOpenIcon from '@fortawesome/fontawesome-free/svgs/solid/folder-open.svg?raw';
import tableIcon from '@fortawesome/fontawesome-free/svgs/solid/table-list.svg?raw';
import usersIcon from '@fortawesome/fontawesome-free/svgs/solid/users.svg?raw';
import { defineCustomElements } from '@revolist/revogrid/loader';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import { CONSTRUCTION_MODEL } from './shared/data/model';
import { companyMasterSource, DEFAULT_LOOK_AHEAD, DEFAULT_LOOK_AHEAD_FILTERS, lookAheadSource, projectSource } from './shared/data/projections';
import { moveLookAheadPeriod } from './shared/data/updates';
import { mountConstructionGrid, type ConstructionGridMount } from './shared/grid';
import { defaultExpandedRows } from './shared/state';
import type {
  ConstructionScale,
  ConstructionTask,
  ConstructionView,
  LookAheadFilters,
  LookAheadPeriod,
  ProjectDepartmentFilter,
} from './shared/types';
import {
  createButton,
  createControlGroup,
  createControlSet,
  createIcon,
  createText,
  displayDate,
} from './shared/ui';

defineCustomElements();
const featuredProject = '2801';
let workspaceSequence = 0;

export function mountConstructionFabricationWorkspace(
  host: HTMLElement,
  mountGrid: ConstructionGridMount = mountConstructionGrid,
): () => void {
  const filterPopoverId = `construction-fabrication-filters-${++workspaceSequence}`;
  let view: ConstructionView = 'master';
  let selectedProject = featuredProject;
  let period: LookAheadPeriod = { ...DEFAULT_LOOK_AHEAD };
  let filters: LookAheadFilters = { ...DEFAULT_LOOK_AHEAD_FILTERS };
  let projectDepartment: ProjectDepartmentFilter = 'all';
  let scale: ConstructionScale = 'day-week';
  let tasks: ConstructionTask[] = [...CONSTRUCTION_MODEL.tasks];
  let expandedRowIds = new Set<string>();
  let filtersOpen = false;
  let resourcesOpen = false;
  let disposeGrid = () => {};
  let disconnectTheme = () => {};

  const dismissFilters = (restoreFocus = false) => {
    const trigger = host.querySelector<HTMLButtonElement>('.construction-fabrication__filter-trigger');
    const popover = host.querySelector<HTMLElement>(`#${filterPopoverId}`);
    filtersOpen = false;
    if (popover?.matches(':popover-open')) popover.hidePopover?.();
    trigger?.setAttribute('aria-expanded', 'false');
    trigger?.removeAttribute('data-open');
    if (restoreFocus) trigger?.focus();
  };
  const onDocumentPointerDown = (event: PointerEvent) => {
    if (!filtersOpen) return;
    const trigger = host.querySelector<HTMLElement>('.construction-fabrication__filter-trigger');
    const popover = host.querySelector<HTMLElement>(`#${filterPopoverId}`);
    const path = event.composedPath();
    if ((trigger && path.includes(trigger)) || (popover && path.includes(popover))) return;
    dismissFilters();
  };
  const onDocumentKeyDown = (event: KeyboardEvent) => {
    if (filtersOpen && event.key === 'Escape') {
      event.preventDefault();
      dismissFilters(true);
    }
  };

  const projectName = () => CONSTRUCTION_MODEL.projects.find((project) => project.projectRef === selectedProject)?.name || 'Project Schedule';
  const sourceForView = () => view === 'master'
    ? companyMasterSource(CONSTRUCTION_MODEL, tasks)
    : view === 'lookahead'
      ? lookAheadSource(CONSTRUCTION_MODEL, selectedProject, period, filters, tasks)
      : projectSource(CONSTRUCTION_MODEL, selectedProject, tasks);
  const expandedFor = (nextView: ConstructionView) => {
    const previousView = view;
    view = nextView;
    const source = sourceForView();
    view = previousView;
    return defaultExpandedRows(nextView, selectedProject, source);
  };
  const openProject = (projectRef: string) => {
    selectedProject = projectRef;
    expandedRowIds = expandedFor('project');
    view = 'project';
    resourcesOpen = false;
    filtersOpen = false;
    render();
  };

  const buildBreadcrumb = () => {
    const nav = document.createElement('nav');
    nav.className = 'construction-fabrication__nav';
    nav.setAttribute('aria-label', 'Schedule location');

    nav.append(createButton('Company Master', () => {
      view = 'master';
      expandedRowIds = new Set();
      resourcesOpen = false;
      filtersOpen = false;
      render();
    }, {
      active: view === 'master',
      icon: buildingIcon,
      kind: 'quiet',
      title: 'Open the company project portfolio',
    }));

    if (view !== 'master') {
      nav.append(
        createText('span', 'construction-fabrication__crumb', '›'),
        createButton(projectName(), () => {
          expandedRowIds = expandedFor('project');
          view = 'project';
          filtersOpen = false;
          render();
        }, {
          active: view === 'project',
          icon: folderOpenIcon,
          kind: 'quiet',
          title: `Open ${projectName()} schedule`,
        }),
      );
    }
    if (view === 'lookahead') {
      nav.append(
        createText('span', 'construction-fabrication__crumb', '›'),
        createText('span', 'construction-fabrication__crumb-current', '2-week Look-Ahead'),
      );
    }
    return nav;
  };
  const buildFilterPopover = (trigger: HTMLButtonElement) => {
    const popover = document.createElement('div');
    popover.id = filterPopoverId;
    popover.className = 'construction-fabrication__filter-popover';
    popover.setAttribute('popover', 'auto');
    popover.setAttribute('role', 'dialog');
    popover.setAttribute('aria-label', 'Schedule filters');

    const header = document.createElement('div');
    header.className = 'construction-fabrication__filter-header';
    header.append(createText('strong', 'construction-fabrication__filter-title', 'Filters'));
    header.append(createButton('Reset', () => {
      if (view === 'lookahead') filters = { ...DEFAULT_LOOK_AHEAD_FILTERS };
      else projectDepartment = 'all';
      filtersOpen = true;
      render();
    }, { kind: 'quiet' }));

    const body = document.createElement('div');
    body.className = 'construction-fabrication__filter-body';
    if (view === 'project') {
      const departmentButtons = (['all', 'fabrication', 'installation'] as const).map((department) => (
        createButton(
          department === 'all' ? 'All work' : department[0].toUpperCase() + department.slice(1),
          () => {
            projectDepartment = department;
            filtersOpen = true;
            render();
          },
          { active: projectDepartment === department },
        )
      ));
      body.append(createControlGroup('Department', departmentButtons));
    } else {
      const areaSelect = document.createElement('select');
      areaSelect.className = 'construction-fabrication__select';
      areaSelect.setAttribute('aria-label', 'Work area');
      const unfilteredLookAhead = lookAheadSource(CONSTRUCTION_MODEL, selectedProject, period, { department: 'all', workArea: 'all' }, tasks);
      const areas = [...new Set(unfilteredLookAhead.map((task) => task.workArea).filter(Boolean))] as string[];
      areaSelect.append(new Option('All work areas', 'all'), ...areas.map((area) => new Option(area, area)));
      areaSelect.value = filters.workArea;
      areaSelect.addEventListener('change', () => {
        filters = { ...filters, workArea: areaSelect.value };
        filtersOpen = true;
        render();
      });
      const departmentButtons = (['all', 'fabrication', 'installation'] as const).map((department) => (
        createButton(
          department === 'all' ? 'All' : department[0].toUpperCase() + department.slice(1),
          () => {
            filters = { ...filters, department };
            filtersOpen = true;
            render();
          },
          { active: filters.department === department },
        )
      ));
      body.append(
        createControlGroup('Department', departmentButtons),
        createControlGroup('Work area', [areaSelect]),
      );
    }
    popover.append(header, body);
    popover.addEventListener('toggle', () => {
      if (!popover.isConnected) return;
      filtersOpen = popover.matches(':popover-open');
      trigger.setAttribute('aria-expanded', String(filtersOpen));
      trigger.toggleAttribute('data-open', filtersOpen);
      if (filtersOpen) requestAnimationFrame(() => {
        const triggerBounds = trigger.getBoundingClientRect();
        const popupWidth = popover.offsetWidth;
        popover.style.left = `${Math.max(8, Math.min(window.innerWidth - popupWidth - 8, triggerBounds.right - popupWidth))}px`;
        popover.style.top = `${triggerBounds.bottom + 6}px`;
      });
    });
    return popover;
  };
  const appendPeriodControls = (actions: HTMLElement, resourceTimeline = false) => {
    const periodSummary = document.createElement('div');
    periodSummary.className = 'construction-fabrication__period-summary';
    periodSummary.append(
      createIcon(resourceTimeline ? usersIcon : calendarIcon, 'construction-fabrication__period-icon'),
      createText(
        'span',
        'construction-fabrication__period-kicker',
        resourceTimeline ? 'Resource timeline' : 'Active window',
      ),
      createText(
        'strong',
        'construction-fabrication__period',
        `${displayDate(period.start)} – ${displayDate(period.end)}`,
      ),
    );
    actions.append(periodSummary, createControlSet([
      createButton('Previous', () => {
        period = moveLookAheadPeriod(period, -1);
        filtersOpen = false;
        render();
      }, { icon: chevronLeftIcon, iconOnly: true, title: 'Previous 14 days' }),
      createButton('Reset', () => {
        period = { ...DEFAULT_LOOK_AHEAD };
        filtersOpen = false;
        render();
      }, { icon: clockResetIcon, iconOnly: true, title: 'Reset to the featured window' }),
      createButton('Next', () => {
        period = moveLookAheadPeriod(period, 1);
        filtersOpen = false;
        render();
      }, { icon: chevronRightIcon, iconOnly: true, title: 'Next 14 days' }),
    ]));
  };
  const buildCommandDeck = () => {
    const deck = document.createElement('div');
    deck.className = 'construction-fabrication__command-deck';
    const tabs = document.createElement('div');
    tabs.className = 'construction-fabrication__view-tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.append(
      createButton('Schedule', () => {
        expandedRowIds = expandedFor('project');
        view = 'project';
        resourcesOpen = false;
        filtersOpen = false;
        render();
      }, { active: view === 'project' && !resourcesOpen, icon: tableIcon, kind: 'tab' }),
      createButton('Look-Ahead', () => {
        expandedRowIds = expandedFor('lookahead');
        view = 'lookahead';
        resourcesOpen = false;
        filtersOpen = false;
        render();
      }, { active: view === 'lookahead', icon: calendarIcon, kind: 'tab' }),
      createButton('Resources', () => {
        view = 'project';
        resourcesOpen = true;
        filtersOpen = false;
        render();
      }, { active: resourcesOpen, icon: usersIcon, kind: 'tab' }),
    );
    const actions = document.createElement('div');
    actions.className = 'construction-fabrication__command-actions';
    if (view === 'project' && !resourcesOpen) {
      const scaleButton = (label: string, nextScale: typeof scale) => createButton(label, () => {
        scale = nextScale;
        filtersOpen = false;
        render();
      }, { active: scale === nextScale });
      actions.append(createControlGroup('Timeline', [
        scaleButton('Days', 'day-week'),
        scaleButton('Weeks', 'week-month'),
        scaleButton('Months', 'month-quarter'),
      ], calendarIcon));
    } else {
      appendPeriodControls(actions, resourcesOpen);
    }
    if (!resourcesOpen) {
      const filterTrigger = createButton('Filter', () => {}, {
        icon: filterIcon,
        kind: 'quiet',
        title: 'Filter the current schedule',
      });
      filterTrigger.classList.add('construction-fabrication__filter-trigger');
      filterTrigger.setAttribute('aria-haspopup', 'dialog');
      filterTrigger.setAttribute('aria-expanded', String(filtersOpen));
      filterTrigger.setAttribute('aria-controls', filterPopoverId);
      filterTrigger.setAttribute('popovertarget', filterPopoverId);
      filterTrigger.toggleAttribute('data-open', filtersOpen);
      actions.append(filterTrigger, buildFilterPopover(filterTrigger));
    }
    deck.append(tabs, actions);
    return deck;
  };
  const render = () => {
    disposeGrid();
    disposeGrid = () => {};
    host.replaceChildren();
    const shell = document.createElement('section');
    shell.className = `construction-fabrication construction-fabrication--${view} ${currentTheme().isDark() ? 'construction-fabrication--dark' : ''}`;
    shell.setAttribute('aria-label', 'Construction and Fabrication Operations');
    shell.append(buildBreadcrumb());
    const workspace = document.createElement('div');
    workspace.className = 'construction-fabrication__workspace';
    const main = document.createElement('main');
    main.className = 'construction-fabrication__main';
    if (view !== 'master') {
      main.append(buildCommandDeck());
    }
    disposeGrid = mountGrid(main, {
      view,
      resourcesOpen,
      selectedProject,
      projectName: projectName(),
      period,
      scale,
      projectDepartment,
      tasks,
      expandedRowIds,
      sourceForView,
      openProject,
      setTasks: (nextTasks) => { tasks = nextTasks; },
      setExpandedRowIds: (ids) => { expandedRowIds = ids; },
      refreshProjection: render,
    }) || (() => {});
    workspace.append(main);
    shell.append(workspace);
    host.appendChild(shell);
    if (filtersOpen) queueMicrotask(() => {
      const popover = host.querySelector<HTMLElement>(`#${filterPopoverId}`);
      if (popover?.isConnected && !popover.matches(':popover-open')) popover.showPopover?.();
    });
  };

  document.addEventListener('pointerdown', onDocumentPointerDown, true);
  document.addEventListener('keydown', onDocumentKeyDown, true);
  render();
  disconnectTheme = observeCurrentTheme(() => render());
  return () => {
    document.removeEventListener('pointerdown', onDocumentPointerDown, true);
    document.removeEventListener('keydown', onDocumentKeyDown, true);
    disposeGrid();
    disconnectTheme();
    host.replaceChildren();
  };
}
