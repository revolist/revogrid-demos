import { Component, NO_ERRORS_SCHEMA, OnDestroy, ViewEncapsulation } from '@angular/core';
import { NgIf } from '@angular/common';
import { RevoGrid } from '@revolist/angular-datagrid';
import { EventSchedulerPlugin, type EventSchedulerEntityId, type EventSchedulerEventChangedDetail, type EventSchedulerEventEntity, type EventSchedulerEventSelectedDetail, type EventSchedulerOpenShiftAssignRequestDetail, type EventSchedulerResourceReassignRequestDetail } from '@revolist/revogrid-enterprise';
import { AdvanceFilterPlugin, ColumnStretchPlugin, RowOddPlugin } from '@revolist/revogrid-pro';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import {
  createShiftWeekAssignedOpenShift,
  createShiftWeekConfig,
  createShiftWeekEvents,
  createShiftWeekManualEvent,
  getShiftWeekRangeTitle,
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
  defineSchedulerShellElements,
  type SchedulerDialogSubmitDetail,
  type SchedulerHeaderCalendarChangeDetail,
  type SchedulerHeaderNavigateDetail,
  type SchedulerHeaderViewChangeDetail,
  type SchedulerHeaderWorkspaceChangeDetail,
} from './components';

defineSchedulerShellElements();

