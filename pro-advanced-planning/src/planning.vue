<template>
  <section ref="rootRef" class="planning-demo" @click.capture="handleGridHeaderSelectAllClick" @keydown.esc="closePopovers">
    <div class="planning-demo__topbar">
      <nav class="planning-demo__switch" role="tablist" aria-label="Planning view">
        <button v-for="view in views" :key="view" type="button" :class="{ on: activeView === view }" role="tab" :aria-selected="activeView === view" @click="activeView = view">
          {{ view }}<span class="planning-demo__pro">Pro</span>
        </button>
      </nav>
      <div class="planning-demo__actions"><button type="button" @click="openSource"><FontAwesomeSvgIcon class="planning-demo__action-icon" name="code"/>Code</button><a href="/gantt/"><FontAwesomeSvgIcon class="planning-demo__action-icon" name="bookOpen"/>Docs</a><details ref="moreMenuRef"><summary><FontAwesomeSvgIcon class="planning-demo__action-icon" name="ellipsis"/>More</summary><div><button type="button" @click="resetWorkspace">Reset</button><button type="button" @click="toggleFullscreen">Full screen</button></div></details></div>
    </div>
    <p class="planning-demo__hint">{{ activeView === 'kanban' ? 'Change a status to move a task.' : 'Change a status, then open Kanban.' }}</p>
    <div class="planning-demo__toolbar">
      <label class="planning-demo__search"><span class="sr-only">Quick search tasks</span><input v-model="quickSearch" type="search" placeholder="Quick search tasks…" /></label>
      <span class="planning-demo__filter-help">Use the Status or Priority column menu to filter.</span>
      <span class="planning-demo__count" aria-live="polite">{{ visibleTasks.length }} of {{ tasks.length }} tasks</span>
    </div>
    <RevoGrid v-if="activeView === 'grid'" ref="gridRef" :key="`grid-${resetKey}`" class="planning-demo__grid" hide-attribution :theme="theme" :plugins="gridPlugins" :source="tasks" :columns="gridColumns" :filter.prop="planningFilterConfig" :row-size="40" range resize can-move-columns :row-select.prop="rowSelect" :quick-filter.prop="quickFilter" :filter-badges.prop="filterBadgeOptions" @afteredit="handleGridEdit" @rowselected="handleRowSelected" @afterfilterapply="syncVisibleTasks" @afterquickfilterapply="syncVisibleTasks" />
    <RevoGrid v-else-if="activeView === 'kanban'" key="kanban" class="planning-demo__grid planning-demo__grid--kanban" hide-attribution :theme="theme" :plugins="kanbanPlugins" :source="visibleTasks" :columns="gridColumns" :kanban.prop="kanbanConfig" @kanbancardmove="handleKanbanMove" @kanbancardcreate="handleKanbanCreate" @kanbancardupdate="handleKanbanUpdate" @kanbancarddelete="handleKanbanDelete" />
    <RevoGrid v-else-if="activeView === 'gantt'" key="gantt" class="planning-demo__grid" hide-attribution :theme="theme" :plugins="ganttPlugins" :source="visibleTasks" :columns="ganttColumns" :gantt.prop="ganttConfig" :gantt-resources.prop="ganttResources" :gantt-assignments.prop="ganttAssignments" @gantt-before-task-change="handleGanttEdit" @gantt-before-assignment-change="handleGanttAssignmentEdit" />
    <RevoGrid v-else :key="activeView" class="planning-demo__grid" hide-attribution :theme="theme" :plugins="schedulerPlugins" :source="[]" :columns="[]" resize :event-scheduler.prop="activeView === 'calendar' ? calendarConfig : schedulerConfig" :event-scheduler-resources.prop="schedulerResources" :event-scheduler-events.prop="schedulerEvents" @event-scheduler-event-changed="handleSchedulerEdit" />
    <footer class="planning-demo__footer"><span>{{ visibleTasks.length }} matching tasks<template v-if="selectedIds.size"> · {{ selectedIds.size }} selected</template></span><span>Changes stay in this demo</span></footer>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import RevoGrid from '@revolist/vue3-datagrid';
import { AdvanceFilterPlugin, FilterHeaderPlugin, RowSelectPlugin, type AdvancedFilterBadgesOptions, type RowSelectConfig } from '@revolist/revogrid-pro';
import { GanttPlugin, type GanttBeforeAssignmentChangeDetail, type GanttBeforeTaskChangeDetail } from '@revolist/gantt';
import { KanbanPlugin, type KanbanCardCreateDetail, type KanbanCardDeleteDetail, type KanbanCardMoveDetail, type KanbanCardUpdateDetail } from '@revolist/kanban';
import { EventSchedulerPlugin, type EventSchedulerEventChangedDetail } from '@revolist/scheduler';
import FontAwesomeSvgIcon from '../../../.vitepress/theme/home-v2/FontAwesomeSvgIcon.vue';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import { calendarConfig, createTasks, ganttColumns, ganttConfig, ganttResources, gridColumns, kanbanConfig, mergeVisibleTasks, planningFilterConfig, schedulerConfig, schedulerResources, selectedPlanningTaskIds, toggleVisiblePlanningRows, toGanttAssignments, toSchedulerEvents, updateFromGantt, updateFromGanttAssignment, updateFromGrid, updateFromKanban, updateFromKanbanCreate, updateFromKanbanUpdate, updateFromScheduler, views, type PlanningView, type PlanningTask } from './data';
import './planning.scss';

