<template>
  <section class="data-grid-context-menu-showcase" aria-label="Data Grid Context Menu & Formatting workspace">
    <RevoGrid
      class="data-grid-context-menu-grid"
      :theme="gridTheme"
      :source="rows"
      :columns="columns"
      :column-types="columnTypes"
      :grouping="grouping"
      :row-size="DATA_GRID_CONTEXT_MENU_ROW_SIZE"
      :plugins="plugins"
      :data-grid-formatting.prop="dataGridFormatting"
      :data-grid-context-menu.prop="dataGridContextMenu"
      :row-headers="rowHeaders"
      :range="true"
      :resize="true"
      hide-attribution
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import RevoGrid from '@revolist/vue3-datagrid';
import {
  AdvanceFilterPlugin,
  AutoSizeColumnPlugin,
  ColumnCollapsePlugin,
  DataGridContextMenuPlugin,
  DialogPlugin,
  EventManagerPlugin,
  ExportExcelPlugin,
  HistoryPlugin,
  MultiRangeSelectionPlugin,
  RowSelectPlugin,
} from '@revolist/revogrid-pro';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import {
  DATA_GRID_CONTEXT_MENU_ROW_SIZE,
  createContextMenuColumns,
  createDataGridColumnTypes,
  createContextMenuRowHeaders,
  createDataGridFormattingPresets,
  createDataGridContextMenuConfig,
  createTeamGrouping,
  createTeamRows,
  getDataGridContextMenuTheme,
  type TeamRow,
} from './data-grid-context-menu.shared';
import './data-grid-context-menu.scss';

const props = defineProps<{ rows?: TeamRow[] }>();
const rows = computed(() => props.rows?.length ? props.rows : createTeamRows());
const columns = createContextMenuColumns();
const columnTypes = createDataGridColumnTypes();
const grouping = createTeamGrouping();
const rowHeaders = createContextMenuRowHeaders();
const dataGridFormatting = createDataGridFormattingPresets();
const dataGridContextMenu = createDataGridContextMenuConfig();
const plugins = [
  EventManagerPlugin,
  HistoryPlugin,
  DataGridContextMenuPlugin,
  DialogPlugin,
  AdvanceFilterPlugin,
  AutoSizeColumnPlugin,
  RowSelectPlugin,
  ColumnCollapsePlugin,
  MultiRangeSelectionPlugin,
  ExportExcelPlugin,
];
const darkTheme = ref(currentTheme().isDark());
const gridTheme = computed(() => getDataGridContextMenuTheme(darkTheme.value));
let disconnectTheme: (() => void) | undefined;

onMounted(() => {
  disconnectTheme = observeCurrentTheme((isDark) => {
    darkTheme.value = isDark;
  });
});

onUnmounted(() => disconnectTheme?.());
</script>