@Component({
  selector: 'event-scheduler-shift-week-grid',
  standalone: true,
  schemas: [NO_ERRORS_SCHEMA],
  imports: [RevoGrid, NgIf],
  template: `
    <section class="event-scheduler-shift-week-demo">
      <div class="event-scheduler-shift-week-main">
        <revogr-scheduler-header
          [model]="headerModel"
          (scheduler-header-calendar-change)="handleHeaderCalendarChange($event)"
          (scheduler-header-navigate)="handleHeaderNavigate($event)"
          (scheduler-header-view-change)="handleHeaderViewChange($event)"
          (scheduler-header-workspace-change)="handleHeaderWorkspaceChange($event)"
        ></revogr-scheduler-header>
        <div *ngIf="workspaceView === 'table'; else schedulerGrid" class="event-scheduler-shift-week-table" role="region" aria-label="Scheduled events table">
          <revo-grid
            class="event-scheduler-shift-week-table__grid"
            [theme]="theme"
            [hideAttribution]="true"
            [readonly]="true"
            [plugins]="tablePlugins"
            [filter]="tableFilter"
            [source]="tableRows"
            [columns]="tableColumns"
          ></revo-grid>
        </div>
        <ng-template #schedulerGrid>
          <revo-grid
            class="event-scheduler-shift-week-grid"
            [theme]="theme"
            [hideAttribution]="true"
            [plugins]="plugins"
            [source]="rows"
            [columns]="columns"
            [eventScheduler]="schedulerConfig"
            [eventSchedulerEvents]="events"
            [eventSchedulerResources]="resources"
            (event-scheduler-event-created)="handleSchedulerEvents($event)"
            (event-scheduler-event-changed)="handleSchedulerEvents($event)"
            (event-scheduler-event-deleted)="handleSchedulerEvents($event)"
            (event-scheduler-before-event-select)="handleBeforeEventSelect($event)"
            (event-scheduler-navigate-request)="handleNavigateRequest($event)"
            (event-scheduler-open-shift-assign-request)="handleOpenShiftAssignRequest($event)"
            (event-scheduler-resource-reassign-request)="handleResourceReassignRequest($event)"
            (event-scheduler-view-request)="handleViewRequest($event)"
          ></revo-grid>
        </ng-template>
      </div>
      <revogr-scheduler-dialog
        [model]="dialogModel"
        (scheduler-dialog-close)="closeNewEvent()"
        (scheduler-dialog-submit)="handleDialogSubmit($event)"
      ></revogr-scheduler-dialog>
    </section>
  `,
  styleUrls: ['./styles.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class EventSchedulerShiftWeekGridComponent implements OnDestroy {
  theme = currentTheme().isDark() ? 'darkMaterial' : 'material';
  private readonly disconnectTheme = observeCurrentTheme((isDark) => {
    this.theme = isDark ? 'darkMaterial' : 'material';
  });
  plugins = [EventSchedulerPlugin];
  rows = [];
  columns = [];
  activeView: ShiftWeekDemoView = initialShiftWeekDemoView;
  workspaceView: ShiftWeekWorkspaceView = initialShiftWeekWorkspaceView;
  activeCalendar: ShiftWeekDemoCalendar = initialShiftWeekCalendar;
  anchorDate = initialShiftWeekAnchorDate;
  tablePlugins = [AdvanceFilterPlugin, ColumnStretchPlugin, RowOddPlugin];
  tableColumns = getShiftWeekTableColumns();
  tableFilter = {};
  teamMembers = shiftWeekTeamMembers;
  newEventStatusOptions = shiftWeekNewEventStatusOptions;
  newEventTypeOptions = shiftWeekNewEventTypeOptions;
  selectedEventIds: readonly EventSchedulerEntityId[] = [];
  schedulerConfig = createShiftWeekConfig(this.activeView, this.anchorDate, this.activeCalendar, this.selectedEventIds, [], this.workspaceView);
  events: readonly EventSchedulerEventEntity[] = createShiftWeekEvents(this.activeView, this.anchorDate);
  resources = shiftResources.map((resource) => ({ ...resource }));
  newEventForm: ShiftWeekNewEventForm | null = null;

  get rangeTitle() {
    return getShiftWeekRangeTitle(this.activeView, this.anchorDate);
  }

  get rangeSubtitle() {
    return getShiftWeekSubtitle(this.anchorDate, this.activeView);
  }

  get tableRows() {
    return getShiftWeekTableRows(this.events);
  }

  get headerModel() {
    return {
      workspaceView: this.workspaceView,
      activeView: this.activeView,
      activeCalendar: this.activeCalendar,
      title: this.rangeTitle,
      subtitle: this.rangeSubtitle,
      views: shiftWeekDemoViews,
      viewLabels: shiftWeekViewLabels,
      calendarOptions: shiftWeekCalendarOptions,
    };
  }

  get dialogModel() {
    return this.newEventForm ? {
      form: this.newEventForm,
      teamMembers: this.teamMembers,
      typeOptions: this.newEventTypeOptions,
      statusOptions: this.newEventStatusOptions,
    } : null;
  }

  setView(view: ShiftWeekDemoView, date = this.anchorDate) {
    this.activeView = view === 'resource' ? 'week' : view;
    if (view === 'resource') {
      this.workspaceView = 'resource';
    }
    this.anchorDate = normalizeShiftWeekAnchorDate(view, date);
    this.refreshRange();
  }

  setWorkspace(view: ShiftWeekWorkspaceView) {
    this.workspaceView = view;
    if (view === 'resource') {
      this.anchorDate = normalizeShiftWeekAnchorDate(this.activeView, this.anchorDate);
      this.refreshRange();
    } else if (view === 'calendar' && this.activeView === 'resource') {
      this.activeView = 'week';
      this.refreshRange();
    }
  }

  goPrevious() {
    this.anchorDate = navigateShiftWeekAnchorDate(this.activeView, this.anchorDate, -1);
    this.refreshRange();
  }

  goNext() {
    this.anchorDate = navigateShiftWeekAnchorDate(this.activeView, this.anchorDate, 1);
    this.refreshRange();
  }

  goToday() {
    this.anchorDate = getTodayAnchorDate(this.activeView);
    this.refreshRange();
  }

  setCalendar(calendar: ShiftWeekDemoCalendar) {
    this.activeCalendar = calendar;
    this.refreshRange();
  }

  closeNewEvent() {
    this.newEventForm = null;
  }

  handleHeaderWorkspaceChange(event: CustomEvent<SchedulerHeaderWorkspaceChangeDetail>) {
    this.setWorkspace(event.detail.view);
  }

  handleHeaderNavigate(event: CustomEvent<SchedulerHeaderNavigateDetail>) {
    this.handleNavigateRequest(event);
  }

  handleHeaderViewChange(event: CustomEvent<SchedulerHeaderViewChangeDetail>) {
    this.setView(event.detail.view);
  }

  handleHeaderCalendarChange(event: CustomEvent<SchedulerHeaderCalendarChangeDetail>) {
    this.setCalendar(event.detail.calendar);
  }

  handleDialogSubmit(event: CustomEvent<SchedulerDialogSubmitDetail>) {
    this.events = [
      ...this.events,
      createShiftWeekManualEvent(event.detail.form),
    ];
    this.refreshSchedulerConfig();
    this.closeNewEvent();
  }

  handleSchedulerEvents(event: CustomEvent<EventSchedulerEventChangedDetail>) {
    this.events = event.detail.events.map((item) => ({ ...item }));
    this.refreshSchedulerConfig();
  }

  handleBeforeEventSelect(event: CustomEvent<EventSchedulerEventSelectedDetail>) {
    event.preventDefault();
    this.selectedEventIds = [...event.detail.eventIds];
    this.refreshSchedulerConfig();
  }

  handleOpenShiftAssignRequest(event: CustomEvent<EventSchedulerOpenShiftAssignRequestDetail>) {
    this.events = [
      ...this.events,
      createShiftWeekAssignedOpenShift(event.detail),
    ];
    this.refreshSchedulerConfig();
  }

  handleResourceReassignRequest(event: CustomEvent<EventSchedulerResourceReassignRequestDetail>) {
    this.events = [
      ...reassignShiftWeekEvent(this.events, event.detail),
    ];
    this.refreshSchedulerConfig();
  }

  handleNavigateRequest(event: CustomEvent<{ action: 'previous' | 'next' | 'today' }>) {
    if (event.detail.action === 'previous') {
      this.goPrevious();
    } else if (event.detail.action === 'next') {
      this.goNext();
    } else {
      this.goToday();
    }
  }

  handleViewRequest(event: CustomEvent<{ view: ShiftWeekDemoView; date?: string }>) {
    if (event.detail.view === 'day' || event.detail.view === 'week' || event.detail.view === 'month' || event.detail.view === 'year' || event.detail.view === 'resource') {
      this.setView(event.detail.view, event.detail.date);
    }
  }

  private refreshRange() {
    this.selectedEventIds = [];
    this.events = createShiftWeekEvents(this.activeView, this.anchorDate);
    this.refreshSchedulerConfig();
  }

  private refreshSchedulerConfig() {
    this.schedulerConfig = createShiftWeekConfig(this.activeView, this.anchorDate, this.activeCalendar, this.selectedEventIds, [], this.workspaceView);
  }

  ngOnDestroy(): void {
    this.disconnectTheme();
  }
}
