<template>
  <div :class="shellClass">
    <div class="gantt-showcase-controls">
      <label class="gantt-showcase-control">
        <input v-model="showCriticalPath" class="gantt-showcase-control__input" type="checkbox" />
        <span class="gantt-showcase-control__label">Critical path</span>
      </label>
      <label class="gantt-showcase-control">
        <input v-model="showBaseline" class="gantt-showcase-control__input" type="checkbox" />
        <span class="gantt-showcase-control__label">Baselines</span>
      </label>
    </div>
    <RevoGrid
      ref="gridRef"
      class="gantt-showcase-grid skip-style cell-border"
      hide-attribution
      :readonly="false"
      :range="true"
      :resize="true"
      :row-size="42"
      :row-headers="false"
      :auto-size-column="false"
      :theme="gridTheme"
      :plugins="plugins"
      :hide-columns.prop="hiddenColumns"
      :source="source"
      :columns="columns"
      :gantt.prop="ganttConfig"
      :gantt-dependencies.prop="dependencies"
      :gantt-calendars.prop="calendars"
      :gantt-resources.prop="resources"
      :gantt-assignments.prop="assignments"
      :gantt-baselines.prop="baselines"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import RevoGrid from '@revolist/vue3-datagrid';
import { ExportExcelPlugin, RowStatusPlugin } from '@revolist/revogrid-pro';
import {
  STANDARD_CALENDAR,
  SHOWCASE_ASSIGNMENTS,
  SHOWCASE_BASELINES,
  SHOWCASE_COLUMNS_WITH_COMPLETION,
  SHOWCASE_DEFAULT_HIDDEN,
  SHOWCASE_DEPENDENCIES,
  SHOWCASE_GANTT_CONFIG,
  SHOWCASE_RESOURCES,
  SHOWCASE_TASKS,
  renderShowcaseTaskBarColor,
  renderShowcaseTaskBarContent,
} from '../shared/gantt-project-data';
import { currentThemeVue } from '../../composables/useRandomData';

// ── Static grid data ──────────────────────────────────────────────────────────
const plugins = ref<unknown[]>([]);
const source      = ref([...SHOWCASE_TASKS]);
const dependencies = ref([...SHOWCASE_DEPENDENCIES]);
const calendars    = ref([{ ...STANDARD_CALENDAR }]);
const resources    = ref([...SHOWCASE_RESOURCES]);
const assignments  = ref([...SHOWCASE_ASSIGNMENTS]);
const baselines    = ref([...SHOWCASE_BASELINES]);
const columns      = ref([...SHOWCASE_COLUMNS_WITH_COMPLETION]);
const hiddenColumns = [...SHOWCASE_DEFAULT_HIDDEN];
const showCriticalPath = ref(Boolean(SHOWCASE_GANTT_CONFIG.visuals.showCriticalPath));
const showBaseline = ref(false);
const { isDark } = currentThemeVue();
const gridTheme = computed(() => (isDark.value ? 'darkCompact' : 'compact'));
const shellClass = computed(() => [
  'gantt-showcase',
  'gantt-showcase-shell',
  'grow',
  'h-full',
  isDark.value ? 'gantt-showcase-shell--dark' : 'gantt-showcase-shell--light',
]);

const ganttConfig = computed(() => ({
  ...SHOWCASE_GANTT_CONFIG,
  visuals: {
    ...SHOWCASE_GANTT_CONFIG.visuals,
    showCriticalPath: showCriticalPath.value,
    showBaseline: showBaseline.value,
    taskBarColorHook: renderShowcaseTaskBarColor,
    taskBarContentHook: renderShowcaseTaskBarContent,
  },
}));

// ── Refs ──────────────────────────────────────────────────────────────────────
const gridRef    = ref<InstanceType<typeof RevoGrid> | HTMLRevoGridElement | null>(null);

onMounted(async () => {
  const { GanttPlugin } = await import('@revolist/revogrid-enterprise');

  plugins.value = [GanttPlugin, ExportExcelPlugin, RowStatusPlugin];
});
</script>

<style src="./gantt-showcase.scss" lang="scss"></style>

<style scoped>
.gantt-showcase :deep(revo-grid) {
  flex: 1;
  min-height: 0;
}
</style>
