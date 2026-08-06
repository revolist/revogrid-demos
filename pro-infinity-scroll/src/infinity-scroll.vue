<template>
  <section class="infinity-showcase" aria-label="Infinity Scroll remote directory">
    <div class="infinity-toolbar">
      <div class="infinity-toolbar__copy">
        <strong>Remote user directory</strong>
        <span class="infinity-status">{{ status }}</span>
      </div>
      <button class="infinity-button" type="button" :disabled="exporting" @click="exportAll">
        {{ exporting ? 'Preparing export…' : 'Export all to Excel' }}
      </button>
    </div>
    <RevoGrid
      class="infinity-grid"
      :theme="darkTheme ? 'darkMaterial' : 'material'"
      :columns="columns"
      :source="source"
      :pinned-top-source="pinnedTopSource"
      :pinned-bottom-source="pinnedBottomSource"
      :plugins="plugins"
      :infinity-scroll.prop="infinityScroll"
      stretch="last"
      :row-headers="true"
      hide-attribution
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import RevoGrid from '@revolist/vue3-datagrid';
import type { ColumnProp, FilterCollectionItem, MultiFilterItem } from '@revolist/revogrid';
import {
  AdvanceFilterPlugin,
  ColumnStretchPlugin,
  FIlTER_SELECTION,
  InfinityScrollPlugin,
  RowOddPlugin,
  RowSelectPlugin,
  type InfinityScrollConfig,
} from '@revolist/revogrid-pro';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import { exportInfinityScrollRows } from './infinity-scroll.export';
import {
  createInfinityScrollColumns,
  createInfinityScrollDataLoader,
  createInfinityScrollPinnedBottomRows,
  createInfinityScrollPinnedTopRows,
  createInfinityScrollRows,
  type InfinityScrollQuickFilter,
  type InfinityScrollUser,
} from './infinity-scroll.shared';
import './infinity-scroll.scss';

const props = defineProps<{ rows?: InfinityScrollUser[] }>();
const rows = ref(props.rows?.length ? props.rows : createInfinityScrollRows());
const source = ref<InfinityScrollUser[]>([]);
const columns = createInfinityScrollColumns();
const plugins = [InfinityScrollPlugin, AdvanceFilterPlugin, RowOddPlugin, RowSelectPlugin, ColumnStretchPlugin];
const pinnedTopSource = createInfinityScrollPinnedTopRows();
const pinnedBottomSource = createInfinityScrollPinnedBottomRows();
const status = ref('Initializing remote source…');
const exporting = ref(false);
const darkTheme = ref(currentTheme().isDark());
let disconnectTheme: (() => void) | undefined;
const serverLoader = createInfinityScrollDataLoader({
  rows: rows.value,
  selectionFilterType: FIlTER_SELECTION,
});

const loadData = async (
  skip: number,
  limit: number,
  order?: Partial<Record<ColumnProp, 'asc' | 'desc'>>,
  singleFilters?: Record<ColumnProp, FilterCollectionItem>,
  multiFilters?: MultiFilterItem,
  quickFilter?: InfinityScrollQuickFilter,
) => {
  status.value = `Fetching rows ${skip + 1}–${Math.min(skip + limit, rows.value.length)}…`;
  const result = await serverLoader(skip, limit, order, singleFilters, multiFilters, quickFilter);
  status.value = `Loaded ${result.total.toLocaleString()} matching records`;
  return result;
};
const infinityScroll = computed<Partial<InfinityScrollConfig>>(() => ({
  chunkSize: 50,
  bufferSize: 150,
  preloadThreshold: 0.75,
  total: rows.value.length,
  loadData,
}));

onMounted(() => {
  disconnectTheme = observeCurrentTheme((isDark) => {
    darkTheme.value = isDark;
  });
});

onUnmounted(() => disconnectTheme?.());

async function exportAll() {
  exporting.value = true;
  try {
    await exportInfinityScrollRows({
      columns,
      total: rows.value.length,
      loadData: serverLoader,
      theme: darkTheme.value ? 'darkMaterial' : 'material',
      setStatus: (message) => { status.value = message; },
    });
  } finally {
    exporting.value = false;
  }
}
</script>
