// src/components/showcase/ECommerce.vue

<template>
  <div class="ecommerce-shell grow">
    <div class="ecommerce-toolbar">
      <div class="ecommerce-toolbar__main">
        <span class="ecommerce-chip">
          <span>Rows</span>
          <strong>{{ rowsCountLabel }}</strong>
        </span>
        <label class="ecommerce-filter">
          <span aria-hidden="true">⌕</span>
          <textarea
            v-model="filterExpression"
            rows="1"
            placeholder='Gender eq "Female" and City eq "Chicago"'
          ></textarea>
        </label>
        <button type="button" class="ecommerce-button" @click="resetFilters">
          Reset
        </button>
        <div ref="columnsWrapper" class="ecommerce-columns" @keydown.esc="isColumnsOpen = false">
          <button
            type="button"
            class="ecommerce-button ecommerce-button--columns"
            :aria-expanded="isColumnsOpen"
            @click="isColumnsOpen = !isColumnsOpen"
          >
            Columns
            <span aria-hidden="true">⌄</span>
          </button>
          <div v-if="isColumnsOpen" class="ecommerce-columns-menu">
            <label v-for="column in columnOptions" :key="column.prop">
              <input
                type="checkbox"
                :checked="!hiddenColumns.includes(column.prop)"
                @change="toggleColumn(column.prop)"
              />
              <span>{{ column.label }}</span>
            </label>
          </div>
        </div>
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
      :source="visibleRows"
      :plugins="plugins"
      :row-context-menu.prop="contextMenus.rowContextMenu"
      :column-context-menu.prop="contextMenus.columnContextMenu"
      stretch="last"
      :column-types="columnTypes"
      :filter="false"
      :hide-columns="hiddenColumns"
      style="min-height: 0"
      resize
      hide-attribution
      @rowselected="handleRowSelected"
    />
  </div>
</template>

<script setup lang="ts">
import './ecommerce.scss';
import { currentThemeVue } from '../../composables/useRandomData';
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
  ecommercePlugins,
  filterEcommerceRows,
  formatEcommerceTotalSpend,
  getEcommerceColumnOptions,
  getSelectedEcommerceIndexes,
  getVisibleEcommerceColumns,
  normalizeEcommerceRows,
  toggleEcommerceColumn,
} from './ecommerce.shared';
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';

const props = defineProps({
  rows: {
    type: Array<any>,
    default: () => [],
  },
});

const grid = ref<{ $el: HTMLRevoGridElement } | null>(null);
const columnsWrapper = ref<HTMLElement | null>(null);
const columnTypes = ecommerceColumnTypes;
const columns = ref<(ColumnRegular | ColumnGrouping)[]>(createEcommerceAnalyticsColumns());
const plugins = ecommercePlugins;
const hiddenColumns = ref<ColumnProp[]>([]);
const isColumnsOpen = ref(false);
const localRows = ref<any[]>([]);
const selectedIndexes = shallowRef<Set<number>>(new Set());

const { isDark } = currentThemeVue();

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
    allRowsCount.value = rows.length;
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

const filterExpression = ref('');

const selectedRowsCount = ref(0);
const allRowsCount = ref(0);
watch(
  () => props.rows.length,
  () => {
    allRowsCount.value = props.rows.length;
  },
  { immediate: true },
);

watch(
  () => props.rows,
  (nextRows) => {
    localRows.value = normalizeEcommerceRows(nextRows);
  },
  { immediate: true },
);

const visibleRows = computed(() => filterEcommerceRows(localRows.value, filterExpression.value));
const visibleRowsCount = computed(() => visibleRows.value.length);
const rowsCountLabel = computed(() =>
  selectedRowsCount.value === allRowsCount.value
    ? String(allRowsCount.value)
    : `${selectedRowsCount.value}/${allRowsCount.value}`,
);

const totalSpend = computed(() => {
  return formatEcommerceTotalSpend(visibleRows.value);
});

const handleRowSelected = (
  event: CustomEvent<HTMLRevoGridElementEventMap['rowselected']>,
) => {
  selectedIndexes.value = getSelectedEcommerceIndexes(event, localRows.value);
  selectedRowsCount.value = event.detail.count;
  allRowsCount.value = event.detail.allRowsCount;
};

const resetFilters = () => {
  filterExpression.value = '';
};

const columnOptions = computed(() => {
  return getEcommerceColumnOptions(columns.value);
});

const visibleColumns = computed(() =>
  getVisibleEcommerceColumns(columns.value, hiddenColumns.value),
);

function toggleColumn(prop: ColumnProp) {
  hiddenColumns.value = toggleEcommerceColumn(hiddenColumns.value, prop);
}

function closeColumnsOnOutsideClick(event: MouseEvent) {
  if (
    isColumnsOpen.value &&
    columnsWrapper.value &&
    !columnsWrapper.value.contains(event.target as Node)
  ) {
    isColumnsOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('mousedown', closeColumnsOnOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', closeColumnsOnOutsideClick);
});
</script>
