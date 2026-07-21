<template>
  <div
    class="financial-pivot-showcase grow flex flex-col gap-2 h-full p-2 box-border"
    :style="expandedStyle"
  >
    <financial-pivot-header
      :state.prop="headerState"
      @financial-pivot-preset-select="onPresetSelect"
      @financial-pivot-configurator-toggle="configuratorVisible = !configuratorVisible"
      @financial-pivot-expanded-toggle="expanded = !expanded"
    />

    <div class="grow min-h-0 overflow-auto">
      <div
        class="pivot-grid-container h-full overflow-hidden"
        :style="{ minWidth: configuratorVisible ? '920px' : '680px' }"
      >
        <RevoGrid
          ref="gridElement"
          class="overflow-hidden skip-style h-full min-h-0 cell-border"
          hide-attribution
          range
          resize
          filter
          :multi-row-header.prop="FINANCIAL_MULTI_ROW_HEADER"
          :colSize="180"
          :source="rows"
          :columns="FINANCIAL_COLUMNS"
          :pivot.prop="pivot"
          :theme="isDark.value ? 'darkCompact' : 'compact'"
          :plugins="plugins"
          :column-types="columnTypes"
          readonly
          @pivot-config-update="configUpdate"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue';
import RevoGrid from '@revolist/vue3-datagrid';
import type { PivotConfig } from '@revolist/revogrid-enterprise';
import { currentThemeVue } from '../../composables/useRandomData';
import {
  FINANCIAL_COLUMNS,
  FINANCIAL_COLUMN_TYPES,
  FINANCIAL_MULTI_ROW_HEADER,
  FINANCIAL_SHOWCASE_PLUGINS,
  applyFinancialPivotOptions,
  createFinancialPreset,
  resolveFinancialRows,
  type FinancialPresetId,
} from './financial.pivot';
import {
  defineFinancialPivotHeaderElement,
  type FinancialPivotHeaderState,
} from './financial-pivot-header/financial-pivot-header';

defineFinancialPivotHeaderElement();

const { isDark } = currentThemeVue();
const props = defineProps({ rows: { type: Array<any>, default: () => [] } });
const rows = ref(resolveFinancialRows(props.rows));
const isSmallScreen = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;

const pivotConfig = shallowRef<PivotConfig>(createFinancialPreset());
const activePreset = ref<FinancialPresetId>('sales');
const configuratorVisible = ref(!isSmallScreen());
const expanded = ref(false);
const gridElement = ref<HTMLRevoGridElement>();
const columnTypes = ref(FINANCIAL_COLUMN_TYPES);
const plugins = FINANCIAL_SHOWCASE_PLUGINS;
const headerState = computed<FinancialPivotHeaderState>(() => ({
  activePreset: activePreset.value,
  configuratorVisible: configuratorVisible.value,
  expanded: expanded.value,
}));

const pivot = computed(() =>
  applyFinancialPivotOptions(
    pivotConfig.value,
    rows.value,
    configuratorVisible.value,
  ),
);

const expandedStyle = computed(() => expanded.value
  ? { position: 'fixed', inset: '8px', zIndex: 1000, background: 'var(--financial-pivot-expanded-background)' }
  : undefined,
);

const configUpdate = (event: CustomEvent<PivotConfig>) => {
  pivotConfig.value = event.detail || createFinancialPreset();
};

const selectPreset = (id: FinancialPresetId) => {
  if (gridElement.value) gridElement.value.pivot = undefined;
  window.setTimeout(() => {
    pivotConfig.value = createFinancialPreset(id);
    activePreset.value = id;
  });
};

const onPresetSelect = (event: Event) => {
  selectPreset((event as CustomEvent<FinancialPresetId>).detail);
};
</script>

<style lang="scss">
@use './financial-pivot-header/financial-pivot-header.scss';

revo-grid.cell-border .rgHeaderCell[highlight] {
  box-shadow: 0 -3px 0 0 #00b997 inset, -1px 0 0 0 var(--revo-grid-cell-border) inset;
}
</style>
