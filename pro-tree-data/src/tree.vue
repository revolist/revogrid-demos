<template>
  <section class="tree-showcase" aria-label="Tree Data organization explorer">
    <div class="tree-toolbar">
      <div class="tree-toolbar__actions">
        <button class="tree-button" type="button" @click="expandAll">Expand all</button>
        <button class="tree-button" type="button" @click="collapseAll">Collapse all</button>
        <button class="tree-button" type="button" :disabled="exporting" @click="exportToExcel">
          {{ exporting ? 'Exporting…' : 'Export to Excel' }}
        </button>
        <label class="tree-sticky">
          <input v-model="stickyParents" type="checkbox" />
          Sticky parents
        </label>
      </div>
    </div>
    <RevoGrid
      ref="gridRef"
      class="tree-grid"
      :theme="darkTheme ? 'darkMaterial' : 'material'"
      :plugins="plugins"
      :columns="columns"
      :source="rows"
      :column-types="columnTypes"
      :row-order.prop="TREE_ROW_ORDER_CONFIG"
      :row-select.prop="TREE_ROW_SELECT_CONFIG"
      :tree.prop="treeConfig"
      :sticky-cells.prop="TREE_STICKY_CELLS_CONFIG"
      :range="true"
      :readonly="true"
      :resize="true"
      :filter="true"
      :stretch="true"
      hide-attribution
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import RevoGrid from '@revolist/vue3-datagrid';
import {
  ExportExcelPlugin,
  TREE_COLLAPSE_ALL_EVENT,
  TREE_EXPAND_ALL_EVENT,
} from '@revolist/revogrid-pro';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import {
  createTreeColumns,
  createTreeConfig,
  createTreeRows,
  initializeTreeStickyColumns,
  TREE_COLUMN_TYPES,
  TREE_EXPORT_CONFIG,
  TREE_PLUGINS,
  TREE_ROW_ORDER_CONFIG,
  TREE_ROW_SELECT_CONFIG,
  TREE_STICKY_CELLS_CONFIG,
} from './tree.shared';
import './tree.scss';

const gridRef = ref<{ $el: HTMLRevoGridElement } | HTMLRevoGridElement | null>(null);
const rows = ref(createTreeRows());
const stickyParents = ref(true);
const columns = computed(() => createTreeColumns(rows.value, stickyParents.value));
const plugins = [...TREE_PLUGINS];
const columnTypes = TREE_COLUMN_TYPES;
const exporting = ref(false);
const darkTheme = ref(typeof window !== 'undefined' && currentTheme().isDark());
const treeConfig = computed(() => createTreeConfig(rows.value, stickyParents.value));
let disconnectTheme: (() => void) | undefined;

onMounted(() => {
  disconnectTheme = observeCurrentTheme((isDark) => {
    darkTheme.value = isDark;
  });
  const grid = getGrid();
  if (grid) void initializeTreeStickyColumns(grid, rows.value, treeConfig.value);
});

onUnmounted(() => disconnectTheme?.());

function getGrid() {
  const current = gridRef.value;
  return current && '$el' in current ? current.$el : current ?? undefined;
}

function expandAll() {
  getGrid()?.dispatchEvent(new CustomEvent(TREE_EXPAND_ALL_EVENT));
}

function collapseAll() {
  getGrid()?.dispatchEvent(new CustomEvent(TREE_COLLAPSE_ALL_EVENT));
}

async function exportToExcel() {
  const grid = getGrid();
  if (!grid) return;
  exporting.value = true;
  try {
    const gridPlugins = await grid.getPlugins();
    const exportPlugin = gridPlugins.find((plugin) => plugin instanceof ExportExcelPlugin) as ExportExcelPlugin | undefined;
    await exportPlugin?.export(TREE_EXPORT_CONFIG);
  } finally {
    exporting.value = false;
  }
}
</script>
