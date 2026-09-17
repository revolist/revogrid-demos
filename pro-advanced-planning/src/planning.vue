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
                    :class="{ on: isActiveTasksPreset }"
                    :aria-pressed="isActiveTasksPreset"
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
                :filter-badges.prop="filterBadgeOptions"
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
            :filter-badges.prop="filterBadgeOptions"
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
            :filter-badges.prop="filterBadgeOptions"
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
            <span class="planning-demo__footer-meta">Changes stay in this demo</span>
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
    emptySource,
    filterBadgeOptions,
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
    resetWorkspace,
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
