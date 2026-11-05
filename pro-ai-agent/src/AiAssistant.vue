<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import RevoGrid from '@revolist/vue3-datagrid';
import {
  attachAiAssistantResize,
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
function onGridReady(event: Event) {
  grid = event.target as HTMLRevoGridElement;
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
      <div
        ref="controlsHost"
        class="ai-view-demo__toolbar"
        role="toolbar"
        aria-label="Grid controls"
      />
      <RevoGrid
        v-if="assistantHost && controlsHost"
        @aftergridinit="onGridReady"
        :source="source"
        :columns="columns"
        :plugins="aiViewPlugins"
        :ai-assistant.prop.camel="config"
        :formula-names.prop.camel="aiDemoFormulaNames"
        :filter="true"
        :theme="isDark ? 'darkCompact' : 'compact'"
        hide-attribution
      />
    </div>
    <div ref="resizeHandle" class="rv-resize-handle ai-view-demo__resize" />
    <aside
      ref="assistantHost"
      class="ai-view-demo__assistant"
      aria-label="AI assistant"
    />
  </div>
</template>
