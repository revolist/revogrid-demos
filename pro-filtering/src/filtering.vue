<template>
  <section class="order-explorer" aria-label="Advanced Filtering: Order Explorer">
    <div class="order-explorer__toolbar">
      <div class="order-explorer__presets" aria-label="Filter presets">
        <p class="order-explorer__eyebrow">Presets</p>
        <button class="rv-btn" type="button" @click="applyPreset('high-value-europe')">High-value Europe</button>
        <button class="rv-btn" type="button" @click="applyPreset('recent-expedited')">Recent expedited</button>
        <button class="rv-btn" type="button" @click="applyPreset('review-queue')">Review queue</button>
      </div>
      <div class="order-explorer__summary">
        <span class="order-explorer__count" aria-live="polite">
          {{ visibleCount.toLocaleString() }} of {{ source.length.toLocaleString() }} orders
        </span>
        <button class="rv-btn-secondary" type="button" @click="applyFilterItems({})">Clear All</button>
      </div>
    </div>
    <div ref="badgesRef"></div>
    <div class="order-explorer__grid">
      <RevoGrid
        ref="gridRef"
        class="h-full w-full"
        :theme="isDark ? 'darkMaterial' : 'material'"
        :columns="columns"
        :source="source"
        :plugins="plugins"
        :column-types="columnTypes"
        :filter="filter"
        stretch="all"
        hide-attribution
        readonly
        resize
        @afterfilterapply="syncFilterState"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import type { MultiFilterItem } from '@revolist/revogrid';
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
  mountOrderExplorerFilterBadges,
  orderExplorerPlugins,
  type OrderExplorerPreset,
} from './filtering.shared';
import type { GridFilterBadgesController } from './filter-badges';
import './filtering.scss';

const isDark = ref(currentTheme().isDark());
const gridRef = ref<any>(null);
const badgesRef = ref<HTMLElement | null>(null);
const source = ref(createOrderExplorerRows());
const columns = ref(createOrderExplorerColumns());
const filter = ref(createOrderExplorerFilter(createOrderExplorerInitialFilters()));
const visibleCount = ref(source.value.length);
const plugins = [...orderExplorerPlugins];
const columnTypes = createOrderExplorerColumnTypes();
let badges: GridFilterBadgesController | undefined;
let destroyed = false;
let disconnectTheme: (() => void) | undefined;

function getGrid(): HTMLRevoGridElement | undefined {
  return gridRef.value?.$el ?? gridRef.value;
}

function applyFilterItems(items: MultiFilterItem) {
  filter.value = createOrderExplorerFilter(items);
  const grid = getGrid();
  if (grid) grid.filter = filter.value;
}

function applyPreset(preset: OrderExplorerPreset) {
  applyFilterItems(createOrderExplorerPreset(preset));
}

async function syncFilterState() {
  visibleCount.value = await getOrderExplorerVisibleCount(getGrid(), source.value.length);
}

onMounted(async () => {
  disconnectTheme = observeCurrentTheme(value => {
    isDark.value = value;
  });
  const grid = getGrid();
  if (grid && badgesRef.value) {
    const controller = await mountOrderExplorerFilterBadges(grid, badgesRef.value);
    if (destroyed) controller.destroy();
    else badges = controller;
  }
  visibleCount.value = await getOrderExplorerVisibleCount(grid, source.value.length);
});

onUnmounted(() => {
  destroyed = true;
  disconnectTheme?.();
  badges?.destroy();
});
</script>
