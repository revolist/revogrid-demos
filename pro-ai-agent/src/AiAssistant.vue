<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import RevoGrid from '@revolist/vue3-datagrid';
import {
  attachAiAssistantResize,
  createAiDemoViewSwitcher,
  mountAiDemoViewControls,
  aiDemoCharts,
  aiDemoColumnTypes,
  aiDemoFilter,
  aiViewColumns,
  aiViewPlugins,
  aiDemoFormulaNames,
  createAiViewRows,
  createAiAssistantDemoConfig,
} from './AiAssistant.shared';
import './ai-assistant.scss';
const props = defineProps<{
  isDark?: boolean;
  endpoint?: string;
  rowsEndpoint?: string;
}>();
let grid: HTMLRevoGridElement | undefined;
const container = ref<HTMLElement>();
const resizeHandle = ref<HTMLElement>();
let disposeResize: (() => void) | undefined;
onMounted(() => {
  disposeResize = attachAiAssistantResize(
    container.value!,
    resizeHandle.value!,
  );
});
onBeforeUnmount(() => disposeResize?.());
const assistantHost = ref<HTMLElement>();
const controlsHost = ref<HTMLElement>();
const viewControls = ref<HTMLElement>();
const gridSurface = ref<HTMLElement>();
const chartSurface = ref<HTMLElement>();
const views = computed(() => !props.rowsEndpoint && gridSurface.value && chartSurface.value
  ? createAiDemoViewSwitcher(gridSurface.value, chartSurface.value) : undefined);
function onGridReady(event: Event) {
  grid = event.target as HTMLRevoGridElement;
  if (!props.rowsEndpoint) void mountAiDemoViewControls(grid, viewControls.value!);
}
const source = ref(props.rowsEndpoint ? [] : createAiViewRows());
const columns = props.rowsEndpoint
  ? aiViewColumns.map((column) => ({
      ...column,
      filter: false,
      sortable: false,
    }))
  : aiViewColumns;
const config = computed(() =>
  createAiAssistantDemoConfig(
    props.endpoint,
    props.rowsEndpoint
      ? {
          rowsEndpoint: props.rowsEndpoint,
          onRows: (rows) => {
            source.value = rows;
          },
        }
      : undefined,
    () => grid,
    assistantHost.value,
    controlsHost.value,
  ),
);
</script>
<template>
  <div ref="container" class="ai-view-demo">
    <div class="ai-view-demo__grid">
      <div class="ai-view-demo__toolbar" role="toolbar" aria-label="Grid controls">
        <div ref="controlsHost" />
        <div ref="viewControls" />
      </div>
      <div ref="chartSurface" class="ai-view-demo__chart" hidden />
      <div ref="gridSurface" class="ai-view-demo__surface">
      <RevoGrid
        v-if="assistantHost && controlsHost && (props.rowsEndpoint || views)"
        @aftergridinit="onGridReady"
        :source="source"
        :columns="columns"
        :plugins="aiViewPlugins"
        :column-types="aiDemoColumnTypes"
        stretch="all"
        :ai-assistant.prop.camel="config"
        :view-switcher.prop.camel="views"
        :pivot-charts.prop.camel="aiDemoCharts"
        :formula-names.prop.camel="aiDemoFormulaNames"
        :filter="props.rowsEndpoint ? true : aiDemoFilter"
        :theme="isDark ? 'darkCompact' : 'compact'"
        hide-attribution
      />
      </div>
    </div>
    <div ref="resizeHandle" class="rv-resize-handle ai-view-demo__resize" />
    <aside
      ref="assistantHost"
      class="ai-view-demo__assistant"
      aria-label="AI assistant"
    />
  </div>
</template>
