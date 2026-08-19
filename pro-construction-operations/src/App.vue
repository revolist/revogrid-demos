<template>
  <section
    :class="['construction-fabrication', `construction-fabrication--${view}`, { 'construction-fabrication--dark': isDark }]"
    aria-label="Construction and Fabrication Operations"
  >
    <nav class="construction-fabrication__nav" aria-label="Schedule location">
      <button class="construction-fabrication__button construction-fabrication__button--quiet" :aria-pressed="view === 'master'" type="button" @click="showMaster">Company Master</button>
      <template v-if="view !== 'master'">
        <span class="construction-fabrication__crumb">›</span>
        <button class="construction-fabrication__button construction-fabrication__button--quiet" :aria-pressed="view === 'project'" type="button" @click="showSchedule">{{ projectName }}</button>
      </template>
      <template v-if="view === 'lookahead'">
        <span class="construction-fabrication__crumb">›</span>
        <span class="construction-fabrication__crumb-current">2-week Look-Ahead</span>
      </template>
    </nav>

    <div class="construction-fabrication__workspace">
      <main class="construction-fabrication__main">
        <div v-if="view !== 'master'" class="construction-fabrication__command-deck">
          <div class="construction-fabrication__view-tabs" role="tablist">
            <button class="construction-fabrication__button construction-fabrication__button--tab" :aria-pressed="view === 'project' && !resourcesOpen" type="button" @click="showSchedule">Schedule</button>
            <button class="construction-fabrication__button construction-fabrication__button--tab" :aria-pressed="view === 'lookahead'" type="button" @click="showLookAhead">Look-Ahead</button>
            <button class="construction-fabrication__button construction-fabrication__button--tab" :aria-pressed="resourcesOpen" type="button" @click="showResources">Resources</button>
          </div>

          <div class="construction-fabrication__command-actions">
            <div v-if="view === 'project' && !resourcesOpen" class="construction-fabrication__control-group">
              <span class="construction-fabrication__toolbar-label">Timeline</span>
              <div class="construction-fabrication__control-set">
                <button v-for="option in scaleOptions" :key="option.value" class="construction-fabrication__button construction-fabrication__button--default" :aria-pressed="scale === option.value" type="button" @click="scale = option.value">{{ option.label }}</button>
              </div>
            </div>
            <template v-else>
              <div class="construction-fabrication__period-summary">
                <span class="construction-fabrication__period-kicker">{{ resourcesOpen ? 'Resource timeline' : 'Active window' }}</span>
                <strong class="construction-fabrication__period">{{ displayDate(period.start) }} – {{ displayDate(period.end) }}</strong>
              </div>
              <div class="construction-fabrication__control-set">
                <button class="construction-fabrication__button construction-fabrication__button--icon-only" aria-label="Previous 14 days" title="Previous 14 days" type="button" @click="movePeriod(-1)">‹</button>
                <button class="construction-fabrication__button construction-fabrication__button--icon-only" aria-label="Reset to the featured window" title="Reset to the featured window" type="button" @click="resetPeriod">↺</button>
                <button class="construction-fabrication__button construction-fabrication__button--icon-only" aria-label="Next 14 days" title="Next 14 days" type="button" @click="movePeriod(1)">›</button>
              </div>
            </template>

            <template v-if="!resourcesOpen">
              <button class="construction-fabrication__button construction-fabrication__button--quiet" :aria-pressed="filtersOpen" type="button" @click="filtersOpen = !filtersOpen">Filter</button>
              <div v-if="filtersOpen" class="construction-fabrication__filter-popover construction-fabrication__filter-popover--bound" role="dialog" aria-label="Schedule filters">
                <div class="construction-fabrication__filter-header">
                  <strong class="construction-fabrication__filter-title">Filters</strong>
                  <button class="construction-fabrication__button construction-fabrication__button--quiet" type="button" @click="resetFilters">Reset</button>
                </div>
                <div class="construction-fabrication__filter-body">
                  <div class="construction-fabrication__control-group">
                    <span class="construction-fabrication__toolbar-label">Department</span>
                    <div class="construction-fabrication__control-set">
                      <button
                        v-for="department in DEPARTMENT_FILTERS"
                        :key="department"
                        class="construction-fabrication__button"
                        :aria-pressed="activeDepartment === department"
                        type="button"
                        @click="updateDepartment(department)"
                      >{{ departmentFilterLabel(department) }}</button>
                    </div>
                  </div>
                  <label v-if="view === 'lookahead'" class="construction-fabrication__control-group">
                    <span class="construction-fabrication__toolbar-label">Work area</span>
                    <select v-model="filters.workArea" class="construction-fabrication__select" @change="refreshActiveSource()">
                      <option value="all">All work areas</option>
                      <option v-for="area in workAreas" :key="area">{{ area }}</option>
                    </select>
                  </label>
                </div>
              </div>
            </template>
          </div>
        </div>

        <RevoGrid
          :key="gridKey"
          class="construction-fabrication__grid skip-style cell-border"
          v-bind="gridProperties"
          :source="boundSource"
          :tree.prop="gridProperties.tree"
          :row-order.prop="gridProperties.rowOrder"
          :gantt.prop="gridProperties.gantt"
          :gantt-resources.prop="gridProperties.ganttResources"
          :gantt-assignments.prop="gridProperties.ganttAssignments"
          :gantt-calendars.prop="gridProperties.ganttCalendars"
          :gantt-dependencies.prop="gridProperties.ganttDependencies"
          :event-scheduler.prop="gridProperties.eventScheduler"
          :event-scheduler-resources.prop="gridProperties.eventSchedulerResources"
          :event-scheduler-events.prop="gridProperties.eventSchedulerEvents"
          @tree-state-changed="handleTreeState"
          @gantt-before-task-change="handleTaskChange"
          @event-scheduler-event-changed="handleSchedulerChange"
        />
      </main>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import RevoGrid from '@revolist/vue3-datagrid';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import { DEFAULT_LOOK_AHEAD, DEFAULT_LOOK_AHEAD_FILTERS } from './shared/data/projections';
