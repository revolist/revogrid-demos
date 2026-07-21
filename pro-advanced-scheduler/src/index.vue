<template>
  <section class="event-scheduler-shift-week-demo">
    <aside class="event-scheduler-shift-week-sidebar" aria-label="Scheduler navigation">
      <div class="event-scheduler-shift-week-brand">
        <span class="event-scheduler-shift-week-brand__mark">OS</span>
        <span class="event-scheduler-shift-week-brand__copy">
          <strong>Ops Studio</strong>
          <small>Workspace</small>
        </span>
      </div>
      <button type="button" class="event-scheduler-shift-week-new-event" @click="openNewEvent">New event</button>
      <label class="event-scheduler-shift-week-search">
        <span>Search</span>
        <input v-model="searchQuery" type="search" placeholder="Search..." />
      </label>
      <nav class="event-scheduler-shift-week-nav" aria-label="Scheduler sections">
        <span>Views</span>
        <button
          v-for="item in workspaceViews"
          :key="item.view"
          type="button"
          class="event-scheduler-shift-week-nav__item"
          :class="{ 'event-scheduler-shift-week-nav__item--active': workspaceView === item.view }"
          :aria-pressed="workspaceView === item.view"
          @click="setWorkspace(item.view)"
        >
          {{ item.label }}
        </button>
      </nav>
      <div class="event-scheduler-shift-week-team">
        <span>Team</span>
        <div v-for="member in teamMembers" :key="member.id" class="event-scheduler-shift-week-team__row">
          <span class="event-scheduler-shift-week-avatar" :style="{ '--shift-week-avatar-color': member.color }">{{ member.initials }}</span>
          <strong>{{ member.name }}</strong>
          <small>{{ member.count }}</small>
        </div>
      </div>
    </aside>
    <div class="event-scheduler-shift-week-main">
      <header class="event-scheduler-shift-week-appbar">
        <div class="event-scheduler-shift-week-appbar__title">
          <strong>Scheduler JavaScript Calendar</strong>
          <span>On track</span>
        </div>
        <div class="event-scheduler-shift-week-appbar__actions">
          <span class="event-scheduler-shift-week-avatar-stack" aria-hidden="true">
            <span v-for="member in appbarTeamMembers" :key="member.id" :style="{ '--shift-week-avatar-color': member.color }">{{ member.initials }}</span>
            <small v-if="appbarTeamOverflow > 0">+{{ appbarTeamOverflow }}</small>
          </span>
        </div>
      </header>
      <RevoGrid
        v-if="workspaceView === 'table'"
        class="event-scheduler-shift-week-table"
        hide-attribution
        readonly
        :theme="isDark ? 'darkMaterial' : 'material'"
        :plugins="tablePlugins"
        :filter="{}"
        :source="filteredTableRows"
        :columns="tableColumns"
      />
      <template v-else>
        <div v-if="showToolbar" class="event-scheduler-shift-week-toolbar" aria-label="Shift scheduler navigation">
          <div class="event-scheduler-shift-week-toolbar__nav">
            <button type="button" class="event-scheduler-shift-week-toolbar__icon" aria-label="Previous range" @click="goPrevious">‹</button>
            <button type="button" class="event-scheduler-shift-week-toolbar__icon" aria-label="Next range" @click="goNext">›</button>
            <button type="button" class="event-scheduler-shift-week-toolbar__today" @click="goToday">Today</button>
          </div>
          <div class="event-scheduler-shift-week-toolbar__heading">
            <strong>{{ rangeTitle }}</strong>
            <span>{{ rangeSubtitle }}</span>
          </div>
          <div class="event-scheduler-shift-week-toolbar__views" role="group" aria-label="Scheduler view">
            <button
              v-for="viewKey in viewKeys"
              :key="viewKey"
              type="button"
              class="event-scheduler-shift-week-toolbar__view"
              :class="{ 'event-scheduler-shift-week-toolbar__view--active': activeView === viewKey }"
              :aria-pressed="activeView === viewKey"
              @click="setView(viewKey)"
            >
              {{ viewLabels[viewKey] }}
            </button>
          </div>
          <label class="event-scheduler-shift-week-toolbar__calendar">
            <span>Calendar</span>
            <select v-model="activeCalendar" aria-label="Calendar preset">
              <option v-for="option in calendarOptions" :key="option.id" :value="option.id">
                {{ option.label }}
              </option>
            </select>
          </label>
        </div>
        <RevoGrid
          class="event-scheduler-shift-week-grid"
          hide-attribution
          :theme="isDark ? 'darkMaterial' : 'material'"
          :plugins="plugins"
          :source="rows"
          :columns="columns"
          :event-scheduler.prop="schedulerConfig"
          :event-scheduler-events.prop="schedulerEvents"
          :event-scheduler-resources.prop="resources"
          @event-scheduler-event-created="handleSchedulerEvents"
          @event-scheduler-event-changed="handleSchedulerEvents"
          @event-scheduler-event-deleted="handleSchedulerEvents"
          @event-scheduler-before-event-select="handleBeforeEventSelect"
          @event-scheduler-navigate-request="handleNavigateRequest"
          @event-scheduler-open-shift-assign-request="handleOpenShiftAssignRequest"
          @event-scheduler-resource-reassign-request="handleResourceReassignRequest"
          @event-scheduler-view-request="handleViewRequest"
        />
      </template>
    </div>
    <div v-if="newEventForm" class="event-scheduler-shift-week-dialog" role="dialog" aria-modal="true" aria-labelledby="shift-week-new-event-title">
      <form class="event-scheduler-shift-week-dialog__panel" @submit.prevent="submitNewEvent">
        <div class="event-scheduler-shift-week-dialog__header">
          <div>
            <strong id="shift-week-new-event-title">New event</strong>
            <span>{{ newEventForm.date }} · {{ newEventForm.startTime }}-{{ newEventForm.endTime }}</span>
          </div>
          <button type="button" class="event-scheduler-shift-week-dialog__close" aria-label="Close new event" @click="closeNewEvent">×</button>
        </div>
        <div class="event-scheduler-shift-week-dialog__body">
          <label class="event-scheduler-shift-week-dialog__field event-scheduler-shift-week-dialog__field--wide">
            <span>Event</span>
            <input v-model="newEventForm.title">
          </label>
          <label class="event-scheduler-shift-week-dialog__field">
            <span>Date</span>
            <input v-model="newEventForm.date" type="date">
          </label>
          <label class="event-scheduler-shift-week-dialog__field">
            <span>Assignee</span>
            <select v-model="newEventForm.resourceId">
              <option v-for="member in teamMembers" :key="member.id" :value="member.id">{{ member.name }}</option>
            </select>
          </label>
          <label class="event-scheduler-shift-week-dialog__field">
            <span>Start</span>
            <input v-model="newEventForm.startTime" type="time" step="1800">
          </label>
          <label class="event-scheduler-shift-week-dialog__field">
            <span>End</span>
            <input v-model="newEventForm.endTime" type="time" step="1800">
          </label>
          <label class="event-scheduler-shift-week-dialog__field">
            <span>Type</span>
            <select v-model="newEventForm.type">
              <option v-for="option in newEventTypeOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
            </select>
          </label>
          <label class="event-scheduler-shift-week-dialog__field">
            <span>Status</span>
            <select v-model="newEventForm.status">
              <option v-for="option in newEventStatusOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
            </select>
          </label>
        </div>
        <div class="event-scheduler-shift-week-dialog__actions">
          <button type="button" class="event-scheduler-shift-week-dialog__cancel" @click="closeNewEvent">Cancel</button>
          <button type="submit" class="event-scheduler-shift-week-dialog__submit">Create event</button>
        </div>
      </form>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import RevoGrid from '@revolist/vue3-datagrid';
