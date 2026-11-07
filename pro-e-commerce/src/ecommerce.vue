// src/components/showcase/ECommerce.vue

<template>
  <div class="ecommerce-shell grow" :data-view="columnView">
    <header class="ecommerce-heading">
      <div><h1>Customer analytics</h1><p>Explore spending, loyalty, and purchase behavior.</p></div>
    </header>
    <div class="ecommerce-toolbar" aria-label="Customer controls">
      <SearchInput root-class-name="ecommerce-search" :value="quickSearch"
        aria-label="Search customers" placeholder="Search customers, cities, products…"
        :on-value-change="applyQuickSearch" />
      <Dropdown class-name="rv-select ecommerce-preset" :source="segmentOptions" :value="activePreset"
        :config="{ ariaLabel: 'Saved segments', nativeTabNavigation: true }" :on-change="applyPreset" />
      <Dropdown class-name="rv-select ecommerce-view" :source="viewOptions" :value="columnView"
        :config="{ ariaLabel: 'Column view', nativeTabNavigation: true }" :on-change="setColumnView" />
      <button v-rv-control type="button" class="ecommerce-export rv-btn-primary" @click="exportToExcel">Export</button>
    </div>
    <div class="ecommerce-table">
    <RevoGrid
      class="ecommerce-grid skip-style cell-border"
      range
      :can-move-columns="true"
      :row-size="48"
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
    />
    <div v-if="empty" class="ecommerce-empty" role="status" aria-live="polite">
      <strong>No customers found</strong><span>Try another search or choose a different segment.</span>

    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Dropdown, SearchInput } from '@revolist/ui/vue';
import { vRvControl } from '@revolist/ui/vue-control';
import '@revolist/ui/styles.css';
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
  formatEcommerceCustomerCount,
  getEcommerceViewColumns,
  type EcommerceColumnView,
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
  resetEcommerceFilters,
  type EcommerceFilterPresetId,
  type EcommerceVisibleSourceSync,
} from './ecommerce.filtering';
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue';

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
const empty = ref(true);
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
    empty.value = rows.length === 0;
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
const activePreset = ref('');
const segmentOptions = [{ value: '', label: 'Saved segments' }, ...Object.entries(ECOMMERCE_FILTER_PRESETS).map(([value, preset]) => ({ value, label: preset.label }))];
const viewOptions = [{ value: 'overview', label: 'Customer overview' }, { value: 'all', label: 'All fields' }];
function setColumnView(value: string | string[]) { columnView.value = (Array.isArray(value) ? value[0] : value) as EcommerceColumnView; }
const columnView = ref<EcommerceColumnView>('overview');

const selectedRowsCount = ref(0);

watch(
  () => props.rows,
  (nextRows) => {
    const normalized = normalizeEcommerceRows(nextRows);
    localRows.value = normalized;
    visibleRows.value = normalized;
    empty.value = normalized.length === 0;
  },
  { immediate: true },
);

const rowsCountLabel = computed(() =>
  selectedRowsCount.value === visibleRows.value.length
    ? String(visibleRows.value.length)
    : `${selectedRowsCount.value}/${visibleRows.value.length}`,
);


let syncVisibleSource: EcommerceVisibleSourceSync | undefined;

function syncFilterState() {
  return syncVisibleSource?.();
}

function applyQuickSearch(value: string) {
  quickSearch.value = value;
  const element = grid.value?.$el;
  if (element) setEcommerceQuickFilter(element, quickSearch.value);
}

async function applyPreset(next: string | string[]) {
  const element = grid.value?.$el;
  if (!element) return;
  const value = Array.isArray(next) ? next[0] : next;
  await applyEcommerceFilterPreset(
    element,
    (value || undefined) as EcommerceFilterPresetId | undefined,
  );
  activePreset.value = value;
}

watch(grid, (instance, _previous, onCleanup) => {
  const element = instance?.$el;
  if (!element) return;
  syncVisibleSource = createEcommerceVisibleSourceSync(element, (state) => {
    visibleRows.value = state.visibleRows;
    empty.value = state.empty;
    selectedRowsCount.value = state.visibleSelectedIds.size;
  }, () => new Set([...selectedIndexes.value].map(index =>
    getEcommerceRowId(localRows.value[index]))));
  for (const name of ['afterfilterapply', 'aftertrimmed', 'aftersourceset']) {
    element.addEventListener(name, syncFilterState);
  }
  const sync = syncVisibleSource;
  onCleanup(() => {
    for (const name of ['afterfilterapply', 'aftertrimmed', 'aftersourceset']) {
      element.removeEventListener(name, syncFilterState);
    }
    sync.cancel();
  });
  void sync();
}, { flush: 'post' });

onBeforeUnmount(() => {
  const element = grid.value?.$el;
  for (const name of ['afterfilterapply', 'aftertrimmed', 'aftersourceset']) {
    element?.removeEventListener(name, syncFilterState);
  }
  syncVisibleSource?.cancel();
});

const handleRowSelected = (
  event: CustomEvent<HTMLRevoGridElementEventMap['rowselected']>,
) => {
  selectedIndexes.value = getSelectedEcommerceIndexes(event, localRows.value);
  selectedRowsCount.value = event.detail.count;
  void syncFilterState();
};

async function resetFilters() {
  quickSearch.value = '';
  activePreset.value = '';
  const element = grid.value?.$el;
  if (!element) return;
  await resetEcommerceFilters(element);
  resetSelection();
  await syncFilterState();
}

const visibleColumns = computed(() =>
  getVisibleEcommerceColumns(getEcommerceViewColumns(columns.value, columnView.value), hiddenColumns.value),
);
</script>
