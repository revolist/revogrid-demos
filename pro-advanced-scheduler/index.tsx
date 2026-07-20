import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RevoGrid } from '@revolist/react-datagrid';
import { EventSchedulerPlugin, type EventSchedulerEntityId, type EventSchedulerEventChangedDetail, type EventSchedulerEventEntity, type EventSchedulerEventSelectedDetail, type EventSchedulerOpenShiftAssignRequestDetail, type EventSchedulerResourceReassignRequestDetail } from '@revolist/revogrid-enterprise';
import { AdvanceFilterPlugin, ColumnStretchPlugin, RowOddPlugin } from '@revolist/revogrid-pro';
import { currentTheme } from '../../composables/useRandomData';
import {
  createShiftWeekAssignedOpenShift,
  createShiftWeekConfig,
  createShiftWeekEvents,
  createShiftWeekManualEvent,
  getShiftWeekNewEventDefaults,
  getShiftWeekRangeTitle,
  getShiftWeekSearchMatchIds,
  getShiftWeekSubtitle,
  getShiftWeekTableColumns,
  getShiftWeekTableRows,
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

export default function EventSchedulerShiftWeek() {
  const maxAppbarTeamMembers = 2;
  const gridRef = useRef<HTMLRevoGridElement | null>(null);
  const [activeView, setActiveViewState] = useState<ShiftWeekDemoView>(initialShiftWeekDemoView);
  const [workspaceView, setWorkspaceView] = useState<ShiftWeekWorkspaceView>(initialShiftWeekWorkspaceView);
  const [activeCalendar, setActiveCalendar] = useState<ShiftWeekDemoCalendar>(initialShiftWeekCalendar);
  const [anchorDate, setAnchorDate] = useState(initialShiftWeekAnchorDate);
  const [events, setEvents] = useState<readonly EventSchedulerEventEntity[]>(() => createShiftWeekEvents(initialShiftWeekDemoView, initialShiftWeekAnchorDate));
  const [selectedEventIds, setSelectedEventIds] = useState<readonly EventSchedulerEntityId[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newEventForm, setNewEventForm] = useState<ShiftWeekNewEventForm | null>(null);
  const plugins = useMemo(() => [EventSchedulerPlugin], []);
  const tablePlugins = useMemo(() => [AdvanceFilterPlugin, ColumnStretchPlugin, RowOddPlugin], []);
  const tableColumns = useMemo(() => getShiftWeekTableColumns(), []);
  const columnTypes = useMemo(() => ({}), []);
  const additionalData = useMemo(() => ({}), []);
  const resources = useMemo(() => shiftResources.map((resource) => ({ ...resource })), []);
  const highlightedEventIds = useMemo(() => getShiftWeekSearchMatchIds(events, searchQuery), [events, searchQuery]);
  const schedulerConfig = useMemo(
    () => createShiftWeekConfig(activeView, anchorDate, activeCalendar, selectedEventIds, highlightedEventIds, workspaceView),
    [activeView, anchorDate, activeCalendar, selectedEventIds, highlightedEventIds, workspaceView],
  );
  const rangeTitle = useMemo(() => getShiftWeekRangeTitle(activeView, anchorDate), [activeView, anchorDate]);
  const rangeSubtitle = useMemo(() => getShiftWeekSubtitle(anchorDate), [anchorDate]);
  const tableRows = useMemo(() => getShiftWeekTableRows(events), [events]);
  const appbarTeamMembers = useMemo(() => shiftWeekTeamMembers.slice(0, maxAppbarTeamMembers), []);
  const appbarTeamOverflow = useMemo(() => Math.max(shiftWeekTeamMembers.length - maxAppbarTeamMembers, 0), []);
  const showToolbar = workspaceView === 'calendar';

  const resetEvents = useCallback((view: ShiftWeekDemoView, date: string) => {
    setEvents(createShiftWeekEvents(view, date));
  }, []);

  const setView = useCallback((view: ShiftWeekDemoView) => {
    const nextView = view === 'resource' ? 'week' : view;
    const normalizedAnchor = normalizeShiftWeekAnchorDate(view, anchorDate);
    setActiveViewState(nextView);
    if (view === 'resource') {
      setWorkspaceView('resource');
    }
    setAnchorDate(normalizedAnchor);
    setSelectedEventIds([]);
    resetEvents(nextView, normalizedAnchor);
  }, [anchorDate, resetEvents]);

  const setWorkspace = useCallback((view: ShiftWeekWorkspaceView) => {
    setWorkspaceView(view);
    if (view === 'resource') {
      const normalizedAnchor = normalizeShiftWeekAnchorDate(activeView, anchorDate);
      setAnchorDate(normalizedAnchor);
      setSelectedEventIds([]);
      resetEvents(activeView, normalizedAnchor);
      return;
    }
    if (view === 'calendar' && activeView === 'resource') {
      setActiveViewState('week');
    }
  }, [activeView, anchorDate, resetEvents]);

  const goPrevious = useCallback(() => {
    const nextAnchor = navigateShiftWeekAnchorDate(activeView, anchorDate, -1);
    setAnchorDate(nextAnchor);
    setSelectedEventIds([]);
    resetEvents(activeView, nextAnchor);
  }, [activeView, anchorDate, resetEvents]);

  const goNext = useCallback(() => {
    const nextAnchor = navigateShiftWeekAnchorDate(activeView, anchorDate, 1);
    setAnchorDate(nextAnchor);
    setSelectedEventIds([]);
    resetEvents(activeView, nextAnchor);
  }, [activeView, anchorDate, resetEvents]);

  const goToday = useCallback(() => {
    const nextAnchor = getTodayAnchorDate(activeView);
    setAnchorDate(nextAnchor);
    setSelectedEventIds([]);
    resetEvents(activeView, nextAnchor);
  }, [activeView, resetEvents]);

  const setCalendar = useCallback((calendar: ShiftWeekDemoCalendar) => {
    setActiveCalendar(calendar);
    setSelectedEventIds([]);
    resetEvents(activeView, anchorDate);
  }, [activeView, anchorDate, resetEvents]);

  const openNewEvent = useCallback(() => {
    setNewEventForm(getShiftWeekNewEventDefaults(activeView, anchorDate));
  }, [activeView, anchorDate]);

  const updateNewEventForm = useCallback(<Key extends keyof ShiftWeekNewEventForm>(key: Key, value: ShiftWeekNewEventForm[Key]) => {
    setNewEventForm((current) => current ? { ...current, [key]: value } : current);
  }, []);

  const submitNewEvent = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newEventForm) return;
    setEvents((currentEvents) => [
      ...currentEvents,
      createShiftWeekManualEvent(newEventForm),
    ]);
    setNewEventForm(null);
  }, [newEventForm]);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return undefined;
    const syncEvents = (event: Event) => {
      setEvents([...(event as CustomEvent<EventSchedulerEventChangedDetail>).detail.events]);
    };
    const handleBeforeEventSelect = (event: Event) => {
      event.preventDefault();
      setSelectedEventIds([...(event as CustomEvent<EventSchedulerEventSelectedDetail>).detail.eventIds]);
    };
    const handleNavigateRequest = (event: Event) => {
      const action = (event as CustomEvent<{ action: 'previous' | 'next' | 'today' }>).detail.action;
      if (action === 'previous') {
        goPrevious();
      } else if (action === 'next') {
        goNext();
      } else {
        goToday();
      }
    };
    const handleViewRequest = (event: Event) => {
      const view = (event as CustomEvent<{ view: ShiftWeekDemoView }>).detail.view;
      if (view === 'day' || view === 'week' || view === 'month' || view === 'resource') {
        setView(view);
      }
    };
    const handleOpenShiftAssignRequest = (event: Event) => {
      setEvents((currentEvents) => [
        ...currentEvents,
        createShiftWeekAssignedOpenShift((event as CustomEvent<EventSchedulerOpenShiftAssignRequestDetail>).detail),
      ]);
    };
    const handleResourceReassignRequest = (event: Event) => {
      setEvents((currentEvents) => [
        ...reassignShiftWeekEvent(
          currentEvents,
          (event as CustomEvent<EventSchedulerResourceReassignRequestDetail>).detail,
        ),
      ]);
    };
    grid.addEventListener('event-scheduler-event-created', syncEvents);
    grid.addEventListener('event-scheduler-event-changed', syncEvents);
    grid.addEventListener('event-scheduler-event-deleted', syncEvents);
    grid.addEventListener('event-scheduler-before-event-select', handleBeforeEventSelect);
    grid.addEventListener('event-scheduler-navigate-request', handleNavigateRequest);
    grid.addEventListener('event-scheduler-open-shift-assign-request', handleOpenShiftAssignRequest);
    grid.addEventListener('event-scheduler-resource-reassign-request', handleResourceReassignRequest);
    grid.addEventListener('event-scheduler-view-request', handleViewRequest);
    return () => {
      grid.removeEventListener('event-scheduler-event-created', syncEvents);
      grid.removeEventListener('event-scheduler-event-changed', syncEvents);
      grid.removeEventListener('event-scheduler-event-deleted', syncEvents);
      grid.removeEventListener('event-scheduler-before-event-select', handleBeforeEventSelect);
      grid.removeEventListener('event-scheduler-navigate-request', handleNavigateRequest);
      grid.removeEventListener('event-scheduler-open-shift-assign-request', handleOpenShiftAssignRequest);
      grid.removeEventListener('event-scheduler-resource-reassign-request', handleResourceReassignRequest);
      grid.removeEventListener('event-scheduler-view-request', handleViewRequest);
    };
  }, [goNext, goPrevious, goToday, setView]);

  return (
    <section className="event-scheduler-shift-week-demo">
      <aside className="event-scheduler-shift-week-sidebar" aria-label="Scheduler navigation">
        <div className="event-scheduler-shift-week-brand">
          <span className="event-scheduler-shift-week-brand__mark">OS</span>
          <span className="event-scheduler-shift-week-brand__copy">
            <strong>Ops Studio</strong>
            <small>Workspace</small>
          </span>
        </div>
        <button type="button" className="event-scheduler-shift-week-new-event" onClick={openNewEvent}>New event</button>
        <label className="event-scheduler-shift-week-search">
          <span>Search</span>
          <input type="search" placeholder="Search..." value={searchQuery} onChange={(event) => setSearchQuery(event.currentTarget.value)} />
        </label>
        <nav className="event-scheduler-shift-week-nav" aria-label="Scheduler sections">
          <span>Views</span>
          {[
            ['calendar', 'Calendar'],
            ['resource', 'Resource'],
            ['table', 'Table'],
          ].map(([view, label]) => (
            <button
              key={view}
              type="button"
              className={[
                'event-scheduler-shift-week-nav__item',
                workspaceView === view ? 'event-scheduler-shift-week-nav__item--active' : '',
              ].filter(Boolean).join(' ')}
              aria-pressed={workspaceView === view}
              onClick={() => setWorkspace(view as ShiftWeekWorkspaceView)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="event-scheduler-shift-week-team">
          <span>Team</span>
          {shiftWeekTeamMembers.map((member) => (
            <div key={String(member.id)} className="event-scheduler-shift-week-team__row">
              <span className="event-scheduler-shift-week-avatar" style={{ '--shift-week-avatar-color': member.color } as React.CSSProperties}>{member.initials}</span>
              <strong>{member.name}</strong>
              <small>{member.count}</small>
            </div>
          ))}
        </div>
      </aside>
      <div className="event-scheduler-shift-week-main">
        <header className="event-scheduler-shift-week-appbar">
          <div className="event-scheduler-shift-week-appbar__title">
            <strong>Scheduler JavaScript Calendar</strong>
            <span>On track</span>
          </div>
          <div className="event-scheduler-shift-week-appbar__actions">
            <span className="event-scheduler-shift-week-avatar-stack" aria-hidden="true">
              {appbarTeamMembers.map((member) => (
                <span key={String(member.id)} style={{ '--shift-week-avatar-color': member.color } as React.CSSProperties}>{member.initials}</span>
              ))}
              {appbarTeamOverflow > 0 ? <small>+{appbarTeamOverflow}</small> : null}
            </span>
          </div>
        </header>
        {workspaceView === 'table' ? (
          <RevoGrid
            theme={isDark() ? 'darkMaterial' : 'material'}
            hideAttribution
            readonly
            plugins={tablePlugins}
            filter={{}}
            source={tableRows}
            columns={tableColumns}
            className="event-scheduler-shift-week-table"
          />
        ) : (
          <>
            {showToolbar ? (
              <div className="event-scheduler-shift-week-toolbar" aria-label="Shift scheduler navigation">
                <div className="event-scheduler-shift-week-toolbar__nav">
                  <button type="button" className="event-scheduler-shift-week-toolbar__icon" aria-label="Previous range" onClick={goPrevious}>{'‹'}</button>
                  <button type="button" className="event-scheduler-shift-week-toolbar__icon" aria-label="Next range" onClick={goNext}>{'›'}</button>
                  <button type="button" className="event-scheduler-shift-week-toolbar__today" onClick={goToday}>Today</button>
                </div>
                <div className="event-scheduler-shift-week-toolbar__heading">
                  <strong>{rangeTitle}</strong>
                  <span>{rangeSubtitle}</span>
                </div>
                <div className="event-scheduler-shift-week-toolbar__views" role="group" aria-label="Scheduler view">
                  {shiftWeekDemoViews.map((view) => (
                    <button
                      key={view}
                      type="button"
                      className={[
                        'event-scheduler-shift-week-toolbar__view',
                        activeView === view ? 'event-scheduler-shift-week-toolbar__view--active' : '',
                      ].filter(Boolean).join(' ')}
                      aria-pressed={activeView === view}
                      onClick={() => setView(view)}
                    >
                      {shiftWeekViewLabels[view]}
                    </button>
                  ))}
                </div>
                <label className="event-scheduler-shift-week-toolbar__calendar">
                  <span>Calendar</span>
                  <select
                    aria-label="Calendar preset"
                    value={activeCalendar}
                    onChange={(event) => setCalendar(event.currentTarget.value as ShiftWeekDemoCalendar)}
                  >
                    {shiftWeekCalendarOptions.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}
            <RevoGrid
              ref={gridRef}
              className="event-scheduler-shift-week-grid"
              theme={isDark() ? 'darkMaterial' : 'material'}
              hideAttribution
              plugins={plugins}
              source={[]}
              columns={[]}
              columnTypes={columnTypes}
              additionalData={additionalData}
              eventScheduler={schedulerConfig}
              eventSchedulerEvents={events}
              eventSchedulerResources={resources}
            />
          </>
        )}
      </div>
      {newEventForm ? (
        <div className="event-scheduler-shift-week-dialog" role="dialog" aria-modal="true" aria-labelledby="shift-week-new-event-title">
          <form className="event-scheduler-shift-week-dialog__panel" onSubmit={submitNewEvent}>
            <div className="event-scheduler-shift-week-dialog__header">
              <div>
                <strong id="shift-week-new-event-title">New event</strong>
                <span>{newEventForm.date} · {newEventForm.startTime}-{newEventForm.endTime}</span>
              </div>
              <button type="button" className="event-scheduler-shift-week-dialog__close" aria-label="Close new event" onClick={() => setNewEventForm(null)}>×</button>
            </div>
            <div className="event-scheduler-shift-week-dialog__body">
              <label className="event-scheduler-shift-week-dialog__field event-scheduler-shift-week-dialog__field--wide">
                <span>Event</span>
                <input value={newEventForm.title} onChange={(event) => updateNewEventForm('title', event.currentTarget.value)} />
              </label>
              <label className="event-scheduler-shift-week-dialog__field">
                <span>Date</span>
                <input type="date" value={newEventForm.date} onChange={(event) => updateNewEventForm('date', event.currentTarget.value)} />
              </label>
              <label className="event-scheduler-shift-week-dialog__field">
                <span>Assignee</span>
                <select value={String(newEventForm.resourceId)} onChange={(event) => updateNewEventForm('resourceId', event.currentTarget.value)}>
                  {shiftWeekTeamMembers.map((member) => (
                    <option key={String(member.id)} value={String(member.id)}>{member.name}</option>
                  ))}
                </select>
              </label>
              <label className="event-scheduler-shift-week-dialog__field">
                <span>Start</span>
                <input type="time" step="1800" value={newEventForm.startTime} onChange={(event) => updateNewEventForm('startTime', event.currentTarget.value)} />
              </label>
              <label className="event-scheduler-shift-week-dialog__field">
                <span>End</span>
                <input type="time" step="1800" value={newEventForm.endTime} onChange={(event) => updateNewEventForm('endTime', event.currentTarget.value)} />
              </label>
              <label className="event-scheduler-shift-week-dialog__field">
                <span>Type</span>
                <select value={newEventForm.type} onChange={(event) => updateNewEventForm('type', event.currentTarget.value as ShiftWeekNewEventForm['type'])}>
                  {shiftWeekNewEventTypeOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="event-scheduler-shift-week-dialog__field">
                <span>Status</span>
                <select value={newEventForm.status} onChange={(event) => updateNewEventForm('status', event.currentTarget.value as ShiftWeekNewEventForm['status'])}>
                  {shiftWeekNewEventStatusOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="event-scheduler-shift-week-dialog__actions">
              <button type="button" className="event-scheduler-shift-week-dialog__cancel" onClick={() => setNewEventForm(null)}>Cancel</button>
              <button type="submit" className="event-scheduler-shift-week-dialog__submit">Create event</button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