import { EventSchedulerPlugin, type EventSchedulerEntityId, type EventSchedulerEventChangedDetail, type EventSchedulerEventSelectedDetail, type EventSchedulerOpenShiftAssignRequestDetail, type EventSchedulerResourceReassignRequestDetail } from '@revolist/revogrid-enterprise';
import { AdvanceFilterPlugin, ColumnStretchPlugin, RowOddPlugin } from '@revolist/revogrid-pro';
import { currentThemeVue } from '../../composables/useRandomData';
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
import './styles.scss';

const { isDark } = currentThemeVue();

const plugins = [EventSchedulerPlugin];
const tablePlugins = [AdvanceFilterPlugin, ColumnStretchPlugin, RowOddPlugin];
const tableColumns = getShiftWeekTableColumns();
const rows = ref([]);
const columns = ref([]);
const activeView = ref<ShiftWeekDemoView>(initialShiftWeekDemoView);
const workspaceView = ref<ShiftWeekWorkspaceView>(initialShiftWeekWorkspaceView);
const anchorDate = ref(initialShiftWeekAnchorDate);
const activeCalendar = ref<ShiftWeekDemoCalendar>(initialShiftWeekCalendar);
const selectedEventIds = ref<readonly EventSchedulerEntityId[]>([]);
const searchQuery = ref('');
const viewLabels = shiftWeekViewLabels;
const viewKeys = shiftWeekDemoViews;
const calendarOptions = shiftWeekCalendarOptions;
const teamMembers = shiftWeekTeamMembers;
const maxAppbarTeamMembers = 2;
const appbarTeamMembers = computed(() => teamMembers.slice(0, maxAppbarTeamMembers));
const appbarTeamOverflow = computed(() => Math.max(teamMembers.length - maxAppbarTeamMembers, 0));
const newEventStatusOptions = shiftWeekNewEventStatusOptions;
const newEventTypeOptions = shiftWeekNewEventTypeOptions;
const newEventForm = ref<ShiftWeekNewEventForm | null>(null);
const workspaceViews: readonly { view: ShiftWeekWorkspaceView; label: string }[] = [
  { view: 'calendar', label: 'Calendar' },
  { view: 'resource', label: 'Resource' },
  { view: 'table', label: 'Table' },
];
const schedulerEvents = ref(createShiftWeekEvents(activeView.value, anchorDate.value));
const resources = ref(shiftResources.map((resource) => ({ ...resource })));
const highlightedEventIds = computed(() => getShiftWeekSearchMatchIds(schedulerEvents.value, searchQuery.value));
const filteredTableRows = computed(() => getShiftWeekTableRows(schedulerEvents.value));
const schedulerConfig = computed(() => createShiftWeekConfig(
  activeView.value,
  anchorDate.value,
  activeCalendar.value,
  selectedEventIds.value,
  highlightedEventIds.value,
  workspaceView.value,
));
const rangeTitle = computed(() => getShiftWeekRangeTitle(activeView.value, anchorDate.value));
const rangeSubtitle = computed(() => getShiftWeekSubtitle(anchorDate.value));
const showToolbar = computed(() => workspaceView.value === 'calendar');

