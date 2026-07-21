import { defineCustomElements } from '@revolist/revogrid/loader';
defineCustomElements();

import { EventSchedulerPlugin, type EventSchedulerEntityId, type EventSchedulerEventSelectedDetail } from '@revolist/revogrid-enterprise';
import { AdvanceFilterPlugin, ColumnStretchPlugin, RowOddPlugin } from '@revolist/revogrid-pro';
import { currentTheme } from '../../composables/useRandomData';
import {
  createShiftWeekAssignedOpenShift,
  createShiftWeekConfig,
  createShiftWeekEvents,
  createShiftWeekManualEvent,
  getShiftWeekCalendarDescription,
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
import './styles.scss';

const { isDark } = currentTheme();

export function load(parentSelector: string) {
  const parent = document.querySelector(parentSelector);
  if (!parent) {
    return () => {};
  }

  const root = document.createElement('section');
  const sidebar = document.createElement('aside');
  const main = document.createElement('div');
  const toolbar = document.createElement('div');
  const nav = document.createElement('div');
  const previousButton = document.createElement('button');
  const nextButton = document.createElement('button');
  const todayButton = document.createElement('button');
  const heading = document.createElement('div');
  const title = document.createElement('strong');
  const subtitle = document.createElement('span');
  const views = document.createElement('div');
  const calendarField = document.createElement('label');
  const calendarLabel = document.createElement('span');
  const calendarSelect = document.createElement('select');
  const calendarDescription = document.createElement('small');
  const grid = document.createElement('revo-grid');
  const table = document.createElement('revo-grid');
  const dialogHost = document.createElement('div');
  let activeView: ShiftWeekDemoView = initialShiftWeekDemoView;
  let workspaceView: ShiftWeekWorkspaceView = initialShiftWeekWorkspaceView;
  let activeCalendar: ShiftWeekDemoCalendar = initialShiftWeekCalendar;
  let anchorDate = initialShiftWeekAnchorDate;
  let selectedEventIds: readonly EventSchedulerEntityId[] = [];
  let searchQuery = '';
  let newEventForm: ShiftWeekNewEventForm | null = null;

  root.className = 'event-scheduler-shift-week-demo';
  sidebar.className = 'event-scheduler-shift-week-sidebar';
  sidebar.setAttribute('aria-label', 'Scheduler navigation');
  main.className = 'event-scheduler-shift-week-main';
  toolbar.className = 'event-scheduler-shift-week-toolbar';
  toolbar.setAttribute('aria-label', 'Shift scheduler navigation');
  nav.className = 'event-scheduler-shift-week-toolbar__nav';
  previousButton.type = 'button';
  previousButton.className = 'event-scheduler-shift-week-toolbar__icon';
  previousButton.setAttribute('aria-label', 'Previous range');
  previousButton.textContent = '<';
  nextButton.type = 'button';
  nextButton.className = 'event-scheduler-shift-week-toolbar__icon';
  nextButton.setAttribute('aria-label', 'Next range');
  nextButton.textContent = '>';
  todayButton.type = 'button';
  todayButton.className = 'event-scheduler-shift-week-toolbar__today';
  todayButton.textContent = 'Today';
  heading.className = 'event-scheduler-shift-week-toolbar__heading';
  views.className = 'event-scheduler-shift-week-toolbar__views';
  views.setAttribute('role', 'group');
  views.setAttribute('aria-label', 'Scheduler view');
  calendarField.className = 'event-scheduler-shift-week-toolbar__calendar';
  calendarLabel.textContent = 'Calendar';
  calendarSelect.setAttribute('aria-label', 'Calendar preset');
  for (const option of shiftWeekCalendarOptions) {
    const item = document.createElement('option');
    item.value = option.id;
    item.textContent = option.label;
    calendarSelect.append(item);
  }
  calendarSelect.value = activeCalendar;
  grid.className = 'event-scheduler-shift-week-grid';
  grid.theme = isDark() ? 'darkMaterial' : 'material';
  grid.hideAttribution = true;
  grid.plugins = [EventSchedulerPlugin];
  grid.columns = [];
  table.theme = isDark() ? 'darkMaterial' : 'material';
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
    sidebar.innerHTML = `
      <div class="event-scheduler-shift-week-brand">
        <span class="event-scheduler-shift-week-brand__mark">OS</span>
        <span class="event-scheduler-shift-week-brand__copy">
          <strong>Ops Studio</strong>
          <small>Workspace</small>
        </span>
      </div>
      <button type="button" class="event-scheduler-shift-week-new-event" data-shift-week-new-event>New event</button>
      <label class="event-scheduler-shift-week-search">
        <span>Search</span>
        <input type="search" placeholder="Search..." value="${escapeHtml(searchQuery)}" data-shift-week-search />
      </label>
      <nav class="event-scheduler-shift-week-nav" aria-label="Scheduler sections">
        <span>Views</span>
        ${[
          ['calendar', 'Calendar'],
          ['resource', 'Resource'],
          ['table', 'Table'],
        ].map(([view, label]) => `
          <button
            type="button"
            class="event-scheduler-shift-week-nav__item ${workspaceView === view ? 'event-scheduler-shift-week-nav__item--active' : ''}"
            aria-pressed="${workspaceView === view}"
            data-shift-week-workspace="${view}"
          >${label}</button>
        `).join('')}
      </nav>
      <div class="event-scheduler-shift-week-team">
        <span>Team</span>
        ${shiftWeekTeamMembers.map((member) => `
          <div class="event-scheduler-shift-week-team__row">
            <span class="event-scheduler-shift-week-avatar" style="--shift-week-avatar-color:${member.color}">${member.initials}</span>
            <strong>${member.name}</strong>
            <small>${member.count}</small>
          </div>
        `).join('')}
      </div>
    `;
    sidebar.querySelectorAll<HTMLButtonElement>('[data-shift-week-workspace]').forEach((button) => {
      button.addEventListener('click', () => setWorkspace(button.dataset.shiftWeekWorkspace as ShiftWeekWorkspaceView));
    });
    sidebar.querySelector<HTMLButtonElement>('[data-shift-week-new-event]')?.addEventListener('click', openNewEvent);
    sidebar.querySelector<HTMLInputElement>('[data-shift-week-search]')?.addEventListener('input', (event) => {
      searchQuery = (event.currentTarget as HTMLInputElement).value;
      applySchedulerConfig();
      renderTable();
    });
  };
  const renderTable = () => {
    table.source = getShiftWeekTableRows(grid.eventSchedulerEvents ?? []);
  };
  const renderNewEventDialog = () => {
    if (!newEventForm) {
      dialogHost.replaceChildren();
      return;
    }
    dialogHost.innerHTML = `
      <div class="event-scheduler-shift-week-dialog" role="dialog" aria-modal="true" aria-labelledby="shift-week-new-event-title">
        <form class="event-scheduler-shift-week-dialog__panel" data-shift-week-new-event-form>
          <div class="event-scheduler-shift-week-dialog__header">
            <div>
              <strong id="shift-week-new-event-title">New event</strong>
              <span>${newEventForm.date} · ${newEventForm.startTime}-${newEventForm.endTime}</span>
            </div>
            <button type="button" class="event-scheduler-shift-week-dialog__close" aria-label="Close new event" data-shift-week-new-event-close>×</button>
          </div>
          <div class="event-scheduler-shift-week-dialog__body">
            <label class="event-scheduler-shift-week-dialog__field event-scheduler-shift-week-dialog__field--wide">
              <span>Event</span>
              <input name="title" value="${escapeHtml(newEventForm.title)}">
            </label>
            <label class="event-scheduler-shift-week-dialog__field">
              <span>Date</span>
              <input name="date" type="date" value="${newEventForm.date}">
            </label>
            <label class="event-scheduler-shift-week-dialog__field">
              <span>Assignee</span>
              <select name="resourceId">
                ${shiftWeekTeamMembers.map((member) => `<option value="${String(member.id)}" ${String(member.id) === String(newEventForm?.resourceId) ? 'selected' : ''}>${member.name}</option>`).join('')}
              </select>
            </label>
            <label class="event-scheduler-shift-week-dialog__field">
              <span>Start</span>
              <input name="startTime" type="time" step="1800" value="${newEventForm.startTime}">
            </label>
            <label class="event-scheduler-shift-week-dialog__field">
              <span>End</span>
              <input name="endTime" type="time" step="1800" value="${newEventForm.endTime}">
            </label>
            <label class="event-scheduler-shift-week-dialog__field">
              <span>Type</span>
              <select name="type">
                ${shiftWeekNewEventTypeOptions.map((option) => `<option value="${option.id}" ${option.id === newEventForm?.type ? 'selected' : ''}>${option.label}</option>`).join('')}
              </select>
            </label>
            <label class="event-scheduler-shift-week-dialog__field">
              <span>Status</span>
              <select name="status">
                ${shiftWeekNewEventStatusOptions.map((option) => `<option value="${option.id}" ${option.id === newEventForm?.status ? 'selected' : ''}>${option.label}</option>`).join('')}
              </select>
            </label>
          </div>
          <div class="event-scheduler-shift-week-dialog__actions">
            <button type="button" class="event-scheduler-shift-week-dialog__cancel" data-shift-week-new-event-close>Cancel</button>
            <button type="submit" class="event-scheduler-shift-week-dialog__submit">Create event</button>
          </div>
        </form>
      </div>
    `;
    dialogHost.querySelectorAll<HTMLButtonElement>('[data-shift-week-new-event-close]').forEach((button) => {
      button.addEventListener('click', closeNewEvent);
    });
    dialogHost.querySelector<HTMLFormElement>('[data-shift-week-new-event-form]')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      newEventForm = {
        title: String(form.get('title') ?? 'New event'),
        date: String(form.get('date') ?? anchorDate),
        startTime: String(form.get('startTime') ?? '09:00'),
        endTime: String(form.get('endTime') ?? '10:00'),
        resourceId: String(form.get('resourceId') ?? 'jamie'),
        type: String(form.get('type') ?? 'scheduled') as ShiftWeekNewEventForm['type'],
        status: String(form.get('status') ?? 'confirmed') as ShiftWeekNewEventForm['status'],
      };
      grid.eventSchedulerEvents = [
        ...(grid.eventSchedulerEvents ?? []),
        createShiftWeekManualEvent(newEventForm),
      ];
      applySchedulerConfig();
      closeNewEvent();
      renderTable();
    });
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
    const toolbarHidden = tableActive || workspaceView === 'resource';
    toolbar.classList.toggle('event-scheduler-shift-week-toolbar--hidden', toolbarHidden);
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
    title.textContent = getShiftWeekRangeTitle(activeView, anchorDate);
    subtitle.textContent = getShiftWeekSubtitle(anchorDate);
    calendarDescription.textContent = getShiftWeekCalendarDescription(activeCalendar);
    views.replaceChildren(...shiftWeekDemoViews.map((view) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = [
        'event-scheduler-shift-week-toolbar__view',
        activeView === view ? 'event-scheduler-shift-week-toolbar__view--active' : '',
      ].filter(Boolean).join(' ');
      button.setAttribute('aria-pressed', String(activeView === view));
      button.textContent = shiftWeekViewLabels[view];
      button.addEventListener('click', () => {
        setView(view);
      });
      return button;
    }));
  };
  const moveRange = (direction: -1 | 1) => {
    anchorDate = navigateShiftWeekAnchorDate(activeView, anchorDate, direction);
    refreshRange();
  };
  previousButton.addEventListener('click', () => moveRange(-1));
  nextButton.addEventListener('click', () => moveRange(1));
  calendarSelect.addEventListener('change', () => {
    activeCalendar = calendarSelect.value as ShiftWeekDemoCalendar;
    refreshRange();
  });
  todayButton.addEventListener('click', () => {
    anchorDate = getTodayAnchorDate(activeView);
    refreshRange();
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

  nav.append(previousButton, nextButton, todayButton);
  heading.append(title, subtitle);
  calendarField.append(calendarLabel, calendarSelect, calendarDescription);
  toolbar.append(nav, heading, views, calendarField);
  renderToolbar();
  renderSidebar();
  renderWorkspace();
  main.append(toolbar, grid, table);
  root.append(sidebar, main, dialogHost);
  parent.appendChild(root);

  grid.source = [];

  return () => {
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

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return '&#39;';
    }
  });
}
