import { defineCustomElements } from '@revolist/revogrid/loader';
defineCustomElements();

import { EventSchedulerPlugin, type EventSchedulerEntityId, type EventSchedulerEventSelectedDetail } from '@revolist/revogrid-enterprise';
import { AdvanceFilterPlugin, ColumnStretchPlugin, RowOddPlugin } from '@revolist/revogrid-pro';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import {
  createShiftWeekAssignedOpenShift,
  createShiftWeekConfig,
  createShiftWeekEvents,
  createShiftWeekManualEvent,
  getShiftWeekNewEventDefaults,
  getShiftWeekRangeTitle,
  getShiftWeekSearchMatchIds,
  getShiftWeekSubtitle,
  getShiftWeekTableRows,
  getShiftWeekTableColumns,
  getTodayAnchorDate,
  initialShiftWeekCalendar,
  initialShiftWeekAnchorDate,
  initialShiftWeekDemoView,
  initialShiftWeekWorkspaceView,
  navigateShiftWeekAnchorDate,
  normalizeShiftWeekAnchorDate,
  reassignShiftWeekEvent,
  shiftWeekCalendarOptions,
  shiftWeekNewEventStatusOptions,
  shiftWeekNewEventTypeOptions,
  shiftResources,
  shiftWeekDemoViews,
  shiftWeekTeamMembers,
  shiftWeekViewLabels,
  type ShiftWeekDemoCalendar,
  type ShiftWeekDemoView,
  type ShiftWeekNewEventForm,
  type ShiftWeekWorkspaceView,
} from './data';
import {
  SCHEDULER_DIALOG_TAG,
  SCHEDULER_HEADER_TAG,
  SCHEDULER_SIDEBAR_TAG,
  defineSchedulerShellElements,
  type SchedulerDialogElement,
  type SchedulerDialogSubmitDetail,
  type SchedulerHeaderCalendarChangeDetail,
  type SchedulerHeaderElement,
  type SchedulerHeaderNavigateDetail,
  type SchedulerHeaderViewChangeDetail,
  type SchedulerSidebarElement,
  type SchedulerSidebarSearchChangeDetail,
  type SchedulerSidebarWorkspaceChangeDetail,
} from './components';
import './styles.scss';

defineSchedulerShellElements();

const { isDark } = currentTheme();

