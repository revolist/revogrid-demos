<template>
  <section class="event-scheduler-shift-week-demo">
    <revogr-scheduler-sidebar
      :model.prop="sidebarModel"
      @scheduler-sidebar-new-event="openNewEvent"
      @scheduler-sidebar-search-change="handleSidebarSearchChange"
      @scheduler-sidebar-workspace-change="handleSidebarWorkspaceChange"
    />
    <div class="event-scheduler-shift-week-main">
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
        <revogr-scheduler-header
          v-if="showToolbar"
          :model.prop="headerModel"
          @scheduler-header-calendar-change="handleHeaderCalendarChange"
          @scheduler-header-navigate="handleHeaderNavigate"
          @scheduler-header-view-change="handleHeaderViewChange"
        />
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
    <revogr-scheduler-dialog
      :model.prop="dialogModel"
      @scheduler-dialog-close="closeNewEvent"
      @scheduler-dialog-submit="handleDialogSubmit"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import RevoGrid from '@revolist/vue3-datagrid';
import { EventSchedulerPlugin, type EventSchedulerEntityId, type EventSchedulerEventChangedDetail, type EventSchedulerEventSelectedDetail, type EventSchedulerOpenShiftAssignRequestDetail, type EventSchedulerResourceReassignRequestDetail } from '@revolist/revogrid-enterprise';
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
  defineSchedulerShellElements,
  type SchedulerDialogSubmitDetail,
  type SchedulerHeaderCalendarChangeDetail,
  type SchedulerHeaderNavigateDetail,
  type SchedulerHeaderViewChangeDetail,
  type SchedulerSidebarSearchChangeDetail,
  type SchedulerSidebarWorkspaceChangeDetail,
} from './components';
import './styles.scss';

defineSchedulerShellElements();

const isDark = ref(currentTheme().isDark());
let disconnectTheme: (() => void) | undefined;

onMounted(() => {
  disconnectTheme = observeCurrentTheme((value) => {
    isDark.value = value;
  });
});
onBeforeUnmount(() => disconnectTheme?.());

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
const newEventStatusOptions = shiftWeekNewEventStatusOptions;
const newEventTypeOptions = shiftWeekNewEventTypeOptions;
const newEventForm = ref<ShiftWeekNewEventForm | null>(null);
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
const sidebarModel = computed(() => ({
  workspaceView: workspaceView.value,
  searchQuery: searchQuery.value,
  teamMembers,
}));
const headerModel = computed(() => ({
  activeView: activeView.value,
  activeCalendar: activeCalendar.value,
  title: rangeTitle.value,
  subtitle: rangeSubtitle.value,
  views: viewKeys,
  viewLabels,
  calendarOptions,
}));
const dialogModel = computed(() => newEventForm.value ? ({
  form: newEventForm.value,
  teamMembers,
  typeOptions: newEventTypeOptions,
  statusOptions: newEventStatusOptions,
}) : null);

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

function submitNewEvent(form: ShiftWeekNewEventForm) {
  schedulerEvents.value = [
    ...schedulerEvents.value,
    createShiftWeekManualEvent(form),
  ];
  closeNewEvent();
}

function handleSidebarSearchChange(event: CustomEvent<SchedulerSidebarSearchChangeDetail>) {
  searchQuery.value = event.detail.query;
}

function handleSidebarWorkspaceChange(event: CustomEvent<SchedulerSidebarWorkspaceChangeDetail>) {
  setWorkspace(event.detail.view);
}

function handleHeaderNavigate(event: CustomEvent<SchedulerHeaderNavigateDetail>) {
  handleNavigateRequest(event);
}

function handleHeaderViewChange(event: CustomEvent<SchedulerHeaderViewChangeDetail>) {
  setView(event.detail.view);
}

function handleHeaderCalendarChange(event: CustomEvent<SchedulerHeaderCalendarChangeDetail>) {
  activeCalendar.value = event.detail.calendar;
}

function handleDialogSubmit(event: CustomEvent<SchedulerDialogSubmitDetail>) {
  submitNewEvent(event.detail.form);
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
