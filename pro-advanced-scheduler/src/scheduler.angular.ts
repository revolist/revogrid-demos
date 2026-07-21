import { Component, NO_ERRORS_SCHEMA, ViewEncapsulation } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { RevoGrid } from '@revolist/angular-datagrid';
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

@Component({
  selector: 'event-scheduler-shift-week-grid',
  standalone: true,
  schemas: [NO_ERRORS_SCHEMA],
  imports: [RevoGrid, NgFor, NgIf],
  template: `
    <section class="event-scheduler-shift-week-demo">
      <aside class="event-scheduler-shift-week-sidebar" aria-label="Scheduler navigation">
        <div class="event-scheduler-shift-week-brand">
          <span class="event-scheduler-shift-week-brand__mark">OS</span>
          <span class="event-scheduler-shift-week-brand__copy">
            <strong>Ops Studio</strong>
            <small>Workspace</small>
          </span>
        </div>
        <button type="button" class="event-scheduler-shift-week-new-event" (click)="openNewEvent()">New event</button>
        <label class="event-scheduler-shift-week-search">
          <span>Search</span>
          <input type="search" placeholder="Search..." [value]="searchQuery" (input)="setSearchQuery($any($event.target).value)" />
        </label>
        <nav class="event-scheduler-shift-week-nav" aria-label="Scheduler sections">
          <span>Views</span>
          <button
            *ngFor="let item of workspaceViews"
            type="button"
            class="event-scheduler-shift-week-nav__item"
            [class.event-scheduler-shift-week-nav__item--active]="workspaceView === item.view"
            [attr.aria-pressed]="workspaceView === item.view"
            (click)="setWorkspace(item.view)"
          >
            {{ item.label }}
          </button>
        </nav>
        <div class="event-scheduler-shift-week-team">
          <span>Team</span>
          <div *ngFor="let member of teamMembers" class="event-scheduler-shift-week-team__row">
            <span class="event-scheduler-shift-week-avatar" [style.--shift-week-avatar-color]="member.color">{{ member.initials }}</span>
            <strong>{{ member.name }}</strong>
            <small>{{ member.count }}</small>
          </div>
        </div>
      </aside>
      <div class="event-scheduler-shift-week-main">
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
          <div *ngIf="showToolbar" class="event-scheduler-shift-week-toolbar" aria-label="Shift scheduler navigation">
            <div class="event-scheduler-shift-week-toolbar__nav">
              <button type="button" class="event-scheduler-shift-week-toolbar__icon" aria-label="Previous range" (click)="goPrevious()">‹</button>
              <button type="button" class="event-scheduler-shift-week-toolbar__icon" aria-label="Next range" (click)="goNext()">›</button>
              <button type="button" class="event-scheduler-shift-week-toolbar__today" (click)="goToday()">Today</button>
            </div>
            <div class="event-scheduler-shift-week-toolbar__heading">
              <strong>{{ rangeTitle }}</strong>
              <span>{{ rangeSubtitle }}</span>
            </div>
            <div class="event-scheduler-shift-week-toolbar__views" role="group" aria-label="Scheduler view">
              <button
                *ngFor="let view of viewKeys"
                type="button"
                class="event-scheduler-shift-week-toolbar__view"
                [class.event-scheduler-shift-week-toolbar__view--active]="activeView === view"
                [attr.aria-pressed]="activeView === view"
                (click)="setView(view)"
              >
                {{ viewLabels[view] }}
              </button>
            </div>
            <label class="event-scheduler-shift-week-toolbar__calendar">
              <span>Calendar</span>
              <select aria-label="Calendar preset" [value]="activeCalendar" (change)="setCalendar($any($event.target).value)">
                <option *ngFor="let option of calendarOptions" [value]="option.id">
                  {{ option.label }}
                </option>
              </select>
            </label>
          </div>
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
      <div *ngIf="newEventForm" class="event-scheduler-shift-week-dialog" role="dialog" aria-modal="true" aria-labelledby="shift-week-new-event-title">
        <form class="event-scheduler-shift-week-dialog__panel" (submit)="submitNewEvent($event)">
          <div class="event-scheduler-shift-week-dialog__header">
            <div>
              <strong id="shift-week-new-event-title">New event</strong>
              <span>{{ newEventForm.date }} · {{ newEventForm.startTime }}-{{ newEventForm.endTime }}</span>
            </div>
            <button type="button" class="event-scheduler-shift-week-dialog__close" aria-label="Close new event" (click)="closeNewEvent()">×</button>
          </div>
          <div class="event-scheduler-shift-week-dialog__body">
            <label class="event-scheduler-shift-week-dialog__field event-scheduler-shift-week-dialog__field--wide">
              <span>Event</span>
              <input [value]="newEventForm.title" (input)="updateNewEvent('title', $any($event.target).value)">
            </label>
            <label class="event-scheduler-shift-week-dialog__field">
              <span>Date</span>
              <input type="date" [value]="newEventForm.date" (input)="updateNewEvent('date', $any($event.target).value)">
            </label>
            <label class="event-scheduler-shift-week-dialog__field">
              <span>Assignee</span>
              <select [value]="newEventForm.resourceId" (change)="updateNewEvent('resourceId', $any($event.target).value)">
                <option *ngFor="let member of teamMembers" [value]="member.id">{{ member.name }}</option>
              </select>
            </label>
            <label class="event-scheduler-shift-week-dialog__field">
              <span>Start</span>
              <input type="time" step="1800" [value]="newEventForm.startTime" (input)="updateNewEvent('startTime', $any($event.target).value)">
            </label>
            <label class="event-scheduler-shift-week-dialog__field">
              <span>End</span>
              <input type="time" step="1800" [value]="newEventForm.endTime" (input)="updateNewEvent('endTime', $any($event.target).value)">
            </label>
            <label class="event-scheduler-shift-week-dialog__field">
              <span>Type</span>
              <select [value]="newEventForm.type" (change)="updateNewEvent('type', $any($event.target).value)">
                <option *ngFor="let option of newEventTypeOptions" [value]="option.id">{{ option.label }}</option>
              </select>
            </label>
            <label class="event-scheduler-shift-week-dialog__field">
              <span>Status</span>
              <select [value]="newEventForm.status" (change)="updateNewEvent('status', $any($event.target).value)">
                <option *ngFor="let option of newEventStatusOptions" [value]="option.id">{{ option.label }}</option>
              </select>
            </label>
          </div>
          <div class="event-scheduler-shift-week-dialog__actions">
            <button type="button" class="event-scheduler-shift-week-dialog__cancel" (click)="closeNewEvent()">Cancel</button>
            <button type="submit" class="event-scheduler-shift-week-dialog__submit">Create event</button>
          </div>
        </form>
      </div>
    </section>
  `,
  styleUrls: ['./styles.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class EventSchedulerShiftWeekGridComponent {
  theme = currentTheme().isDark() ? 'darkMaterial' : 'material';
  plugins = [EventSchedulerPlugin];
  rows = [];
  columns = [];
  activeView: ShiftWeekDemoView = initialShiftWeekDemoView;
  workspaceView: ShiftWeekWorkspaceView = initialShiftWeekWorkspaceView;
  activeCalendar: ShiftWeekDemoCalendar = initialShiftWeekCalendar;
  anchorDate = initialShiftWeekAnchorDate;
  searchQuery = '';
  tablePlugins = [AdvanceFilterPlugin, ColumnStretchPlugin, RowOddPlugin];
  tableColumns = getShiftWeekTableColumns();
  tableFilter = {};
  viewLabels = shiftWeekViewLabels;
  viewKeys = shiftWeekDemoViews;
  calendarOptions = shiftWeekCalendarOptions;
  teamMembers = shiftWeekTeamMembers;
  newEventStatusOptions = shiftWeekNewEventStatusOptions;
  newEventTypeOptions = shiftWeekNewEventTypeOptions;
  workspaceViews: readonly { view: ShiftWeekWorkspaceView; label: string }[] = [
    { view: 'calendar', label: 'Calendar' },
    { view: 'resource', label: 'Resource' },
    { view: 'table', label: 'Table' },
  ];
  selectedEventIds: readonly EventSchedulerEntityId[] = [];
  highlightedEventIds: readonly EventSchedulerEntityId[] = [];
  schedulerConfig = createShiftWeekConfig(this.activeView, this.anchorDate, this.activeCalendar, this.selectedEventIds, this.highlightedEventIds, this.workspaceView);
  events: readonly EventSchedulerEventEntity[] = createShiftWeekEvents(this.activeView, this.anchorDate);
  resources = shiftResources.map((resource) => ({ ...resource }));
  newEventForm: ShiftWeekNewEventForm | null = null;

  get rangeTitle() {
    return getShiftWeekRangeTitle(this.activeView, this.anchorDate);
  }

  get rangeSubtitle() {
    return getShiftWeekSubtitle(this.anchorDate);
  }

  get tableRows() {
    return getShiftWeekTableRows(this.events);
  }

  get showToolbar() {
    return this.workspaceView === 'calendar';
  }

  setSearchQuery(query: string) {
    this.searchQuery = query;
    this.refreshSearchMatches();
  }

  setView(view: ShiftWeekDemoView) {
    this.activeView = view === 'resource' ? 'week' : view;
    if (view === 'resource') {
      this.workspaceView = 'resource';
    }
    this.anchorDate = normalizeShiftWeekAnchorDate(view, this.anchorDate);
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

  openNewEvent() {
    this.newEventForm = getShiftWeekNewEventDefaults(this.activeView, this.anchorDate);
  }

  closeNewEvent() {
    this.newEventForm = null;
  }

  updateNewEvent<Key extends keyof ShiftWeekNewEventForm>(key: Key, value: ShiftWeekNewEventForm[Key]) {
    if (!this.newEventForm) return;
    this.newEventForm = {
      ...this.newEventForm,
      [key]: value,
    };
  }

  submitNewEvent(event: Event) {
    event.preventDefault();
    if (!this.newEventForm) return;
    this.events = [
      ...this.events,
      createShiftWeekManualEvent(this.newEventForm),
    ];
    this.refreshSearchMatches();
    this.closeNewEvent();
  }

  handleSchedulerEvents(event: CustomEvent<EventSchedulerEventChangedDetail>) {
    this.events = event.detail.events.map((item) => ({ ...item }));
    this.refreshSearchMatches();
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
    this.refreshSearchMatches();
  }

  handleResourceReassignRequest(event: CustomEvent<EventSchedulerResourceReassignRequestDetail>) {
    this.events = [
      ...reassignShiftWeekEvent(this.events, event.detail),
    ];
    this.refreshSearchMatches();
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

  handleViewRequest(event: CustomEvent<{ view: ShiftWeekDemoView }>) {
    if (event.detail.view === 'day' || event.detail.view === 'week' || event.detail.view === 'month' || event.detail.view === 'resource') {
      this.setView(event.detail.view);
    }
  }

  private refreshRange() {
    this.selectedEventIds = [];
    this.events = createShiftWeekEvents(this.activeView, this.anchorDate);
    this.refreshSearchMatches();
  }

  private refreshSchedulerConfig() {
    this.schedulerConfig = createShiftWeekConfig(this.activeView, this.anchorDate, this.activeCalendar, this.selectedEventIds, this.highlightedEventIds, this.workspaceView);
  }

  private refreshSearchMatches() {
    this.highlightedEventIds = getShiftWeekSearchMatchIds(this.events, this.searchQuery);
    this.refreshSchedulerConfig();
  }
}