export function load(parentSelector: string) {
  const parent = document.querySelector(parentSelector);
  if (!parent) {
    return () => {};
  }

  const root = document.createElement('section');
  const sidebar = document.createElement(SCHEDULER_SIDEBAR_TAG) as SchedulerSidebarElement;
  const main = document.createElement('div');
  const header = document.createElement(SCHEDULER_HEADER_TAG) as SchedulerHeaderElement;
  const grid = document.createElement('revo-grid');
  const table = document.createElement('revo-grid');
  const dialog = document.createElement(SCHEDULER_DIALOG_TAG) as SchedulerDialogElement;
  let activeView: ShiftWeekDemoView = initialShiftWeekDemoView;
  let workspaceView: ShiftWeekWorkspaceView = initialShiftWeekWorkspaceView;
  let activeCalendar: ShiftWeekDemoCalendar = initialShiftWeekCalendar;
  let anchorDate = initialShiftWeekAnchorDate;
  let selectedEventIds: readonly EventSchedulerEntityId[] = [];
  let searchQuery = '';
  let newEventForm: ShiftWeekNewEventForm | null = null;

  root.className = 'event-scheduler-shift-week-demo';
  main.className = 'event-scheduler-shift-week-main';
  grid.className = 'event-scheduler-shift-week-grid';
  grid.theme = isDark() ? 'darkMaterial' : 'material';
  grid.hideAttribution = true;
  grid.plugins = [EventSchedulerPlugin];
  grid.columns = [];
  table.theme = isDark() ? 'darkMaterial' : 'material';
  const disconnectTheme = observeCurrentTheme((darkTheme) => {
    const theme = darkTheme ? 'darkMaterial' : 'material';
    grid.theme = theme;
    table.theme = theme;
  });
  table.hideAttribution = true;
  table.readonly = true;
  table.plugins = [AdvanceFilterPlugin, ColumnStretchPlugin, RowOddPlugin];
  table.columns = getShiftWeekTableColumns();
  table.filter = {};
  table.stretch = 'all';
  const getHighlightedEventIds = () => getShiftWeekSearchMatchIds(grid.eventSchedulerEvents ?? [], searchQuery);
  grid.eventScheduler = createShiftWeekConfig(activeView, anchorDate, activeCalendar, selectedEventIds, getHighlightedEventIds(), workspaceView);
  grid.eventSchedulerEvents = createShiftWeekEvents(activeView, anchorDate);
  grid.eventSchedulerResources = shiftResources.map((resource) => ({ ...resource }));
  table.className = 'event-scheduler-shift-week-table';
  table.setAttribute('role', 'region');
  table.setAttribute('aria-label', 'Scheduled events table');
  table.hidden = true;

  const applySchedulerConfig = () => {
    grid.eventScheduler = createShiftWeekConfig(activeView, anchorDate, activeCalendar, selectedEventIds, getHighlightedEventIds(), workspaceView);
  };
  const renderSidebar = () => {
    sidebar.model = { workspaceView, searchQuery, teamMembers: shiftWeekTeamMembers };
  };
  const renderTable = () => {
    table.source = getShiftWeekTableRows(grid.eventSchedulerEvents ?? []);
  };
  const renderNewEventDialog = () => {
    dialog.model = newEventForm ? {
      form: newEventForm,
      teamMembers: shiftWeekTeamMembers,
      typeOptions: shiftWeekNewEventTypeOptions,
      statusOptions: shiftWeekNewEventStatusOptions,
    } : null;
  };
  const openNewEvent = () => {
    newEventForm = getShiftWeekNewEventDefaults(activeView, anchorDate);
    renderNewEventDialog();
  };
  const closeNewEvent = () => {
    newEventForm = null;
    renderNewEventDialog();
  };
  const renderWorkspace = () => {
    const tableActive = workspaceView === 'table';
    const headerHidden = tableActive || workspaceView === 'resource';
    header.classList.toggle('event-scheduler-shift-week-toolbar--hidden', headerHidden);
    grid.classList.toggle('event-scheduler-shift-week-grid--hidden', tableActive);
    grid.hidden = tableActive;
    table.hidden = !tableActive;
    if (tableActive) renderTable();
    renderSidebar();
  };
  const refreshRange = () => {
    selectedEventIds = [];
    grid.eventSchedulerEvents = createShiftWeekEvents(activeView, anchorDate);
    applySchedulerConfig();
    renderToolbar();
    renderWorkspace();
  };
  const setView = (view: ShiftWeekDemoView) => {
    activeView = view === 'resource' ? 'week' : view;
    if (view === 'resource') {
      workspaceView = 'resource';
    }
    anchorDate = normalizeShiftWeekAnchorDate(view, anchorDate);
    refreshRange();
  };
  const setWorkspace = (view: ShiftWeekWorkspaceView) => {
    workspaceView = view;
    if (view === 'resource') {
      anchorDate = normalizeShiftWeekAnchorDate(activeView, anchorDate);
      refreshRange();
      return;
    }
    if (view === 'calendar' && activeView === 'resource') {
      activeView = 'week';
      refreshRange();
      return;
    }
    applySchedulerConfig();
    renderWorkspace();
  };
  const renderToolbar = () => {
    header.model = {
      activeView,
      activeCalendar,
      title: getShiftWeekRangeTitle(activeView, anchorDate),
      subtitle: getShiftWeekSubtitle(anchorDate),
      views: shiftWeekDemoViews,
      viewLabels: shiftWeekViewLabels,
      calendarOptions: shiftWeekCalendarOptions,
    };
  };
  const moveRange = (direction: -1 | 1) => {
    anchorDate = navigateShiftWeekAnchorDate(activeView, anchorDate, direction);
    refreshRange();
  };
  header.addEventListener('scheduler-header-navigate', (event) => {
    const { action } = (event as CustomEvent<SchedulerHeaderNavigateDetail>).detail;
    if (action === 'previous') moveRange(-1);
    else if (action === 'next') moveRange(1);
    else {
      anchorDate = getTodayAnchorDate(activeView);
      refreshRange();
    }
  });
  header.addEventListener('scheduler-header-view-change', (event) => {
    setView((event as CustomEvent<SchedulerHeaderViewChangeDetail>).detail.view);
  });
  header.addEventListener('scheduler-header-calendar-change', (event) => {
    activeCalendar = (event as CustomEvent<SchedulerHeaderCalendarChangeDetail>).detail.calendar;
    refreshRange();
  });
  sidebar.addEventListener('scheduler-sidebar-workspace-change', (event) => {
    setWorkspace((event as CustomEvent<SchedulerSidebarWorkspaceChangeDetail>).detail.view);
  });
  sidebar.addEventListener('scheduler-sidebar-new-event', openNewEvent);
  sidebar.addEventListener('scheduler-sidebar-search-change', (event) => {
    searchQuery = (event as CustomEvent<SchedulerSidebarSearchChangeDetail>).detail.query;
    applySchedulerConfig();
    renderTable();
  });
  dialog.addEventListener('scheduler-dialog-close', closeNewEvent);
  dialog.addEventListener('scheduler-dialog-submit', (event) => {
    newEventForm = (event as CustomEvent<SchedulerDialogSubmitDetail>).detail.form;
    grid.eventSchedulerEvents = [
      ...(grid.eventSchedulerEvents ?? []),
      createShiftWeekManualEvent(newEventForm),
    ];
    applySchedulerConfig();
    closeNewEvent();
    renderTable();
  });
  const syncEvents = (event: Event) => {
    grid.eventSchedulerEvents = [...(event as CustomEvent<{ events: typeof grid.eventSchedulerEvents }>).detail.events];
    applySchedulerConfig();
    renderTable();
  };
  const handleBeforeEventSelect = (event: Event) => {
    event.preventDefault();
    selectedEventIds = [...(event as CustomEvent<EventSchedulerEventSelectedDetail>).detail.eventIds];
    applySchedulerConfig();
  };
  const handleNavigateRequest = (event: Event) => {
    const action = (event as CustomEvent<{ action: 'previous' | 'next' | 'today' }>).detail.action;
    if (action === 'previous') {
      moveRange(-1);
    } else if (action === 'next') {
      moveRange(1);
    } else {
      anchorDate = getTodayAnchorDate(activeView);
      refreshRange();
    }
  };
  const handleViewRequest = (event: Event) => {
    const view = (event as CustomEvent<{ view: ShiftWeekDemoView }>).detail.view;
    if (view === 'day' || view === 'week' || view === 'month' || view === 'resource') {
      setView(view);
    }
  };
  const handleOpenShiftAssignRequest = (event: Event) => {
    grid.eventSchedulerEvents = [
      ...(grid.eventSchedulerEvents ?? []),
      createShiftWeekAssignedOpenShift((event as CustomEvent<Parameters<typeof createShiftWeekAssignedOpenShift>[0]>).detail),
    ];
    applySchedulerConfig();
    renderTable();
  };
  const handleResourceReassignRequest = (event: Event) => {
    grid.eventSchedulerEvents = [
      ...reassignShiftWeekEvent(
        grid.eventSchedulerEvents ?? [],
        (event as CustomEvent<Parameters<typeof reassignShiftWeekEvent>[1]>).detail,
      ),
    ];
    applySchedulerConfig();
    renderTable();
  };
  grid.addEventListener('event-scheduler-event-created', syncEvents);
  grid.addEventListener('event-scheduler-event-changed', syncEvents);
  grid.addEventListener('event-scheduler-event-deleted', syncEvents);
  grid.addEventListener('event-scheduler-before-event-select', handleBeforeEventSelect);
  grid.addEventListener('event-scheduler-navigate-request', handleNavigateRequest);
  grid.addEventListener('event-scheduler-open-shift-assign-request', handleOpenShiftAssignRequest);
  grid.addEventListener('event-scheduler-resource-reassign-request', handleResourceReassignRequest);
  grid.addEventListener('event-scheduler-view-request', handleViewRequest);

  renderToolbar();
  renderSidebar();
  renderWorkspace();
  renderNewEventDialog();
  main.append(header, grid, table);
  root.append(sidebar, main, dialog);
  parent.appendChild(root);

  grid.source = [];

  return () => {
    disconnectTheme();
    grid.removeEventListener('event-scheduler-event-created', syncEvents);
    grid.removeEventListener('event-scheduler-event-changed', syncEvents);
    grid.removeEventListener('event-scheduler-event-deleted', syncEvents);
    grid.removeEventListener('event-scheduler-before-event-select', handleBeforeEventSelect);
    grid.removeEventListener('event-scheduler-navigate-request', handleNavigateRequest);
    grid.removeEventListener('event-scheduler-open-shift-assign-request', handleOpenShiftAssignRequest);
    grid.removeEventListener('event-scheduler-resource-reassign-request', handleResourceReassignRequest);
    grid.removeEventListener('event-scheduler-view-request', handleViewRequest);
    root.remove();
  };
}