import { moveLookAheadPeriod } from './shared/data/updates';
import { applySchedulerTaskChanges } from './shared/scheduler/updates';
import { applyConstructionTaskChange } from './shared/services/task-change';
import {
  createConstructionGridBindings,
  type ConstructionGridOptions,
} from './shared/grid';
import {
  constructionProjectName,
  constructionSource,
  constructionWorkAreas,
  createConstructionWorkspaceState,
  DEPARTMENT_FILTERS,
  defaultExpandedRows,
  departmentFilterLabel,
} from './shared/state';
import { displayDate } from './shared/ui';
import type { ConstructionScale, ConstructionView, ProjectDepartmentFilter } from './shared/types';
import './assets/styles.scss';

const initial = createConstructionWorkspaceState();
const view = ref<ConstructionView>(initial.view);
const selectedProject = ref(initial.selectedProject);
const period = ref(initial.period);
const filters = ref(initial.filters);
const projectDepartment = ref<ProjectDepartmentFilter>('all');
const scale = ref<ConstructionScale>('day-week');
const tasks = ref(initial.tasks);
const activeSource = ref(constructionSource(initial));
const expandedRowIds = ref(initial.expandedRowIds);
const resourcesOpen = ref(false);
const filtersOpen = ref(false);
const isDark = ref(currentTheme().isDark());
const scaleOptions = [
  { label: 'Days', value: 'day-week' },
  { label: 'Weeks', value: 'week-month' },
  { label: 'Months', value: 'month-quarter' },
] as const;

