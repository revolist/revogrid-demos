<template>
  <section class="data-grid-context-menu-showcase" aria-label="Data Grid Context Menu & Formatting workspace">
    <RevoGrid
      class="data-grid-context-menu-grid"
      :theme="gridTheme"
      :source="rows"
      :columns="columns"
      :row-size="DATA_GRID_CONTEXT_MENU_ROW_SIZE"
      :plugins="plugins"
      :data-grid-formatting.prop="dataGridFormatting"
      :data-grid-formatting-panel.prop="true"
      :data-grid-context-menu.prop="dataGridContextMenu"
      :grid-notes.prop="gridNotes"
      :history.prop="history"
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
  AutoSizeColumnPlugin,
  ColumnCollapsePlugin,
  DataGridContextMenuPlugin,
  DialogPlugin,
  ExportExcelPlugin,
  GridNotesPlugin,
  HistoryPlugin,
  MultiRangeSelectionPlugin,
  RowSelectPlugin,
} from '@revolist/revogrid-pro';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import {
  DATA_GRID_CONTEXT_MENU_ROW_SIZE,
  createContextMenuColumns,
  createContextMenuRowHeaders,
  createDataGridFormattingPresets,
  createDataGridContextMenuConfig,
  createDataGridContextMenuNotes,
  createTeamRows,
  getDataGridContextMenuTheme,
  type TeamRow,
} from './data-grid-context-menu.shared';
import './data-grid-context-menu.scss';

const props = defineProps<{ rows?: TeamRow[] }>();
const rows = computed(() => props.rows?.length ? props.rows : createTeamRows());
const columns = createContextMenuColumns();
const rowHeaders = createContextMenuRowHeaders();
const dataGridFormatting = createDataGridFormattingPresets();
const dataGridContextMenu = createDataGridContextMenuConfig();
const gridNotes = createDataGridContextMenuNotes();
// Editing updates the grid source, so retain the freshly captured edit for undo.
const history = { clearOnSourceChange: false };
const plugins = [
  DataGridContextMenuPlugin,
  HistoryPlugin,
  DialogPlugin,
  AutoSizeColumnPlugin,
  RowSelectPlugin,
  ColumnCollapsePlugin,
  MultiRangeSelectionPlugin,
  ExportExcelPlugin,
  GridNotesPlugin,
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
