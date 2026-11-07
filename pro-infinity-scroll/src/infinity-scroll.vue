<template>
  <section class="infinity-showcase" aria-label="Infinity Scroll remote directory">
    <div class="infinity-toolbar">
      <div class="infinity-toolbar__copy">
        <strong>Remote user directory</strong>
        <span class="infinity-status">{{ status }}</span>
      </div>
      <IconButton label="Export all to Excel" :icon="exportIcon" :disabled="exporting" @click="exportAll" />
    </div>
    <RevoGrid
      class="infinity-grid"
      :theme="darkTheme ? 'darkMaterial' : 'material'"
      :columns="columns"
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
import exportIcon from '@fortawesome/fontawesome-free/svgs/solid/download.svg?raw';
import { IconButton } from '@revolist/ui/vue';
import '@revolist/ui/styles.css';
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
  // Published 4.0.1 cached reads reference Node process; use supported direct reads until the fixed release.
    query: false,
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
