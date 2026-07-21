import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RevoGrid } from '@revolist/react-datagrid';
import { EventSchedulerPlugin, type EventSchedulerEntityId, type EventSchedulerEventChangedDetail, type EventSchedulerEventEntity, type EventSchedulerEventSelectedDetail, type EventSchedulerOpenShiftAssignRequestDetail, type EventSchedulerResourceReassignRequestDetail } from '@revolist/revogrid-enterprise';
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

export default function EventSchedulerShiftWeek() {
  const shellRef = useRef<HTMLElement | null>(null);
  const gridRef = useRef<HTMLRevoGridElement | null>(null);
  const sidebarRef = useRef<SchedulerSidebarElement | null>(null);
  const headerRef = useRef<SchedulerHeaderElement | null>(null);
  const dialogRef = useRef<SchedulerDialogElement | null>(null);
  const [isDark, setIsDark] = useState(() => currentTheme().isDark());
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
  const showToolbar = workspaceView === 'calendar';
  const sidebarModel = useMemo(() => ({ workspaceView, searchQuery, teamMembers: shiftWeekTeamMembers }), [workspaceView, searchQuery]);
  const headerModel = useMemo(() => ({
    activeView,
    activeCalendar,
    title: rangeTitle,
    subtitle: rangeSubtitle,
    views: shiftWeekDemoViews,
    viewLabels: shiftWeekViewLabels,
    calendarOptions: shiftWeekCalendarOptions,
  }), [activeView, activeCalendar, rangeTitle, rangeSubtitle]);
  const dialogModel = useMemo(() => newEventForm ? ({
    form: newEventForm,
    teamMembers: shiftWeekTeamMembers,
    typeOptions: shiftWeekNewEventTypeOptions,
    statusOptions: shiftWeekNewEventStatusOptions,
  }) : null, [newEventForm]);

  useEffect(() => observeCurrentTheme(setIsDark), []);

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

  useEffect(() => {
    if (sidebarRef.current) sidebarRef.current.model = sidebarModel;
  }, [sidebarModel]);

  useEffect(() => {
    if (headerRef.current) headerRef.current.model = headerModel;
  }, [headerModel, showToolbar]);

  useEffect(() => {
    if (dialogRef.current) dialogRef.current.model = dialogModel;
  }, [dialogModel]);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return undefined;
    const handleNewEvent = () => openNewEvent();
    const handleSearch = (event: Event) => setSearchQuery((event as CustomEvent<SchedulerSidebarSearchChangeDetail>).detail.query);
    const handleWorkspace = (event: Event) => setWorkspace((event as CustomEvent<SchedulerSidebarWorkspaceChangeDetail>).detail.view);
    const handleNavigate = (event: Event) => {
      const { action } = (event as CustomEvent<SchedulerHeaderNavigateDetail>).detail;
      if (action === 'previous') goPrevious();
      else if (action === 'next') goNext();
      else goToday();
    };
    const handleView = (event: Event) => setView((event as CustomEvent<SchedulerHeaderViewChangeDetail>).detail.view);
    const handleCalendar = (event: Event) => setCalendar((event as CustomEvent<SchedulerHeaderCalendarChangeDetail>).detail.calendar);
    const handleDialogClose = () => setNewEventForm(null);
    const handleDialogSubmit = (event: Event) => {
      const { form } = (event as CustomEvent<SchedulerDialogSubmitDetail>).detail;
      setEvents((currentEvents) => [...currentEvents, createShiftWeekManualEvent(form)]);
      setNewEventForm(null);
    };
    shell.addEventListener('scheduler-sidebar-new-event', handleNewEvent);
    shell.addEventListener('scheduler-sidebar-search-change', handleSearch);
    shell.addEventListener('scheduler-sidebar-workspace-change', handleWorkspace);
    shell.addEventListener('scheduler-header-navigate', handleNavigate);
    shell.addEventListener('scheduler-header-view-change', handleView);
    shell.addEventListener('scheduler-header-calendar-change', handleCalendar);
    shell.addEventListener('scheduler-dialog-close', handleDialogClose);
    shell.addEventListener('scheduler-dialog-submit', handleDialogSubmit);
    return () => {
      shell.removeEventListener('scheduler-sidebar-new-event', handleNewEvent);
      shell.removeEventListener('scheduler-sidebar-search-change', handleSearch);
      shell.removeEventListener('scheduler-sidebar-workspace-change', handleWorkspace);
      shell.removeEventListener('scheduler-header-navigate', handleNavigate);
      shell.removeEventListener('scheduler-header-view-change', handleView);
      shell.removeEventListener('scheduler-header-calendar-change', handleCalendar);
      shell.removeEventListener('scheduler-dialog-close', handleDialogClose);
      shell.removeEventListener('scheduler-dialog-submit', handleDialogSubmit);
    };
  }, [goNext, goPrevious, goToday, openNewEvent, setCalendar, setView, setWorkspace]);

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
    <section ref={shellRef} className="event-scheduler-shift-week-demo">
      {React.createElement(SCHEDULER_SIDEBAR_TAG, { ref: sidebarRef })}
      <div className="event-scheduler-shift-week-main">
        {workspaceView === 'table' ? (
          <RevoGrid
            theme={isDark ? 'darkMaterial' : 'material'}
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
              React.createElement(SCHEDULER_HEADER_TAG, { ref: headerRef })
            ) : null}
            <RevoGrid
              ref={gridRef}
              className="event-scheduler-shift-week-grid"
              theme={isDark ? 'darkMaterial' : 'material'}
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
      {React.createElement(SCHEDULER_DIALOG_TAG, { ref: dialogRef })}
    </section>
  );
}
