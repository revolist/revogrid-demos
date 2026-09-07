<template>
  <section ref="rootRef" class="planning-demo" @keydown.esc="closePopovers">
    <div class="planning-demo__topbar">
      <nav class="planning-demo__switch" role="tablist" aria-label="Planning view">
        <button v-for="view in views" :key="view" type="button" :class="{ on: activeView === view }" role="tab" :aria-selected="activeView === view" @click="activeView = view">
          {{ view }}<span v-if="view !== 'grid' && view !== 'kanban'" class="planning-demo__pro">Pro</span>
        </button>
      </nav>
      <div class="planning-demo__actions"><button type="button" @click="openSource">Code</button><a href="/gantt/">Docs</a><details ref="moreMenuRef"><summary>More</summary><div><button type="button" @click="resetWorkspace">Reset</button><button type="button" @click="toggleFullscreen">Full screen</button></div></details></div>
    </div>
    <p class="planning-demo__hint">{{ activeView === 'kanban' ? 'Change a status to move a task.' : 'Change a status, then open Kanban.' }}</p>
    <div class="planning-demo__toolbar">
      <label class="planning-demo__search"><span class="sr-only">Search tasks</span><input v-model="filters.query" type="search" placeholder="Search tasks…" /></label>
      <label class="planning-demo__select"><span class="sr-only">Project</span><select v-model="filters.projectId"><option value="all">All projects</option><option v-for="project in planningProjects" :key="project.id" :value="project.id">{{ project.label }}</option></select></label>
      <div ref="filterWrapRef" class="planning-demo__filter-wrap">
        <button type="button" :aria-expanded="filterOpen" @click="filterOpen = !filterOpen">Filter<span v-if="activeFilterCount"> · {{ activeFilterCount }}</span></button>
        <div v-if="filterOpen" class="planning-demo__filter-popover">
          <fieldset><legend>Status</legend><label v-for="option in statusOptions" :key="option.value"><input v-model="filters.statuses" type="checkbox" :value="option.value" />{{ option.label }}</label></fieldset>
          <fieldset><legend>Priority</legend><label v-for="option in priorityOptions" :key="option.value"><input v-model="filters.priorities" type="checkbox" :value="option.value" />{{ option.label }}</label></fieldset>
          <button type="button" class="planning-demo__clear" @click="clearFilters">Clear filters</button>
        </div>
      </div>
      <span class="planning-demo__count" aria-live="polite">{{ visibleTasks.length }} of {{ tasks.length }} tasks</span>
    </div>
    <div v-show="filterChips.length" class="planning-demo__chips"><button v-for="chip in filterChips" :key="chip.key" type="button" @click="chip.remove">{{ chip.label }} ×</button><button type="button" class="planning-demo__clear" @click="clearFilters">Clear all</button></div>
    <div v-if="!visibleTasks.length" class="planning-demo__empty"><strong>No tasks match your filters</strong><button type="button" @click="clearFilters">Clear filters</button></div>
    <RevoGrid v-else-if="activeView === 'grid'" :key="`grid-${resetKey}`" class="planning-demo__grid" hide-attribution :theme="theme" :plugins="gridPlugins" :source="visibleTasks" :columns="gridColumns" :row-size="40" range resize can-move-columns :row-select.prop="rowSelect" @afteredit="handleGridEdit" @rowselected="handleRowSelected" />
    <RevoGrid v-else-if="activeView === 'kanban'" key="kanban" class="planning-demo__grid planning-demo__grid--kanban" hide-attribution :theme="theme" :plugins="kanbanPlugins" :source="visibleTasks" :columns="gridColumns" :kanban.prop="kanbanConfig" @kanbancardmove="handleKanbanMove" @kanbancardcreate="handleKanbanCreate" @kanbancardupdate="handleKanbanUpdate" @kanbancarddelete="handleKanbanDelete" />
    <RevoGrid v-else-if="activeView === 'gantt'" key="gantt" class="planning-demo__grid" hide-attribution :theme="theme" :plugins="ganttPlugins" :source="visibleTasks" :columns="ganttColumns" :gantt.prop="ganttConfig" :gantt-resources.prop="ganttResources" :gantt-assignments.prop="ganttAssignments" @gantt-before-task-change="handleGanttEdit" @gantt-before-assignment-change="handleGanttAssignmentEdit" />
    <RevoGrid v-else :key="activeView" class="planning-demo__grid" hide-attribution :theme="theme" :plugins="schedulerPlugins" :source="[]" :columns="[]" resize :event-scheduler.prop="activeView === 'calendar' ? calendarConfig : schedulerConfig" :event-scheduler-resources.prop="schedulerResources" :event-scheduler-events.prop="schedulerEvents" @event-scheduler-event-changed="handleSchedulerEdit" />
    <footer class="planning-demo__footer"><span>{{ visibleTasks.length }} matching tasks · {{ projectLabel }}<template v-if="selectedIds.size"> · {{ selectedIds.size }} selected</template></span><span>Changes stay in this demo</span></footer>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import RevoGrid from '@revolist/vue3-datagrid';
