<template>
  <section class="planning-demo">
    <nav class="planning-demo__switch" aria-label="Planning view">
      <button
        v-for="view in views"
        :key="view"
        type="button"
        :class="{ active: activeView === view }"
        :aria-selected="activeView === view"
        @click="activeView = view"
      >
        {{ view }}
      </button>
    </nav>

    <RevoGrid
      v-if="activeView === 'grid'"
      key="grid"
      class="planning-demo__grid"
      hide-attribution
      :theme="theme"
      :source="tasks"
      :columns="gridColumns"
      range
      resize
      row-headers
      filter
      can-move-columns
      @afteredit="handleGridEdit"
    />
    <RevoGrid
      v-else-if="activeView === 'kanban'"
      key="kanban"
      class="planning-demo__grid"
      hide-attribution
      :theme="theme"
      :plugins="kanbanPlugins"
      :source="tasks"
      :columns="gridColumns"
      :kanban.prop="kanbanConfig"
      @kanbancardmove="handleKanbanMove"
    />
    <RevoGrid
      v-else-if="activeView === 'gantt'"
      key="gantt"
      class="planning-demo__grid"
      hide-attribution
      :theme="theme"
      :plugins="ganttPlugins"
      :source="tasks"
      :columns="ganttColumns"
      :gantt.prop="ganttConfig"
      :gantt-resources.prop="ganttResources"
      :gantt-assignments.prop="ganttAssignments"
      @gantt-before-task-change="handleGanttEdit"
      @gantt-before-assignment-change="handleGanttAssignmentEdit"
    />
    <RevoGrid
      v-else
      key="scheduler"
      class="planning-demo__grid"
      hide-attribution
      :theme="theme"
      :plugins="schedulerPlugins"
      :source="[]"
      :columns="[]"
      resize
      filter
      :event-scheduler.prop="schedulerConfig"
      :event-scheduler-resources.prop="schedulerResources"
      :event-scheduler-events.prop="schedulerEvents"
      @event-scheduler-event-changed="handleSchedulerEdit"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import RevoGrid from '@revolist/vue3-datagrid';
import {
  EventSchedulerPlugin,
  GanttPlugin,
  KanbanPlugin,
  type EventSchedulerEventChangedDetail,
  type GanttBeforeAssignmentChangeDetail,
  type GanttBeforeTaskChangeDetail,
  type KanbanCardMoveDetail,
} from '@revolist/revogrid-enterprise';
import {
  currentTheme,
  observeCurrentTheme,
} from '../../composables/useRandomData';
import {
  createTasks,
  ganttColumns,
  ganttConfig,
  ganttResources,
  gridColumns,
  kanbanConfig,
  schedulerConfig,
  schedulerResources,
  toGanttAssignments,
  toSchedulerEvents,
  updateFromGantt,
  updateFromGanttAssignment,
  updateFromGrid,
  updateFromKanban,
  updateFromScheduler,
  views,
  type PlanningView,
  type PlanningTask,
} from './data';
import './planning.scss';

const activeView = ref<PlanningView>('grid');
const tasks = ref(createTasks());
const isDark = ref(currentTheme().isDark());
const theme = computed(() => (isDark.value ? 'darkCompact' : 'compact'));
const ganttPlugins = [GanttPlugin];
const kanbanPlugins = [KanbanPlugin];
const schedulerPlugins = [EventSchedulerPlugin];
const ganttAssignments = computed(() => toGanttAssignments(tasks.value));
const schedulerEvents = computed(() => toSchedulerEvents(tasks.value));
const disconnectTheme = observeCurrentTheme((value) => {
  isDark.value = value;
});

onBeforeUnmount(disconnectTheme);

function handleGridEdit(event: CustomEvent) {
  tasks.value = updateFromGrid(tasks.value, event.detail);
}

function handleKanbanMove(event: CustomEvent<KanbanCardMoveDetail<PlanningTask>>) {
  tasks.value = updateFromKanban(tasks.value, event.detail);
}

function handleGanttEdit(event: CustomEvent<GanttBeforeTaskChangeDetail>) {
  tasks.value = updateFromGantt(tasks.value, event.detail);
}

function handleGanttAssignmentEdit(
  event: CustomEvent<GanttBeforeAssignmentChangeDetail>,
) {
  tasks.value = updateFromGanttAssignment(tasks.value, event.detail);
}

function handleSchedulerEdit(
  event: CustomEvent<EventSchedulerEventChangedDetail>,
) {
  tasks.value = updateFromScheduler(tasks.value, event.detail);
}
</script>
