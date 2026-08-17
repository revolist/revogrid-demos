<template>
  <section class="order-explorer" aria-label="Advanced Filtering: Order Explorer">
    <div class="order-explorer__toolbar">
      <div class="order-explorer__presets" aria-label="Filter presets">
        <p class="order-explorer__eyebrow">Presets</p>
        <button class="rv-btn" type="button" @click="applyPreset('high-value-europe')">High-value Europe</button>
        <button class="rv-btn" type="button" @click="applyPreset('recent-expedited')">Recent expedited</button>
        <button class="rv-btn" type="button" @click="applyPreset('review-queue')">Review queue</button>
      </div>
      <div class="order-explorer__search">
        <input
          v-model="quickText"
          class="order-explorer__search-input"
          type="search"
          placeholder="Global search — try “Lisbon pending”"
          aria-label="Search all visible columns"
          @input="applyQuickFilter"
        />
        <button class="rv-btn" type="button" @click="useQuickFilterExample">Try example</button>
      </div>
      <div class="order-explorer__summary">
        <span class="order-explorer__count" aria-live="polite">
          {{ visibleCount.toLocaleString() }} of {{ source.length.toLocaleString() }} orders
        </span>
        <button class="rv-btn-secondary" type="button" @click="clearAll">Clear All</button>
      </div>
    </div>
    <div class="order-explorer__grid">
      <RevoGrid
        ref="gridRef"
        class="h-full w-full"
        :theme="isDark ? 'darkMaterial' : 'material'"
        :columns="columns"
        :plugins="plugins"
        :column-types="columnTypes"
        :filter="filter"
        :filter-badges.prop="orderExplorerFilterBadgeOptions"
        stretch="all"
        hide-attribution
        readonly
        resize
        @afterfilterapply="syncFilterState"
        :source="source"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import type { ColumnFilterConfig, MultiFilterItem } from '@revolist/revogrid';
import RevoGrid from '@revolist/vue3-datagrid';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import {
  createOrderExplorerColumns,
  createOrderExplorerColumnTypes,
  createOrderExplorerFilter,
  createOrderExplorerInitialFilters,
  createOrderExplorerPreset,
  createOrderExplorerRows,
  getOrderExplorerVisibleCount,
  setOrderExplorerQuickFilter,
  ORDER_EXPLORER_QUICK_FILTER_EXAMPLE,
  orderExplorerFilterBadgeOptions,
  orderExplorerPlugins,
  type OrderExplorerPreset,
} from './filtering.shared';
import './filtering.scss';

const isDark = ref(currentTheme().isDark());
const gridRef = ref<any>(null);
const source = ref(createOrderExplorerRows());
const columns = ref(createOrderExplorerColumns());
const filter = ref<ColumnFilterConfig>(
  createOrderExplorerFilter(createOrderExplorerInitialFilters()),
);
const visibleCount = ref(source.value.length);
const quickText = ref('');
const plugins = [...orderExplorerPlugins];
const columnTypes = createOrderExplorerColumnTypes();
let disconnectTheme: (() => void) | undefined;

function getGrid(): HTMLRevoGridElement | undefined {
  const exposedGrid = gridRef.value?.$el ?? gridRef.value;
  return exposedGrid ?? undefined;
}

// Presets and header filters use the same public `filter` property.
function applyFilterItems(items: MultiFilterItem) {
  filter.value = createOrderExplorerFilter(items);
  columns.value = createOrderExplorerColumns();
}

function applyPreset(preset: OrderExplorerPreset) {
  applyFilterItems(createOrderExplorerPreset(preset));
}

function applyQuickFilter() {
  const grid = getGrid();
  if (grid) setOrderExplorerQuickFilter(grid, quickText.value);
}

function useQuickFilterExample() {
  quickText.value = ORDER_EXPLORER_QUICK_FILTER_EXAMPLE;
  applyQuickFilter();
}

function clearAll() {
  applyFilterItems({});
  quickText.value = '';
  applyQuickFilter();
}

function disposeOrderExplorer() {
  disconnectTheme?.();
  disconnectTheme = undefined;
}

async function syncFilterState() {
  visibleCount.value = await getOrderExplorerVisibleCount(getGrid(), source.value.length);
}

onMounted(() => {
  disconnectTheme = observeCurrentTheme(value => {
    isDark.value = value;
  });
  const grid = getGrid();
  if (!grid) return;
  void getOrderExplorerVisibleCount(grid, source.value.length).then(count => {
    visibleCount.value = count;
  });
});

onUnmounted(() => {
  disposeOrderExplorer();
});
</script>