const rootRef = ref<HTMLElement>(); const moreMenuRef = ref<HTMLDetailsElement>(); const gridRef = ref<any>(); const activeView = ref<PlanningView>('grid'); const tasks = ref(createTasks()); const quickSearch = ref(''); const visibleTaskIds = ref<string[] | undefined>(); const resetKey = ref(0); const selectedIds = ref(new Set<string>()); const isDark = ref(currentTheme().isDark());
const theme = computed(() => isDark.value ? 'darkCompact' : 'compact'); const gridPlugins = [RowSelectPlugin, AdvanceFilterPlugin, FilterHeaderPlugin]; const ganttPlugins = [GanttPlugin]; const kanbanPlugins = [KanbanPlugin]; const schedulerPlugins = [EventSchedulerPlugin]; const rowSelect: RowSelectConfig = { rowOrder: false };
const quickFilter = computed(() => ({ text: quickSearch.value, columns: ['name', 'owner'], debounceMs: 150 })); const filterBadgeOptions = { className: 'planning-demo__filter-badges', badgeClassName: 'planning-demo__filter-badge', emptyClassName: 'planning-demo__filter-badges--empty', renderEmpty: () => null } satisfies AdvancedFilterBadgesOptions;
const visibleTasks = computed(() => { const ids = visibleTaskIds.value; if (!ids) return tasks.value; const byId = new Map(tasks.value.map(task => [task.id, task])); return ids.flatMap(id => { const task = byId.get(id); return task ? [task] : []; }); }); const visibleIds = computed(() => new Set(visibleTasks.value.map(({ id }) => id))); const ganttAssignments = computed(() => toGanttAssignments(tasks.value).filter(({ taskId }) => visibleIds.value.has(String(taskId)))); const schedulerEvents = computed(() => toSchedulerEvents(visibleTasks.value));
const disconnectTheme = observeCurrentTheme(value => { isDark.value = value; });
function closePopovers() { if (moreMenuRef.value) moreMenuRef.value.open = false; }
onBeforeUnmount(() => { disconnectTheme(); });
async function syncVisibleTasks() { const grid = gridRef.value?.$el ?? gridRef.value; if (!grid) return; visibleTaskIds.value = (await grid.getVisibleSource()).map((task: PlanningTask) => task.id); }
function openSource(event: MouseEvent) { (event.currentTarget as HTMLElement).dispatchEvent(new CustomEvent('demo-open-source', { bubbles: true })); }
function resetWorkspace() { tasks.value = createTasks(); quickSearch.value = ''; visibleTaskIds.value = undefined; selectedIds.value = new Set(); resetKey.value += 1; closePopovers(); }
async function toggleFullscreen() { if (!rootRef.value) return; closePopovers(); if (document.fullscreenElement) await document.exitFullscreen(); else await rootRef.value.requestFullscreen(); }
function merge(next: PlanningTask[]) { tasks.value = mergeVisibleTasks(tasks.value, next); }
function handleGridEdit(event: CustomEvent) { tasks.value = updateFromGrid(tasks.value, event.detail); }
async function handleGridHeaderSelectAllClick(event: MouseEvent) {
  await toggleVisiblePlanningRows(event, selectedIds.value.size, visibleTasks.value.length);
}
function handleRowSelected(event: CustomEvent<{ selected: { forEach(callback: (indexes: Iterable<number>) => void): void } }>) { selectedIds.value = selectedPlanningTaskIds(visibleTasks.value, event.detail.selected); }
function handleKanbanMove(event: CustomEvent<KanbanCardMoveDetail<PlanningTask>>) { merge(updateFromKanban(visibleTasks.value, event.detail)); }
function handleKanbanCreate(event: CustomEvent<KanbanCardCreateDetail<PlanningTask>>) { tasks.value = [...tasks.value, ...updateFromKanbanCreate([], event.detail)]; }
function handleKanbanUpdate(event: CustomEvent<KanbanCardUpdateDetail<PlanningTask>>) { merge(updateFromKanbanUpdate(visibleTasks.value, event.detail)); }
function handleKanbanDelete(event: CustomEvent<KanbanCardDeleteDetail<PlanningTask>>) { const deleted = new Set(event.detail.cardIds.map(String)); tasks.value = tasks.value.filter(({ id }) => !deleted.has(id)); }
function handleGanttEdit(event: CustomEvent<GanttBeforeTaskChangeDetail>) { tasks.value = updateFromGantt(tasks.value, event.detail); }
function handleGanttAssignmentEdit(event: CustomEvent<GanttBeforeAssignmentChangeDetail>) { tasks.value = updateFromGanttAssignment(tasks.value, event.detail); }
function handleSchedulerEdit(event: CustomEvent<EventSchedulerEventChangedDetail>) { tasks.value = updateFromScheduler(tasks.value, event.detail); }
</script>
