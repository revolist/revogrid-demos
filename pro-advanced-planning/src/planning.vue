<template>
    <section
        ref="rootRef"
        class="planning-demo planning-demo--filter-toolbar"
        :data-theme="theme === 'darkCompact' ? 'dark' : 'light'"
    >
        <nav class="planning-demo__switch rv-segmented-switch" role="tablist" aria-label="Planning view">
            <button v-rv-control v-for="view in views" :key="view" type="button"
                class="rv-segmented-switch-item" :class="{ on: activeView === view }"
                role="tab" :aria-selected="activeView === view"
                :data-demo-action="`view_${view}`" @click="selectPlanningView(view)">
                {{ view }}
            </button>
        </nav>
        <div class="planning-demo__toolbar" role="group" aria-label="Task filters">
            <label class="planning-demo__search rv-search-input rv-search-input--no-shortcut">
                <span class="rv-search-input-icon" aria-hidden="true"><img :src="searchIcon" alt="" /></span>
                <input v-rv-control type="search" aria-label="Search tasks" placeholder="Search tasks…"
                    :value="filters.query" @input="changeFilters({ ...filters, query: ($event.target as HTMLInputElement).value })" />
            </label>
            <div class="planning-demo__filters">
                <span class="planning-demo__filter">
                    <Dropdown class="rv-select" v-bind="planningFilterDropdowns.project" :value="filters.projectId"
                        @update:model-value="value => changeFilters({ ...filters, projectId: value as PlanningFilters['projectId'] })" />
                </span>
                <template v-if="activeView === 'kanban'">
                    <span class="planning-demo__filter">
                        <Dropdown class="rv-select" v-bind="planningFilterDropdowns.status"
                            :value="filters.statuses.length > 1 ? 'active' : filters.statuses[0] || ''"
                            @update:model-value="value => changeFilters({ ...filters, statuses: value ? [String(value)] : [] })" />
                    </span>
                    <span class="planning-demo__filter">
                        <Dropdown class="rv-select" v-bind="planningFilterDropdowns.priority"
                            :value="String(filters.priorities[0] ?? '')"
                            @update:model-value="value => changeFilters({ ...filters, priorities: value ? [Number(value)] : [] })" />
                    </span>
                </template>
            </div>
            <button v-rv-control class="rv-choice-chip planning-demo__active" type="button" :class="{ on: isActiveTasksPreset }"
                :aria-pressed="isActiveTasksPreset" data-demo-action="apply_active_tasks" @click="applyActiveTasksPreset">Active tasks</button>
        </div>
        <div v-if="activeView === 'grid'" class="planning-demo__grid-stage">
            <RevoGrid
                :key="gridKey"
                class="planning-demo__grid"
                hide-attribution
                :theme="theme"
                :plugins="gridPlugins"
                :source="tasks"
                :columns="gridColumns"
                :column-types="gridColumnTypes"
                :data-grid-context-menu.prop="planningDataGridContextMenu"
                :data-grid-formatting.prop="planningDataGridFormatting"
                :range-selection-limit.prop="'column'"
                :filter.prop="gridFilterConfig"
                :row-size="40"
                :row-order.prop="planningRowOrder"
                :stretch="1"
                range
                resize
                can-move-columns
                :row-select.prop="rowSelect"
                @gridedit="handlePlanningEdit"
                @roworderapplied="handleGridRowOrder"
                @filterastchange="
                    $event.detail.origin === 'ui' &&
                    (viewFilters.grid.filterAst = $event.detail.filterAst)
                "
            />
        </div>
        <RevoGrid
            v-else-if="activeView === 'kanban'"
            key="kanban"
            class="planning-demo__grid planning-demo__grid--kanban"
            hide-attribution
            :theme="theme"
            :plugins="kanbanPlugins"
            :source="tasks"
            :columns="gridColumns"
            :kanban.prop="kanbanConfig"
            :filter.prop="kanbanFilterConfig"
            @gridedit="handlePlanningEdit"
            @filterastchange="
                $event.detail.origin === 'ui' &&
                (viewFilters.kanban.filterAst = $event.detail.filterAst)
            "
        />
        <RevoGrid
            v-else-if="activeView === 'gantt'"
            key="gantt"
            class="planning-demo__grid planning-demo__grid--timeline"
            hide-attribution
            :theme="theme"
            :plugins="ganttPlugins"
            :source="tasks"
            :columns="ganttColumns"
            :row-order.prop="false"
            :gantt.prop="ganttConfig"
            :gantt-dependencies.prop="visibleGanttDependencies"
            :gantt-resources.prop="ganttResources"
            :gantt-assignments.prop="ganttAssignments"
            :filter.prop="ganttFilterConfig"
            @gridedit="handlePlanningEdit"
            @filterastchange="
                $event.detail.origin === 'ui' &&
                (viewFilters.gantt.filterAst = $event.detail.filterAst)
            "
        />
        <RevoGrid
            v-else-if="activeView === 'scheduler' || activeView === 'calendar'"
            :key="activeView"
            class="planning-demo__grid planning-demo__grid--timeline"
            hide-attribution
            :theme="theme"
            :plugins="schedulerPlugins"
            :source="tasks"
            :columns="emptySource"
            resize
            :can-move-columns="false"
            :event-scheduler.prop="
                activeView === 'calendar' ? calendarConfig : schedulerConfig
            "
            :event-scheduler-resources.prop="schedulerResources"
            @gridedit="handlePlanningEdit"
        />
        <footer class="planning-demo__footer">
            <button v-rv-control class="planning-demo__fullscreen rv-btn-ghost" type="button"
                aria-label="Full screen" title="Full screen" @click="toggleFullscreen"><span aria-hidden="true">↗</span></button>
        </footer>
    </section>
</template>

<script setup lang="ts">
import { Dropdown } from '@revolist/ui/vue';
import { vRvControl } from '@revolist/ui/vue-control';
import '@revolist/ui/styles.css';
import RevoGrid from '@revolist/vue3-datagrid'
import { usePlanningWorkspace } from './composables/usePlanningWorkspace'
import './planning.scss'
import searchIcon from './assets/search.svg'
import { planningFilterDropdowns, type PlanningFilters } from './data'

const {
    activeView,
    filters,
    changeFilters,
    applyActiveTasksPreset,
    calendarConfig,
    emptySource,
    ganttAssignments,
    ganttColumns,
    ganttConfig,
    ganttFilterConfig,
    ganttPlugins,
    ganttResources,
    gridColumnTypes,
    gridColumns,
    gridFilterConfig,
    isActiveTasksPreset,
    gridKey,
    gridPlugins,
    handleGridRowOrder,
    handlePlanningEdit,
    kanbanConfig,
    kanbanFilterConfig,
    kanbanPlugins,
    planningDataGridContextMenu,
    planningDataGridFormatting,
    planningRowOrder,
    rootRef,
    rowSelect,
    schedulerConfig,
    schedulerPlugins,
    schedulerResources,
    selectPlanningView,
    tasks,
    theme,
    toggleFullscreen,
    visibleGanttDependencies,
    viewFilters,
    views,
} = usePlanningWorkspace()
</script>