function setView(view: ShiftWeekDemoView) {
  activeView.value = view;
  if (view === 'resource') {
    workspaceView.value = 'resource';
    activeView.value = 'week';
  }
  anchorDate.value = normalizeShiftWeekAnchorDate(view, anchorDate.value);
  selectedEventIds.value = [];
  schedulerEvents.value = createShiftWeekEvents(activeView.value, anchorDate.value);
}

function setWorkspace(view: ShiftWeekWorkspaceView) {
  workspaceView.value = view;
  if (view === 'resource') {
    anchorDate.value = normalizeShiftWeekAnchorDate(activeView.value, anchorDate.value);
    selectedEventIds.value = [];
    schedulerEvents.value = createShiftWeekEvents(activeView.value, anchorDate.value);
  } else if (view === 'calendar' && activeView.value === 'resource') {
    activeView.value = 'week';
  }
}

function goPrevious() {
  anchorDate.value = navigateShiftWeekAnchorDate(activeView.value, anchorDate.value, -1);
  selectedEventIds.value = [];
  schedulerEvents.value = createShiftWeekEvents(activeView.value, anchorDate.value);
}

function goNext() {
  anchorDate.value = navigateShiftWeekAnchorDate(activeView.value, anchorDate.value, 1);
  selectedEventIds.value = [];
  schedulerEvents.value = createShiftWeekEvents(activeView.value, anchorDate.value);
}

function goToday() {
  anchorDate.value = getTodayAnchorDate(activeView.value);
  selectedEventIds.value = [];
  schedulerEvents.value = createShiftWeekEvents(activeView.value, anchorDate.value);
}

function openNewEvent() {
  newEventForm.value = getShiftWeekNewEventDefaults(activeView.value, anchorDate.value);
}

function closeNewEvent() {
  newEventForm.value = null;
}

function submitNewEvent() {
  if (!newEventForm.value) return;
  schedulerEvents.value = [
    ...schedulerEvents.value,
    createShiftWeekManualEvent(newEventForm.value),
  ];
  closeNewEvent();
}

watch(activeCalendar, () => {
  selectedEventIds.value = [];
  schedulerEvents.value = createShiftWeekEvents(activeView.value, anchorDate.value);
});

function handleBeforeEventSelect(event: CustomEvent<EventSchedulerEventSelectedDetail>) {
  event.preventDefault();
  selectedEventIds.value = [...event.detail.eventIds];
}

function handleSchedulerEvents(event: CustomEvent<EventSchedulerEventChangedDetail>) {
  schedulerEvents.value = event.detail.events.map((item) => ({ ...item }));
}

function handleOpenShiftAssignRequest(event: CustomEvent<EventSchedulerOpenShiftAssignRequestDetail>) {
  schedulerEvents.value = [
    ...schedulerEvents.value,
    createShiftWeekAssignedOpenShift(event.detail),
  ];
}

function handleResourceReassignRequest(event: CustomEvent<EventSchedulerResourceReassignRequestDetail>) {
  schedulerEvents.value = [
    ...reassignShiftWeekEvent(schedulerEvents.value, event.detail),
  ];
}

function handleNavigateRequest(event: CustomEvent<{ action: 'previous' | 'next' | 'today' }>) {
  if (event.detail.action === 'previous') {
    goPrevious();
  } else if (event.detail.action === 'next') {
    goNext();
  } else {
    goToday();
  }
}

function handleViewRequest(event: CustomEvent<{ view: ShiftWeekDemoView }>) {
  if (event.detail.view === 'day' || event.detail.view === 'week' || event.detail.view === 'month' || event.detail.view === 'resource') {
    setView(event.detail.view);
  }
}
</script>