import { RowSelectPlugin, type RowSelectConfig } from '@revolist/revogrid-pro';
import { GanttPlugin, type GanttBeforeAssignmentChangeDetail, type GanttBeforeTaskChangeDetail } from '@revolist/gantt';
import { KanbanPlugin, type KanbanCardCreateDetail, type KanbanCardDeleteDetail, type KanbanCardMoveDetail, type KanbanCardUpdateDetail } from '@revolist/kanban';
import { EventSchedulerPlugin, type EventSchedulerEventChangedDetail } from '@revolist/scheduler';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import { calendarConfig, createTasks, defaultPlanningFilters, filterPlanningTasks, ganttColumns, ganttConfig, ganttResources, gridColumns, kanbanConfig, mergeVisibleTasks, planningProjects, schedulerConfig, schedulerResources, selectedPlanningTaskIds, toGanttAssignments, toSchedulerEvents, updateFromGantt, updateFromGanttAssignment, updateFromGrid, updateFromKanban, updateFromKanbanCreate, updateFromKanbanUpdate, updateFromScheduler, views, type PlanningView, type PlanningTask } from './data';
import './planning.scss';

const rootRef = ref<HTMLElement>(); const moreMenuRef = ref<HTMLDetailsElement>(); const filterWrapRef = ref<HTMLElement>(); const activeView = ref<PlanningView>('grid'); const tasks = ref(createTasks()); const filters = ref(defaultPlanningFilters()); const filterOpen = ref(false); const resetKey = ref(0); const selectedIds = ref(new Set<string>()); const isDark = ref(currentTheme().isDark());
const theme = computed(() => isDark.value ? 'darkCompact' : 'compact'); const gridPlugins = [RowSelectPlugin]; const ganttPlugins = [GanttPlugin]; const kanbanPlugins = [KanbanPlugin]; const schedulerPlugins = [EventSchedulerPlugin]; const rowSelect: RowSelectConfig = { rowOrder: false };
const visibleTasks = computed(() => filterPlanningTasks(tasks.value, filters.value)); const visibleIds = computed(() => new Set(visibleTasks.value.map(({ id }) => id))); const ganttAssignments = computed(() => toGanttAssignments(tasks.value).filter(({ taskId }) => visibleIds.value.has(String(taskId)))); const schedulerEvents = computed(() => toSchedulerEvents(visibleTasks.value));
const projectLabel = computed(() => planningProjects.find(({ id }) => id === filters.value.projectId)?.label ?? 'All projects'); const activeFilterCount = computed(() => filters.value.statuses.length + filters.value.priorities.length);
const statusOptions = [{ value: 'not-started', label: 'Planned' }, { value: 'in-progress', label: 'In progress' }, { value: 'blocked', label: 'Blocked' }, { value: 'done', label: 'Done' }]; const priorityOptions = [{ value: 500, label: 'Normal' }, { value: 700, label: 'High' }, { value: 900, label: 'Critical' }];
const filterChips = computed(() => [...(filters.value.projectId === 'all' ? [] : [{ key: 'project', label: `Project: ${projectLabel.value}`, remove: () => { filters.value.projectId = 'all'; } }]), ...filters.value.statuses.map(value => ({ key: `status-${value}`, label: statusOptions.find(item => item.value === value)?.label ?? value, remove: () => { filters.value.statuses = filters.value.statuses.filter(item => item !== value); } })), ...filters.value.priorities.map(value => ({ key: `priority-${value}`, label: priorityOptions.find(item => item.value === value)?.label ?? String(value), remove: () => { filters.value.priorities = filters.value.priorities.filter(item => item !== value); } }))]);
const disconnectTheme = observeCurrentTheme(value => { isDark.value = value; });
function closePopovers() { filterOpen.value = false; if (moreMenuRef.value) moreMenuRef.value.open = false; }
function handleDocumentPointerDown(event: PointerEvent) { const path = event.composedPath(); if (filterOpen.value && filterWrapRef.value && !path.includes(filterWrapRef.value)) filterOpen.value = false; if (moreMenuRef.value?.open && !path.includes(moreMenuRef.value)) moreMenuRef.value.open = false; }
onMounted(() => document.addEventListener('pointerdown', handleDocumentPointerDown));
onBeforeUnmount(() => { disconnectTheme(); document.removeEventListener('pointerdown', handleDocumentPointerDown); });
function clearFilters() { filters.value = defaultPlanningFilters(); filterOpen.value = false; }
function openSource(event: MouseEvent) { (event.currentTarget as HTMLElement).dispatchEvent(new CustomEvent('demo-open-source', { bubbles: true })); }
function resetWorkspace() { tasks.value = createTasks(); selectedIds.value = new Set(); clearFilters(); resetKey.value += 1; closePopovers(); }
async function toggleFullscreen() { if (!rootRef.value) return; closePopovers(); if (document.fullscreenElement) await document.exitFullscreen(); else await rootRef.value.requestFullscreen(); }
function merge(next: PlanningTask[]) { tasks.value = mergeVisibleTasks(tasks.value, next); }
function handleGridEdit(event: CustomEvent) { tasks.value = updateFromGrid(tasks.value, event.detail); }
function handleRowSelected(event: CustomEvent<{ selected: { forEach(callback: (indexes: Iterable<number>) => void): void } }>) { selectedIds.value = selectedPlanningTaskIds(visibleTasks.value, event.detail.selected); }
function handleKanbanMove(event: CustomEvent<KanbanCardMoveDetail<PlanningTask>>) { merge(updateFromKanban(visibleTasks.value, event.detail)); }
function handleKanbanCreate(event: CustomEvent<KanbanCardCreateDetail<PlanningTask>>) { tasks.value = [...tasks.value, ...updateFromKanbanCreate([], event.detail)]; }
function handleKanbanUpdate(event: CustomEvent<KanbanCardUpdateDetail<PlanningTask>>) { merge(updateFromKanbanUpdate(visibleTasks.value, event.detail)); }
function handleKanbanDelete(event: CustomEvent<KanbanCardDeleteDetail<PlanningTask>>) { const deleted = new Set(event.detail.cardIds.map(String)); tasks.value = tasks.value.filter(({ id }) => !deleted.has(id)); }
function handleGanttEdit(event: CustomEvent<GanttBeforeTaskChangeDetail>) { tasks.value = updateFromGantt(tasks.value, event.detail); }
function handleGanttAssignmentEdit(event: CustomEvent<GanttBeforeAssignmentChangeDetail>) { tasks.value = updateFromGanttAssignment(tasks.value, event.detail); }
function handleSchedulerEdit(event: CustomEvent<EventSchedulerEventChangedDetail>) { tasks.value = updateFromScheduler(tasks.value, event.detail); }
</script>
