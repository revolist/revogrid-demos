<template>
  <section class="column-collapse-showcase" aria-label="Column Collapse contact workspace">
    <div class="column-collapse-toolbar">
      <div>
        <strong>Contact workspace</strong>
        <span>Collapse a grouped header to keep only its sealed column visible.</span>
      </div>
      <div class="column-collapse-legend" aria-label="Column collapse legend">
        <span><i class="column-collapse-dot column-collapse-dot--sealed"></i>Sealed</span>
        <span><i class="column-collapse-dot column-collapse-dot--hidden"></i>Collapsible</span>
      </div>
    </div>
    <RevoGrid
      class="column-collapse-grid"
      :theme="darkTheme ? 'darkMaterial' : 'material'"
      :columns="columns"
      :source="rows"
      :plugins="plugins"
      :row-headers="true"
      :resize="true"
      hide-attribution
    />
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import RevoGrid from '@revolist/vue3-datagrid';
import {
  AdvanceFilterPlugin,
  ColumnCollapsePlugin,
  FilterHeaderPlugin,
  RowOddPlugin,
  RowSelectPlugin,
} from '@revolist/revogrid-pro';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import {
  createColumnCollapseColumns,
  createColumnCollapseRows,
  type ContactRow,
} from './column-collapse.shared';
import './column-collapse.scss';

const props = defineProps<{ rows?: ContactRow[] }>();
const rows = ref(props.rows?.length ? props.rows : createColumnCollapseRows());
const columns = createColumnCollapseColumns();
const plugins = [ColumnCollapsePlugin, AdvanceFilterPlugin, FilterHeaderPlugin, RowSelectPlugin, RowOddPlugin];
const darkTheme = ref(currentTheme().isDark());
let disconnectTheme: (() => void) | undefined;

onMounted(() => {
  disconnectTheme = observeCurrentTheme((isDark) => {
    darkTheme.value = isDark;
  });
});

onUnmounted(() => disconnectTheme?.());
</script>
