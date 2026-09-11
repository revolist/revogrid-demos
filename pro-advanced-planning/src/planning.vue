<template>
    <section
        ref="rootRef"
        class="planning-demo planning-demo--filter-toolbar"
    >
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
                    @click="selectPlanningView(view)"
                >
                    {{ view }}
                </button>
            </nav>
            <div class="planning-demo__actions">
                <button
                    type="button"
                    data-demo-action="apply_active_tasks"
                    @click="applyActiveTasksPreset"
                >
                    Active tasks
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
                    <span aria-hidden="true">↗</span>
                </button>
            </div>
        </div>
        <div class="planning-demo__filter-row">
            <label class="planning-demo__filter-search">
                <input
                    v-model="quickSearch"
                    type="search"
                    aria-label="Quick search tasks"
                    placeholder="Quick search tasks…"
                />
            </label>
            <div
                ref="filterBadgesRef"
                class="planning-demo__filter-badge-host"
            />
        </div>
        <div v-show="activeView === 'grid'" class="planning-demo__grid-stage">
            <RevoGrid
                :key="gridKey"
                ref="gridRef"
                class="planning-demo__grid"
                hide-attribution
                :theme="theme"
                :plugins="gridPlugins"
                :source="tasks"
                :columns="gridColumns"
                :column-types="gridColumnTypes"
                :data-grid-context-menu.prop="planningDataGridContextMenu"
                :data-grid-formatting.prop="planningDataGridFormatting"
                :filter.prop="gridFilterConfig"
                :row-size="40"
                :resize-row="planningRowResize"
                :row-order.prop="planningRowOrder"
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
            ref="kanbanRef"
            key="kanban"
            class="planning-demo__grid planning-demo__grid--kanban"
            hide-attribution
            :theme="theme"
            :plugins="kanbanPlugins"
            :source="visibleTasks"
            :columns="gridColumns"
            :kanban.prop="kanbanConfig"
            @gridedit="handlePlanningEdit"
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
            :resize-row="planningRowResize"
            :gantt.prop="ganttConfig"
            :gantt-dependencies.prop="visibleGanttDependencies"
            :gantt-resources.prop="ganttResources"
            :gantt-assignments.prop="ganttAssignments"
            @gridedit="handlePlanningEdit"
        />
        <RevoGrid
            v-else-if="activeView === 'scheduler' || activeView === 'calendar'"
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
            @gridedit="handlePlanningEdit"
        />
        <footer class="planning-demo__footer">
            <span
                >{{ visibleTasks.length }} of {{ tasks.length }} tasks<template
                    v-if="selectedCount"
                >
                    · {{ selectedCount }} selected</template
                ></span
            ><span class="planning-demo__footer-meta">Changes stay in this demo</span>
        </footer>
    </section>
</template>

<script setup lang="ts">
import RevoGrid from '@revolist/vue3-datagrid'
import { usePlanningWorkspace } from './composables/usePlanningWorkspace'
import './planning.scss'

const {
    activeView,
    applyActiveTasksPreset,
    calendarConfig,
    filterBadgeOptions,
    filterBadgesRef,
    ganttAssignments,
    ganttColumns,
    ganttConfig,
    ganttPlugins,
    ganttResources,
    gridColumnTypes,
    gridColumns,
    gridFilterConfig,
    gridKey,
    gridPlugins,
    gridRef,
    handleGridEdit,
    handlePlanningEdit,
    handleRowSelected,
    kanbanConfig,
    kanbanRef,
    kanbanPlugins,
    planningDataGridContextMenu,
    planningDataGridFormatting,
    planningRowOrder,
    planningRowResize,
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
    selectPlanningView,
    syncVisibleTasks,
    tasks,
    theme,
    toggleFullscreen,
    visibleTasks,
    visibleGanttDependencies,
    views,
} = usePlanningWorkspace()
</script>
