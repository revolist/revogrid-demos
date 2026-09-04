// src/components/showcase/ECommerce.vue

<template>
  <div class="ecommerce-shell grow">
    <div class="ecommerce-toolbar">
      <div class="ecommerce-toolbar__main">
        <span class="ecommerce-chip">
          <span>Rows</span>
          <strong>{{ rowsCountLabel }}</strong>
        </span>
        <label class="ecommerce-filter" for="customerSearch">
          <span aria-hidden="true">⌕</span>
          <input
            id="customerSearch"
            v-model="quickSearch"
            type="search"
            aria-label="Search customers"
            placeholder="Search customers"
            @input="applyQuickSearch"
          />
        </label>
        <label class="ecommerce-preset">
          <span class="sr-only">Advanced filter example</span>
          <select aria-label="Advanced filter example" @change="applyPreset">
            <option value="">Advanced examples</option>
            <option v-for="(preset, id) in ECOMMERCE_FILTER_PRESETS" :key="id" :value="id">
              {{ preset.label }}
            </option>
          </select>
        </label>
      </div>

      <div class="ecommerce-toolbar__aside">
        <span class="ecommerce-chip">
          <span>Spend</span>
          <strong>{{ totalSpend }}</strong>
        </span>
        <button
          type="button"
          class="ecommerce-button ecommerce-button--export"
          @click="exportToExcel"
        >
          Export
        </button>
      </div>
    </div>

    <RevoGrid
      class="ecommerce-grid skip-style cell-border"
      range
      ref="grid"
      :theme="isDark.value ? 'darkMaterial' : 'material'"
      :columns="visibleColumns"
      :source="localRows"
      :plugins="plugins"
      :row-context-menu.prop="contextMenus.rowContextMenu"
      :column-context-menu.prop="contextMenus.columnContextMenu"
      stretch="last"
      :column-types="columnTypes"
      :filter="ecommerceFilterConfig"
      :hide-columns="hiddenColumns"
      style="min-height: 0"
      resize
      hide-attribution
      @rowselected="handleRowSelected"
      @afterfilterapply="syncFilterState"
      @aftertrimmed="syncFilterState"
      @aftersourceset="syncFilterState"
    />
    <div v-if="visibleRows.length === 0" class="ecommerce-empty" role="status" aria-live="polite">
      No customers match these filters.
    </div>
  </div>
</template>

<script setup lang="ts">
import './ecommerce.scss';
import { currentEcommerceThemeVue } from './ecommerce.theme';
import RevoGrid from '@revolist/vue3-datagrid';
import type {
  ColumnProp,
  ColumnGrouping,
  ColumnRegular,
} from '@revolist/revogrid';
import {
  ExportExcelPlugin,
} from '@revolist/revogrid-pro';
import {
  createEcommerceAnalyticsColumns,
  createEcommerceContextMenus,
  createEcommerceExcelExportConfig,
  clearEcommerceSelection,
  ecommerceColumnTypes,
  ecommerceFilterConfig,
  ecommercePlugins,
  formatEcommerceTotalSpend,
  getSelectedEcommerceIndexes,
  getVisibleEcommerceColumns,
  normalizeEcommerceRows,
} from './ecommerce.shared';
import {
  ECOMMERCE_FILTER_PRESETS,
  applyEcommerceFilterPreset,
  createEcommerceVisibleSourceSync,
  getEcommerceRowId,
  setEcommerceQuickFilter,
  type EcommerceFilterPresetId,
  type EcommerceVisibleSourceSync,
} from './ecommerce.filtering';
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';

const props = defineProps({
  rows: {
    type: Array<any>,
    default: () => [],
  },
});

const grid = ref<{ $el: HTMLRevoGridElement } | null>(null);
const columnTypes = ecommerceColumnTypes;
const columns = ref<(ColumnRegular | ColumnGrouping)[]>(createEcommerceAnalyticsColumns());
const plugins = ecommercePlugins;
const hiddenColumns = ref<ColumnProp[]>([]);
const localRows = ref<any[]>([]);
const visibleRows = ref<any[]>([]);
const selectedIndexes = shallowRef<Set<number>>(new Set());

const { isDark } = currentEcommerceThemeVue();

const exportToExcel = async () => {
  if (grid.value) {
    const plugins = await grid.value.$el.getPlugins();
    const exportPlugin = plugins.find(
      (plugin) => plugin instanceof ExportExcelPlugin,
    ) as ExportExcelPlugin;
    exportPlugin?.export(createEcommerceExcelExportConfig());
  }
};

const resetSelection = () => {
  selectedIndexes.value = new Set();
  selectedRowsCount.value = 0;
  clearEcommerceSelection(grid.value?.$el);
};

const contextMenus = computed(() => createEcommerceContextMenus({
  getRows: () => localRows.value,
  setRows: (rows) => {
    localRows.value = rows;
    visibleRows.value = rows;
    if (grid.value?.$el) grid.value.$el.source = rows;
    void syncVisibleSource?.();
  },
  getColumns: () => columns.value,
  setColumns: (nextColumns) => {
    columns.value = nextColumns;
  },
  getHiddenColumns: () => hiddenColumns.value,
  setHiddenColumns: (nextHiddenColumns) => {
    hiddenColumns.value = nextHiddenColumns;
  },
  getGrid: () => grid.value?.$el,
  getSelectedIndexes: () => selectedIndexes.value,
  clearSelection: resetSelection,
  exportExcel: exportToExcel,
}));

const quickSearch = ref('');

const selectedRowsCount = ref(0);

watch(
  () => props.rows,
  (nextRows) => {
    const normalized = normalizeEcommerceRows(nextRows);
    localRows.value = normalized;
    visibleRows.value = normalized;
  },
  { immediate: true },
);

const rowsCountLabel = computed(() =>
  selectedRowsCount.value === visibleRows.value.length
    ? String(visibleRows.value.length)
    : `${selectedRowsCount.value}/${visibleRows.value.length}`,
);

const totalSpend = computed(() => {
  return formatEcommerceTotalSpend(visibleRows.value);
});

let syncVisibleSource: EcommerceVisibleSourceSync | undefined;

function syncFilterState() {
  return syncVisibleSource?.();
}

function applyQuickSearch() {
  const element = grid.value?.$el;
  if (element) setEcommerceQuickFilter(element, quickSearch.value);
}

async function applyPreset(event: Event) {
  const element = grid.value?.$el;
  if (!element) return;
  const select = event.target as HTMLSelectElement;
  const value = select.value;
  await applyEcommerceFilterPreset(
    element,
    (value || undefined) as EcommerceFilterPresetId | undefined,
  );
  select.value = '';
}

onMounted(() => {
  const element = grid.value?.$el;
  if (!element) return;
  syncVisibleSource = createEcommerceVisibleSourceSync(element, (state) => {
    visibleRows.value = state.visibleRows;
    selectedRowsCount.value = state.visibleSelectedIds.size;
  }, () => new Set([...selectedIndexes.value].map(index =>
    getEcommerceRowId(localRows.value[index]))));
  void syncVisibleSource();
});

onBeforeUnmount(() => {
  syncVisibleSource?.cancel();
});

const handleRowSelected = (
  event: CustomEvent<HTMLRevoGridElementEventMap['rowselected']>,
) => {
  selectedIndexes.value = getSelectedEcommerceIndexes(event, localRows.value);
  selectedRowsCount.value = event.detail.count;
};

const visibleColumns = computed(() =>
  getVisibleEcommerceColumns(columns.value, hiddenColumns.value),
);
</script>
