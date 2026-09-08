<template>
    <section ref="rootRef" class="planning-demo planning-demo--filter-toolbar">
        <div class="planning-demo__topbar">
            <nav
                class="planning-demo__switch"
                role="tablist"
                aria-label="Planning view"
            >
                <button
                    v-for="view in views"
                    :key="view"
                    type="button"
                    :class="{ on: activeView === view }"
                    role="tab"
                    :aria-selected="activeView === view"
                    :data-demo-action="`view_${view}`"
                    @click="activeView = view"
                >
                    {{ view }}
                </button>
            </nav>
            <div class="planning-demo__actions">
                <span v-if="showHint" class="planning-demo__hint">
                    Double-click a cell to edit
                    <button
                        type="button"
                        aria-label="Dismiss editing hint"
                        @click="showHint = false"
                    >
                        ×
                    </button>
                </span>
                <span
                    v-if="hasActiveFilters"
                    class="planning-demo__filter-status"
                    role="status"
                >
                    <FontAwesomeSvgIcon name="filter" />
                    Filtered · {{ visibleTasks.length }} of {{ tasks.length }}
                </span>
                <button
                    type="button"
                    data-demo-action="apply_active_tasks"
                    @click="applyActiveTasksPreset"
                >
                    Active tasks
                </button>
                <button
                    type="button"
                    :aria-pressed="showInlineFilters"
                    data-demo-action="toggle_column_filters"
                    @click="toggleColumnFilters"
                >
                    Column filters
                </button>
                <button
                    type="button"
                    data-demo-action="reset_workspace"
                    @click="resetWorkspace"
                >
                    Reset
                </button>
                <button
                    class="planning-demo__fullscreen"
                    type="button"
                    aria-label="Full screen"
                    title="Full screen"
                    @click="toggleFullscreen"
                >
                    <FontAwesomeSvgIcon name="expand" />
                </button>
            </div>
        </div>
        <div v-show="activeView === 'grid'" class="planning-demo__grid-stage">
            <label class="planning-demo__filter-search">
                <input
                    v-model="quickSearch"
                    type="search"
                    aria-label="Quick search tasks"
                    placeholder="Quick search tasks…"
                />
            </label>
            <RevoGrid
                :key="gridKey"
                ref="gridRef"
                class="planning-demo__grid"
                hide-attribution
                :theme="theme"
                :plugins="displayedGridPlugins"
                :source="tasks"
                :columns="gridColumns"
                :column-types="gridColumnTypes"
                :data-grid-context-menu.prop="planningDataGridContextMenu"
                :data-grid-formatting.prop="planningDataGridFormatting"
                :filter.prop="gridFilterConfig"
                :row-size="40"
                :stretch="1"
                range
                resize
                can-move-columns
                :row-select.prop="rowSelect"
                :quick-filter.prop="quickFilter"
                :filter-badges.prop="filterBadgeOptions"
                @afteredit="handleGridEdit"
                @rowselected="handleRowSelected"
                @afterfilterapply="syncVisibleTasks"
                @afterquickfilterapply="syncVisibleTasks"
            />
        </div>
        <RevoGrid
            v-if="activeView === 'kanban'"
            key="kanban"
            class="planning-demo__grid planning-demo__grid--kanban"
            hide-attribution
            :theme="theme"
            :plugins="kanbanPlugins"
            :source="visibleTasks"
            :columns="gridColumns"
            :kanban.prop="kanbanConfig"
            @kanbancardmove="handleKanbanMove"
            @kanbancardcreate="handleKanbanCreate"
            @kanbancardupdate="handleKanbanUpdate"
            @kanbancarddelete="handleKanbanDelete"
        />
        <RevoGrid
            v-else-if="activeView === 'gantt'"
            key="gantt"
            class="planning-demo__grid planning-demo__grid--timeline"
            hide-attribution
            :theme="theme"
            :plugins="ganttPlugins"
            :source="visibleTasks"
            :columns="ganttColumns"
            :gantt.prop="ganttConfig"
            :gantt-dependencies.prop="ganttDependencies"
            :gantt-resources.prop="ganttResources"
            :gantt-assignments.prop="ganttAssignments"
            @gantt-before-task-change="handleGanttEdit"
            @gantt-before-assignment-change="handleGanttAssignmentEdit"
        />
        <RevoGrid
            v-else-if="
                activeView === 'scheduler' || activeView === 'calendar'
            "
            :key="activeView"
            class="planning-demo__grid planning-demo__grid--timeline"
            hide-attribution
            :theme="theme"
            :plugins="schedulerPlugins"
            :source="[]"
            :columns="[]"
            resize
            :can-move-columns="false"
            :event-scheduler.prop="
                activeView === 'calendar' ? calendarConfig : schedulerConfig
            "
            :event-scheduler-resources.prop="schedulerResources"
            :event-scheduler-events.prop="schedulerEvents"
            @event-scheduler-event-changed="handleSchedulerEdit"
        />
        <footer class="planning-demo__footer">
            <span
                >{{ visibleTasks.length }} of {{ tasks.length }} tasks<template
                    v-if="selectedCount"
                >
                    · {{ selectedCount }} selected</template
                ></span
            ><span>Changes stay in this demo</span>
        </footer>
    </section>
</template>

<script setup lang="ts">
import RevoGrid from '@revolist/vue3-datagrid'
import FontAwesomeSvgIcon from '../../../.vitepress/theme/home-v2/FontAwesomeSvgIcon.vue'
import { usePlanningWorkspace } from './composables/usePlanningWorkspace'
import './planning.scss'

const {
    activeView,
    applyActiveTasksPreset,
    calendarConfig,
    filterBadgeOptions,
    displayedGridPlugins,
    ganttAssignments,
    ganttColumns,
    ganttConfig,
    ganttDependencies,
    ganttPlugins,
    ganttResources,
    hasActiveFilters,
    gridColumnTypes,
    gridColumns,
    gridFilterConfig,
    gridKey,
    gridPlugins,
    gridRef,
    handleGanttAssignmentEdit,
    handleGanttEdit,
    handleGridEdit,
    handleKanbanCreate,
    handleKanbanDelete,
    handleKanbanMove,
    handleKanbanUpdate,
    handleRowSelected,
    handleSchedulerEdit,
    kanbanConfig,
    kanbanPlugins,
    planningDataGridContextMenu,
    planningDataGridFormatting,
    quickFilter,
    quickSearch,
    resetWorkspace,
    rootRef,
    rowSelect,
    schedulerConfig,
    schedulerEvents,
    schedulerPlugins,
    schedulerResources,
    selectedCount,
    showHint,
    showInlineFilters,
    syncVisibleTasks,
    tasks,
    theme,
    toggleFullscreen,
    toggleColumnFilters,
    visibleTasks,
    views,
} = usePlanningWorkspace()
</script>
