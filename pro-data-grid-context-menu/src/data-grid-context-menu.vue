<template>
  <section class="data-grid-context-menu-showcase" aria-label="Universal Data Grid Context Menu workspace">
    <RevoGrid
      class="data-grid-context-menu-grid"
      :theme="gridTheme"
      :source="rows"
      :columns="columns"
      :grouping="grouping"
      :row-size="DATA_GRID_CONTEXT_MENU_ROW_SIZE"
      :row-auto-size.prop="rowAutoSize"
      :plugins="plugins"
      :additional-data="additionalData"
      :row-headers="true"
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
  ExportExcelPlugin,
  MultiRangeSelectionPlugin,
  RowAutoSizePlugin,
  RowSelectPlugin,
} from '@revolist/revogrid-pro';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import {
  DATA_GRID_CONTEXT_MENU_ROW_SIZE,
  createContextMenuColumns,
  createContextMenuRowAutoSize,
  createDataGridContextMenuConfig,
  createTeamGrouping,
  createTeamRows,
  getDataGridContextMenuTheme,
  type TeamRow,
} from './data-grid-context-menu.shared';
import './data-grid-context-menu.scss';

const props = defineProps<{ rows?: TeamRow[] }>();
const rows = ref(props.rows?.length ? props.rows : createTeamRows());
const columns = createContextMenuColumns();
const grouping = createTeamGrouping();
const rowAutoSize = createContextMenuRowAutoSize();
const plugins = [
  DataGridContextMenuPlugin,
  AdvanceFilterPlugin,
  AutoSizeColumnPlugin,
  RowAutoSizePlugin,
  RowSelectPlugin,
  ColumnCollapsePlugin,
  MultiRangeSelectionPlugin,
  ExportExcelPlugin,
];
const additionalData = computed(() => ({
  dataGridContextMenu: createDataGridContextMenuConfig(),
}));
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
