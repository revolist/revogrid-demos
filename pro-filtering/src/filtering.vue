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
    <div ref="badgesRef" class="order-explorer__active-filters"></div>
    <div class="order-explorer__grid">
      <RevoGrid
        ref="gridRef"
        class="h-full w-full"
        :theme="isDark ? 'darkMaterial' : 'material'"
        :columns="columns"
        :plugins="plugins"
        :column-types="columnTypes"
        :filter="filter"
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
import { nextTick, onMounted, onUnmounted, ref } from 'vue';
import type { ColumnFilterConfig, MultiFilterItem } from '@revolist/revogrid';
import {
  mountAdvancedFilterBadges,
  type AdvancedFilterBadgesController,
} from '@revolist/revogrid-pro';
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
const badgesRef = ref<HTMLElement>();
const visibleCount = ref(source.value.length);
const quickText = ref('');
const plugins = [...orderExplorerPlugins];
const columnTypes = createOrderExplorerColumnTypes();
let destroyed = false;
let disconnectTheme: (() => void) | undefined;
let badgesController: AdvancedFilterBadgesController | undefined;

function getGrid(): HTMLRevoGridElement | undefined {
  const exposedGrid = gridRef.value?.$el ?? gridRef.value;
  return exposedGrid ?? badgesRef.value
    ?.closest('.order-explorer')
    ?.querySelector<HTMLRevoGridElement>('revo-grid')
    ?? undefined;
}

// Presets and header filters use the same public `filter` property.
function applyFilterItems(items: MultiFilterItem) {
  filter.value = createOrderExplorerFilter(items);
  const grid = getGrid();
  if (grid) {
    grid.filter = filter.value;
    columns.value = createOrderExplorerColumns();
    grid.columns = columns.value;
  }
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
  destroyed = true;
  badgesController?.destroy();
  badgesController = undefined;
  disconnectTheme?.();
  disconnectTheme = undefined;
}

async function syncFilterState() {
  visibleCount.value = await getOrderExplorerVisibleCount(getGrid(), source.value.length);
}

onMounted(async () => {
  disconnectTheme = observeCurrentTheme(value => {
    isDark.value = value;
  });
  await nextTick();
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  const grid = getGrid();
  await grid?.componentOnReady?.();
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  if (destroyed || !grid || !badgesRef.value) return;
  const initialFilter = createOrderExplorerFilter(createOrderExplorerInitialFilters());
  filter.value = initialFilter;
  grid.filter = initialFilter;
  columns.value = createOrderExplorerColumns();
  grid.columns = columns.value;
  void mountAdvancedFilterBadges({
      grid,
      root: badgesRef.value,
      ...orderExplorerFilterBadgeOptions,
    })
    .then(controller => {
      if (destroyed) controller.destroy();
      else badgesController = controller;
    })
    .catch(() => {
      // Filtering remains available when optional badge discovery is unavailable.
    });
  visibleCount.value = await getOrderExplorerVisibleCount(grid, source.value.length);
});

onUnmounted(() => {
  disposeOrderExplorer();
});
</script>
