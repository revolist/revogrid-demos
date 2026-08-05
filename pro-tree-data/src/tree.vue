<template>
  <section class="tree-showcase" aria-label="Tree Data organization explorer">
    <div class="tree-toolbar">
      <div class="tree-toolbar__intro">
        <span class="tree-eyebrow">Organization explorer</span>
        <strong>Interactive hierarchy</strong>
      </div>
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
      :columns="columns"
      :source="rows"
      :plugins="plugins"
      :column-types="columnTypes"
      :row-order.prop="TREE_ROW_ORDER_CONFIG"
      :row-select.prop="TREE_ROW_SELECT_CONFIG"
      :tree.prop="treeConfig"
      :range="true"
      :resize="true"
      :filter="true"
      :stretch="true"
      hide-attribution
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue';
import RevoGrid from '@revolist/vue3-datagrid';
import {
  ExportExcelPlugin,
  TREE_COLLAPSE_ALL_EVENT,
  TREE_EXPAND_ALL_EVENT,
} from '@revolist/revogrid-pro';
import {
  createTreeColumns,
  createTreeConfig,
  createTreeRows,
  prefersDarkTheme,
  TREE_COLUMN_TYPES,
  TREE_EXPORT_CONFIG,
  TREE_PLUGINS,
  TREE_ROW_ORDER_CONFIG,
  TREE_ROW_SELECT_CONFIG,
} from './tree.shared';
import './tree.scss';

const gridRef = ref<{ $el: HTMLRevoGridElement } | HTMLRevoGridElement | null>(null);
const rows = ref(createTreeRows());
const columns = shallowRef(createTreeColumns());
const plugins = [...TREE_PLUGINS];
const columnTypes = TREE_COLUMN_TYPES;
const stickyParents = ref(true);
const exporting = ref(false);
const darkTheme = ref(prefersDarkTheme());
const treeConfig = computed(() => createTreeConfig(rows.value, stickyParents.value));

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
