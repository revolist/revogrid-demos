<template>
  <section ref="rootRef" class="planning-demo planning-demo--filter-toolbar" @keydown.esc="closePopovers">
    <div class="planning-demo__topbar">
      <nav class="planning-demo__switch" role="tablist" aria-label="Planning view">
        <button v-for="view in views" :key="view" type="button" :class="{ on: activeView === view }" role="tab" :aria-selected="activeView === view" @click="activeView = view">
          {{ view }}<span class="planning-demo__pro">Pro</span>
        </button>
      </nav>
      <div class="planning-demo__actions"><button type="button" @click="openSource"><FontAwesomeSvgIcon class="planning-demo__action-icon" name="code"/>Code</button><a href="/gantt/"><FontAwesomeSvgIcon class="planning-demo__action-icon" name="bookOpen"/>Docs</a><details ref="moreMenuRef"><summary><FontAwesomeSvgIcon class="planning-demo__action-icon" name="ellipsis"/>More</summary><div><button type="button" @click="resetWorkspace">Reset</button><button type="button" @click="toggleFullscreen">Full screen</button></div></details></div>
    </div>
    <RevoGrid v-if="activeView === 'grid'" ref="gridRef" :key="`grid-${resetKey}`" class="planning-demo__grid" hide-attribution :theme="theme" :plugins="gridPlugins" :source="tasks" :columns="gridColumns" :filter.prop="planningFilterConfig" :row-size="40" range resize can-move-columns :row-select.prop="rowSelect" :quick-filter.prop="quickFilter" :filter-badges.prop="filterBadgeOptions" @afteredit="handleGridEdit" @rowselected="handleRowSelected" @afterfilterapply="syncVisibleTasks" @afterquickfilterapply="syncVisibleTasks" />
    <RevoGrid v-else-if="activeView === 'kanban'" key="kanban" class="planning-demo__grid planning-demo__grid--kanban" hide-attribution :theme="theme" :plugins="kanbanPlugins" :source="visibleTasks" :columns="gridColumns" :kanban.prop="kanbanConfig" @kanbancardmove="handleKanbanMove" @kanbancardcreate="handleKanbanCreate" @kanbancardupdate="handleKanbanUpdate" @kanbancarddelete="handleKanbanDelete" />
    <RevoGrid v-else-if="activeView === 'gantt'" key="gantt" class="planning-demo__grid" hide-attribution :theme="theme" :plugins="ganttPlugins" :source="visibleTasks" :columns="ganttColumns" :gantt.prop="ganttConfig" :gantt-resources.prop="ganttResources" :gantt-assignments.prop="ganttAssignments" @gantt-before-task-change="handleGanttEdit" @gantt-before-assignment-change="handleGanttAssignmentEdit" />
    <RevoGrid v-else :key="activeView" class="planning-demo__grid" hide-attribution :theme="theme" :plugins="schedulerPlugins" :source="[]" :columns="[]" resize :event-scheduler.prop="activeView === 'calendar' ? calendarConfig : schedulerConfig" :event-scheduler-resources.prop="schedulerResources" :event-scheduler-events.prop="schedulerEvents" @event-scheduler-event-changed="handleSchedulerEdit" />
    <footer class="planning-demo__footer"><span>{{ visibleTasks.length }} matching tasks<template v-if="selectedCount"> · {{ selectedCount }} selected</template></span><span>Changes stay in this demo</span></footer>
  </section>
</template>

<script setup lang="ts">
import RevoGrid from '@revolist/vue3-datagrid';
import FontAwesomeSvgIcon from '../../../.vitepress/theme/home-v2/FontAwesomeSvgIcon.vue';
import { usePlanningWorkspace } from './composables/usePlanningWorkspace';
import './planning.scss';

const {
  activeView, calendarConfig, closePopovers, filterBadgeOptions, ganttAssignments,
  ganttColumns, ganttConfig, ganttPlugins, ganttResources, gridColumns, gridPlugins,
  gridRef, handleGanttAssignmentEdit, handleGanttEdit, handleGridEdit,
  handleKanbanCreate, handleKanbanDelete, handleKanbanMove, handleKanbanUpdate,
  handleRowSelected, handleSchedulerEdit, kanbanConfig, kanbanPlugins, moreMenuRef,
  openSource, planningFilterConfig, quickFilter, quickSearch, resetKey, resetWorkspace,
  rootRef, rowSelect, schedulerConfig, schedulerEvents, schedulerPlugins,
  schedulerResources, selectedCount, syncVisibleTasks, tasks, theme, toggleFullscreen,
  visibleTasks, views,
} = usePlanningWorkspace();
</script>