const state = computed(() => ({
  view: view.value,
  selectedProject: selectedProject.value,
  period: period.value,
  filters: filters.value,
  projectDepartment: projectDepartment.value,
  scale: scale.value,
  tasks: tasks.value,
  expandedRowIds: expandedRowIds.value,
  resourcesOpen: resourcesOpen.value,
}));
const gridState = computed(() => ({
  view: view.value,
  selectedProject: selectedProject.value,
  period: period.value,
  filters: filters.value,
  projectDepartment: projectDepartment.value,
  scale: scale.value,
  expandedRowIds: expandedRowIds.value,
  resourcesOpen: resourcesOpen.value,
  // The mounted grid reads this stable projection while task patches update
  // the canonical collection above.
  tasks: activeSource.value,
}));
const projectName = computed(() => constructionProjectName(selectedProject.value));
const workAreas = computed(() => constructionWorkAreas(state.value));
const activeDepartment = computed(() => view.value === 'lookahead' ? filters.value.department : projectDepartment.value);
const gridKey = computed(() => `${view.value}:${resourcesOpen.value}:${selectedProject.value}`);
const gridOptions = computed<ConstructionGridOptions>(() => ({
  ...gridState.value,
  projectName: projectName.value,
  sourceForView: () => activeSource.value,
  openProject,
  setTasks: (value) => { tasks.value = value; },
  setExpandedRowIds: (value) => { expandedRowIds.value = value; },
}));
const bindings = computed(() => createConstructionGridBindings(gridOptions.value));
const boundSource = computed(() => bindings.value.source);
const gridProperties = computed(() => {
  const { source: _source, ...properties } = bindings.value;
  return properties;
});

function openProject(projectRef: string) {
  selectedProject.value = projectRef;
  showSchedule();
}
function refreshActiveSource(nextTasks = tasks.value) {
  activeSource.value = constructionSource({ ...state.value, tasks: nextTasks });
}
function expandedFor(nextView: ConstructionView) {
  const nextState = { ...state.value, view: nextView, resourcesOpen: false };
  return defaultExpandedRows(nextView, selectedProject.value, constructionSource(nextState));
}
function showMaster() { expandedRowIds.value = new Set(); view.value = 'master'; resourcesOpen.value = false; filtersOpen.value = false; refreshActiveSource(); }
function showSchedule() { expandedRowIds.value = expandedFor('project'); view.value = 'project'; resourcesOpen.value = false; filtersOpen.value = false; refreshActiveSource(); }
function showLookAhead() { expandedRowIds.value = expandedFor('lookahead'); view.value = 'lookahead'; resourcesOpen.value = false; filtersOpen.value = false; refreshActiveSource(); }
function showResources() { view.value = 'project'; resourcesOpen.value = true; filtersOpen.value = false; refreshActiveSource(); }
function movePeriod(direction: -1 | 1) { period.value = moveLookAheadPeriod(period.value, direction); refreshActiveSource(); }
function resetPeriod() { period.value = { ...DEFAULT_LOOK_AHEAD }; refreshActiveSource(); }
function resetFilters() {
  if (view.value === 'lookahead') { filters.value = { ...DEFAULT_LOOK_AHEAD_FILTERS }; refreshActiveSource(); }
  else projectDepartment.value = 'all';
}
function updateDepartment(department: typeof DEPARTMENT_FILTERS[number]) {
  if (view.value === 'lookahead') { filters.value = { ...filters.value, department }; refreshActiveSource(); }
  else projectDepartment.value = department;
}
function handleTreeState(event: CustomEvent<{ expandedRowIds: Set<string> }>) {
  expandedRowIds.value = new Set(event.detail.expandedRowIds);
}
function handleTaskChange(event: CustomEvent) {
  const result = applyConstructionTaskChange(event.detail, tasks.value, view.value === 'master');
  if (!result.accepted) {
    event.preventDefault();
    return;
  }
  tasks.value = result.tasks;
  if (result.refreshProjection) refreshActiveSource(result.tasks);
}
function handleSchedulerChange(event: CustomEvent) {
  tasks.value = applySchedulerTaskChanges(tasks.value, event.detail);
  refreshActiveSource(tasks.value);
}
const disconnectTheme = observeCurrentTheme((dark) => { isDark.value = dark; });
onBeforeUnmount(disconnectTheme);
</script>
